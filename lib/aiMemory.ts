import { createHash } from "crypto";
import { db } from "@/lib/db";
import { generateJSON, hasAIKey, AI_MODELS } from "@/lib/aiClient";

/**
 * Lapis Memori Buddy.
 *
 * Tanpa ini Buddy amnesia: tiap modal ditutup, semua yang diceritakan user hilang.
 * Modul ini menyimpan sedikit fakta tahan-lama tentang seseorang, lalu menyuntikkannya
 * kembali ke prompt agar Buddy bisa menyambung percakapan lintas hari.
 *
 * PRIVASI — memori ini milik user, titik.
 * - Setiap query WAJIB difilter `user_id`. Tidak ada satupun fungsi di file ini yang
 *   membaca memori lintas user, dan tidak boleh pernah ada.
 * - Isinya TIDAK BOLEH bocor ke permukaan manager/HR dalam bentuk apapun,
 *   termasuk sebagai bahan prompt laporan tim.
 */

export type MemoryKind = 'preference' | 'trigger' | 'what_works' | 'commitment' | 'context';

export interface Memory {
  id: string;
  kind: MemoryKind;
  content: string;
  confidence: number;
  source: string;
  timesSeen: number;
  createdAt: string;
  updatedAt: string;
}

export type MemorySource = 'coach' | 'reflection' | 'checkin';

const VALID_KINDS: MemoryKind[] = ['preference', 'trigger', 'what_works', 'commitment', 'context'];

// Umur simpan per jenis. Komitmen basi kalau tidak ditindaklanjuti; preferensi &
// pemicu bertahan sampai dibantah. `null` = tidak kedaluwarsa.
const TTL_DAYS: Record<MemoryKind, number | null> = {
  commitment: 21,
  context: 60,
  preference: null,
  trigger: null,
  what_works: null,
};

const LABELS: Record<MemoryKind, string> = {
  preference: 'Cara dia suka bekerja',
  trigger: 'Pemicu stres/buntu',
  what_works: 'Yang terbukti berhasil',
  commitment: 'Niat yang dia ucapkan',
  context: 'Situasi yang sedang berjalan',
};

/** Batas memori yang disuntikkan ke satu prompt — cukup untuk terasa kenal, tidak sampai membanjiri konteks. */
const PROMPT_LIMIT = 14;
/** Batas fakta baru per sesi. Tanpa ini satu sesi curhat panjang bisa melahirkan 20 "fakta" sampah. */
const MAX_NEW_PER_SESSION = 4;

// Urutan penyelamatan saat kena batas di atas. Komitmen didahulukan: itu satu-satunya
// jenis yang punya tenggat sosial — kalau hilang, Buddy gagal menagih dan efek
// "dia ingat" ikut hilang. Preferensi paling belakang karena paling sering muncul lagi.
const KIND_PRIORITY: Record<MemoryKind, number> = {
  commitment: 0,
  trigger: 1,
  what_works: 2,
  context: 3,
  preference: 4,
};
const MAX_CONTENT_LEN = 180;

let tableReady = false;
async function ensureMemoryTable() {
  if (tableReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS ai_memory (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    kind VARCHAR(30) NOT NULL DEFAULT 'context',
    content VARCHAR(500) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    confidence INT DEFAULT 70,
    source VARCHAR(30) DEFAULT 'coach',
    status VARCHAR(20) DEFAULT 'active',
    times_seen INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_used_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    UNIQUE KEY uniq_user_fingerprint (user_id, fingerprint),
    KEY idx_user_status (user_id, status)
  )`);
  tableReady = true;
}

function fingerprintOf(content: string): string {
  const norm = content
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha256').update(norm).digest('hex').slice(0, 40);
}

function rowToMemory(r: any): Memory {
  return {
    id: String(r.id),
    kind: (VALID_KINDS.includes(r.kind) ? r.kind : 'context') as MemoryKind,
    content: String(r.content),
    confidence: Number(r.confidence) || 0,
    source: String(r.source || 'coach'),
    timesSeen: Number(r.times_seen) || 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/**
 * Memori aktif milik satu user, sudah diperingkat.
 * Komitmen didahulukan — itu yang membuat Buddy bisa menagih tindak lanjut,
 * dan itulah bagian yang paling terasa seperti "dia ingat".
 */
export async function getMemories(userId: string, limit = PROMPT_LIMIT): Promise<Memory[]> {
  if (!userId) return [];
  try {
    await ensureMemoryTable();
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const res = await db.execute({
      sql: `SELECT * FROM ai_memory
            WHERE user_id = ? AND status = 'active'
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY (kind = 'commitment') DESC, confidence DESC, times_seen DESC, updated_at DESC
            LIMIT ${safeLimit}`,
      args: [userId],
    });
    return res.rows.map(rowToMemory);
  } catch (e) {
    console.warn('getMemories error:', e);
    return [];
  }
}

/** Blok teks siap tempel ke system prompt Buddy. Kosong kalau belum ada memori. */
export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (!memories.length) return '';
  const byKind = new Map<MemoryKind, Memory[]>();
  for (const m of memories) {
    if (!byKind.has(m.kind)) byKind.set(m.kind, []);
    byKind.get(m.kind)!.push(m);
  }
  const order: MemoryKind[] = ['commitment', 'trigger', 'what_works', 'preference', 'context'];
  return order
    .filter(k => byKind.has(k))
    .map(k => `${LABELS[k]}:\n` + byKind.get(k)!.map(m => `- ${m.content}`).join('\n'))
    .join('\n\n');
}

/** Ringkasan pendek untuk ditampilkan ke user ("ini yang Buddy ingat tentangmu"). */
export function memoryLabel(kind: MemoryKind): string {
  return LABELS[kind] || LABELS.context;
}

/** Komitmen aktif terbaru — dipakai untuk sapaan tindak-lanjut tanpa biaya token. */
export function latestCommitment(memories: Memory[]): Memory | null {
  return memories.find(m => m.kind === 'commitment') || null;
}

async function touchMemories(userId: string, ids: string[]) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.execute({
    sql: `UPDATE ai_memory SET last_used_at = NOW() WHERE user_id = ? AND id IN (${placeholders})`,
    args: [userId, ...ids],
  }).catch(() => { /* non-kritis */ });
}

// ── Ekstraksi ────────────────────────────────────────────────────────────────

const EXTRACTOR_SYSTEM = `Kamu adalah modul MEMORI untuk Buddy, AI coach personal di aplikasi Flowbee.
Kamu tidak berbicara dengan siapapun. Tugasmu satu: membaca satu sesi interaksi, lalu memutuskan apa yang layak DIINGAT jangka panjang tentang orang ini.

JENIS MEMORI:
- "preference"  : cara dia suka diperlakukan atau bekerja
- "trigger"     : kondisi yang membuatnya stres, buntu, atau kewalahan
- "what_works"  : strategi yang terbukti berhasil untuk dia
- "commitment"  : niat/janji konkret yang dia ucapkan, yang pantas ditanyakan lagi nanti
- "context"     : keadaan kerja/hidup yang relevan untuk beberapa minggu ke depan

JANGAN PERNAH SIMPAN:
- Perasaan sesaat hari itu ("hari ini capek") — itu sudah tercatat di mood check-in
- Detail task harian yang basi besok
- Tebakan atau interpretasimu sendiri — hanya yang dinyatakan user atau sangat jelas tersirat
- Hal yang sudah ada di DAFTAR MEMORI SAAT INI, kecuali dikuatkan atau berubah
- Data sensitif: kondisi medis, agama, orientasi seksual, keuangan pribadi, atau konflik personal yang menyebut nama orang lain
- Apapun yang diucapkan Buddy, bukan user. Yang kamu ingat adalah tentang USER.

CARA MENULIS "content":
- Bahasa Indonesia, kalimat pernyataan tentang user, maksimal 140 karakter
- Spesifik dan berguna. "Sering lembur" (buruk) → "Cenderung lembur di minggu rilis produk" (baik)
- Satu fakta per entri

"confidence" 0-100: 90+ kalau user menyatakannya eksplisit; 60-80 kalau tersirat kuat; di bawah 60 jangan disimpan.

Kembalikan HANYA JSON dengan bentuk persis ini:
{
  "new": [{ "kind": "trigger", "content": "...", "confidence": 85 }],
  "reinforce": ["m1"],
  "resolve": ["m3"]
}
- "new"       : fakta baru (maksimal 3). Kosongkan array kalau tidak ada yang layak — ini normal dan sering terjadi.
- "reinforce" : ref memori lama yang dikonfirmasi lagi di sesi ini
- "resolve"   : ref memori lama yang sudah tuntas/tidak berlaku (mis. komitmen yang sudah dikerjakan, atau fakta yang dibantah user)
Pakai ref ("m1", "m2", ...) persis seperti yang tertera di DAFTAR MEMORI SAAT INI. Jangan mengarang ref.`;

interface ExtractionResult {
  new?: Array<{ kind?: string; content?: string; confidence?: number }>;
  reinforce?: string[];
  resolve?: string[];
}

function buildExtractorPrompt(existing: Memory[], transcript: string, source: MemorySource): string {
  const sourceLabel: Record<MemorySource, string> = {
    coach: 'Percakapan dengan Buddy',
    reflection: 'Refleksi tutup hari',
    checkin: 'Check-in tengah hari',
  };
  const list = existing.length
    ? existing.map((m, i) => `m${i + 1} [${m.kind}] ${m.content}`).join('\n')
    : '(masih kosong — ini interaksi pertama yang terekam)';

  return `SUMBER: ${sourceLabel[source]}

DAFTAR MEMORI SAAT INI:
${list}

ISI SESI:
${transcript}

Ekstrak memori yang layak disimpan dari sesi di atas.`;
}

async function insertMemory(userId: string, kind: MemoryKind, content: string, confidence: number, source: MemorySource) {
  const ttl = TTL_DAYS[kind];
  const id = `mem_${createHash('sha1').update(`${userId}:${fingerprintOf(content)}`).digest('hex').slice(0, 16)}`;
  await db.execute({
    sql: `INSERT INTO ai_memory (id, user_id, kind, content, fingerprint, confidence, source, status, times_seen, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ${ttl === null ? 'NULL' : `DATE_ADD(NOW(), INTERVAL ${ttl} DAY)`})
          ON DUPLICATE KEY UPDATE
            times_seen = times_seen + 1,
            confidence = LEAST(100, GREATEST(confidence, VALUES(confidence))),
            content = VALUES(content),
            status = 'active',
            expires_at = VALUES(expires_at),
            updated_at = NOW()`,
    args: [id, userId, kind, content, fingerprintOf(content), confidence, source],
  });
}

/**
 * Baca satu sesi, simpan yang layak diingat. Satu panggilan LLM.
 * Dipanggil setelah sesi selesai (bukan per pesan) supaya biayanya tetap kecil.
 * Aman dipanggil "fire and forget" — semua kegagalan ditelan dan dicatat.
 */
export async function extractAndSaveMemories(params: {
  userId: string;
  source: MemorySource;
  transcript: string;
}): Promise<{ saved: number; reinforced: number; resolved: number }> {
  const empty = { saved: 0, reinforced: 0, resolved: 0 };
  const { userId, source, transcript } = params;
  if (!userId || !transcript.trim() || !hasAIKey()) return empty;

  try {
    await ensureMemoryTable();
    // Ambil lebih banyak dari batas prompt: ekstraktor perlu melihat memori yang ada
    // supaya tidak menyimpan duplikat semantik ("stres kalau meeting banyak" vs "banyak meeting bikin stres").
    const existing = await getMemories(userId, 40);

    const result = await generateJSON<ExtractionResult>(
      EXTRACTOR_SYSTEM,
      buildExtractorPrompt(existing, transcript.slice(0, 8000), source),
      // thinkingBudget 0: ini tugas mekanis, dan token berpikir ikut memakan
      // maxOutputTokens — tanpa ini JSON-nya terpotong di tengah.
      { temperature: 0.2, maxTokens: 900, model: AI_MODELS.reasoning, thinkingBudget: 0 },
    );
    if (!result) return empty;

    const refToId = new Map<string, string>();
    existing.forEach((m, i) => refToId.set(`m${i + 1}`, m.id));

    // ── Fakta baru ──
    // Saring dulu, urutkan berdasarkan kepentingan jenis, baru potong — supaya
    // yang terbuang saat kena batas adalah yang paling tidak mendesak.
    const candidates = (result.new || [])
      .map(item => ({
        kind: (item.kind || '').trim() as MemoryKind,
        content: (item.content || '').trim().slice(0, MAX_CONTENT_LEN),
        confidence: Number(item.confidence),
      }))
      .filter(c =>
        VALID_KINDS.includes(c.kind) &&
        c.content.length >= 8 &&
        Number.isFinite(c.confidence) &&
        c.confidence >= 60
      )
      .sort((a, b) => (KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]) || (b.confidence - a.confidence))
      .slice(0, MAX_NEW_PER_SESSION);

    let saved = 0;
    for (const c of candidates) {
      await insertMemory(userId, c.kind, c.content, Math.min(100, Math.round(c.confidence)), source);
      saved++;
    }

    // ── Penguatan: fakta yang muncul lagi jadi lebih dipercaya ──
    const reinforceIds = (result.reinforce || []).map(r => refToId.get(r)).filter(Boolean) as string[];
    if (reinforceIds.length) {
      const placeholders = reinforceIds.map(() => '?').join(',');
      await db.execute({
        sql: `UPDATE ai_memory
              SET times_seen = times_seen + 1, confidence = LEAST(100, confidence + 5), updated_at = NOW()
              WHERE user_id = ? AND id IN (${placeholders})`,
        args: [userId, ...reinforceIds],
      });
    }

    // ── Penuntasan: komitmen yang sudah dikerjakan tidak boleh ditagih lagi ──
    const resolveIds = (result.resolve || []).map(r => refToId.get(r)).filter(Boolean) as string[];
    if (resolveIds.length) {
      const placeholders = resolveIds.map(() => '?').join(',');
      await db.execute({
        sql: `UPDATE ai_memory SET status = 'resolved', updated_at = NOW()
              WHERE user_id = ? AND id IN (${placeholders})`,
        args: [userId, ...resolveIds],
      });
    }

    await touchMemories(userId, existing.map(m => m.id));
    return { saved, reinforced: reinforceIds.length, resolved: resolveIds.length };
  } catch (e) {
    console.warn('extractAndSaveMemories error:', e);
    return empty;
  }
}

/**
 * User mencabut satu memori. Ditandai 'forgotten', bukan DELETE, supaya baris
 * unik-nya tetap menahan fingerprint — kalau tidak, fakta yang sama akan
 * langsung ditulis ulang pada sesi berikutnya dan penghapusan terasa tidak berefek.
 */
export async function forgetMemory(userId: string, memoryId: string): Promise<boolean> {
  if (!userId || !memoryId) return false;
  try {
    await ensureMemoryTable();
    await db.execute({
      sql: `UPDATE ai_memory SET status = 'forgotten', updated_at = NOW() WHERE user_id = ? AND id = ?`,
      args: [userId, memoryId],
    });
    return true;
  } catch (e) {
    console.warn('forgetMemory error:', e);
    return false;
  }
}

/** Hapus total semua memori seorang user. Untuk tombol "lupakan semua". */
export async function forgetAllMemories(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    await ensureMemoryTable();
    await db.execute({
      sql: `UPDATE ai_memory SET status = 'forgotten', updated_at = NOW() WHERE user_id = ? AND status = 'active'`,
      args: [userId],
    });
    return true;
  } catch (e) {
    console.warn('forgetAllMemories error:', e);
    return false;
  }
}
