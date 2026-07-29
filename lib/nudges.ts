import { db } from "@/lib/db";
import { SQL_WIB_TODAY, sqlWibDate, wibDateString } from "@/lib/timeUtils";

/**
 * ── Nudge harian ───────────────────────────────────────────────────────────
 *
 * Empat misi ringan per hari, dipilih berbeda untuk tiap orang dan tiap
 * tanggal. Semuanya diverifikasi SERVER sebelum dibayar.
 *
 * Versi sebelumnya memeriksa penyelesaian di browser lalu memanggil pemberian
 * poin langsung, dan menyimpan daftar klaim hanya di localStorage. Artinya dua
 * hal: membersihkan storage (atau pindah browser) membuat keempat misi bisa
 * diklaim ulang, dan satu misi — "Sapa Tim" — punya pemeriksa yang selalu
 * mengembalikan false sehingga hanya bisa diklaim lewat jalur "sudah menekan
 * tombol". Poin diberikan untuk menekan tombol, bukan untuk mengerjakan sesuatu.
 *
 * Sekarang tiap misi punya `verify()` yang menanyakan database. Yang tidak bisa
 * diverifikasi tidak masuk daftar — itu sebabnya misi "buka Coach AI" dihapus
 * (tidak ada jejak yang bisa diperiksa) dan "Sapa Tim" berubah dari *membuka*
 * chat menjadi *mengirim* pesan, yang meninggalkan baris nyata.
 *
 * Sebagian besar pemeriksaan membaca `xp_transactions`, karena setelah semua
 * pemberian poin disatukan lewat lib/points.ts setiap aksi dasar pasti
 * meninggalkan jejak di sana. Yang tidak berpoin (membuat task, mengirim pesan)
 * dibaca dari tabel asalnya.
 */

export interface NudgeMission {
  id: string;
  title: string;
  desc: string;
  glyph: string;
  actionLabel: string;
  /** Nama modal yang dibuka, atau id elemen untuk di-scroll. */
  target: { modal?: string; scrollTo?: string; tab?: string };
  verify: (userId: string) => Promise<boolean>;
}

/** Apakah ada poin yang tercatat hari ini untuk salah satu aksi berikut. */
async function hasPointsToday(userId: string, actions: string[]): Promise<boolean> {
  const res = await db.execute({
    sql: `SELECT 1 FROM xp_transactions
           WHERE user_id = ?
             AND kind = 'earn'
             AND action_type IN (${actions.map(() => "?").join(",")})
             AND ${sqlWibDate("created_at")} = ${SQL_WIB_TODAY}
           LIMIT 1`,
    args: [userId, ...actions],
  });
  return res.rows.length > 0;
}

async function countToday(sql: string, args: any[]): Promise<number> {
  const res = await db.execute({ sql, args });
  return Number(res.rows[0]?.c) || 0;
}

export const NUDGE_MISSIONS: NudgeMission[] = [
  {
    id: "dm_mood",
    title: "Cek Ombak Pagi",
    desc: "Isi Mood Check-in untuk memulai hari.",
    glyph: "heart",
    actionLabel: "Cek Mood",
    target: { modal: "checkin" },
    verify: (u) => hasPointsToday(u, ["mood_checkin"]),
  },
  {
    id: "dm_focus",
    title: "Fokus Sejenak",
    desc: "Selesaikan satu sesi fokus hari ini.",
    glyph: "hourglass",
    actionLabel: "Mulai Fokus",
    target: { modal: "focus" },
    verify: (u) => hasPointsToday(u, ["focus_session", "coworking_session"]),
  },
  {
    id: "dm_task",
    title: "Pecah Telur",
    desc: "Selesaikan minimal 1 tugas prioritas.",
    glyph: "target",
    actionLabel: "Fokus Task",
    target: { scrollTo: "task-harian-section" },
    verify: (u) => hasPointsToday(u, ["task_complete"]),
  },
  {
    id: "dm_plan",
    title: "Rencana Jitu",
    desc: "Susun minimal 3 tugas untuk hari ini.",
    glyph: "note",
    actionLabel: "Susun Task",
    target: { modal: "manage_priorities" },
    verify: async (u) =>
      (await countToday(
        `SELECT COUNT(*) AS c FROM daily_priorities
          WHERE user_id = ? AND ${sqlWibDate("target_date")} = ${SQL_WIB_TODAY}`,
        [u],
      )) >= 3,
  },
  {
    id: "dm_kudos",
    title: "Tebar Kebaikan",
    desc: "Kirim apresiasi ke rekan kerjamu.",
    glyph: "star",
    actionLabel: "Kirim Kudos",
    target: { modal: "appreciate" },
    verify: async (u) =>
      (await countToday(
        `SELECT COUNT(*) AS c FROM kudos
          WHERE sender_id = ? AND ${sqlWibDate("created_at")} = ${SQL_WIB_TODAY}`,
        [u],
      )) > 0,
  },
  {
    id: "dm_pause",
    title: "Jeda Sejenak",
    desc: "Lakukan sesi pernapasan singkat.",
    glyph: "leaf",
    actionLabel: "Mulai Napas",
    target: { modal: "pause" },
    verify: (u) => hasPointsToday(u, ["breathing"]),
  },
  {
    id: "dm_training",
    title: "Daily Training",
    desc: "Tandai selesai minimal 1 latihan hari ini.",
    glyph: "activity",
    actionLabel: "Buka Latihan",
    target: { scrollTo: "daily-training-section" },
    verify: (u) => hasPointsToday(u, ["habit_complete"]),
  },
  {
    id: "dm_midday",
    title: "Cek Progres Siang",
    desc: "Isi Mid-day Check-in sebelum terlewat.",
    glyph: "sun",
    actionLabel: "Cek Progres",
    target: { modal: "work_checkin" },
    verify: (u) => hasPointsToday(u, ["midday_checkin"]),
  },
  {
    id: "dm_chat",
    // Dulu "Sapa Tim: buka fitur Chat" dengan pemeriksa yang selalu false —
    // hanya bisa diklaim karena tombolnya menandai misi selesai. Mengirim pesan
    // meninggalkan baris di `messages`, jadi bisa benar-benar diperiksa.
    title: "Sapa Tim",
    desc: "Kirim satu pesan ke rekan atau grup.",
    glyph: "chat",
    actionLabel: "Buka Chat",
    target: { tab: "chat" },
    verify: async (u) =>
      (await countToday(
        `SELECT COUNT(*) AS c FROM messages
          WHERE sender_id = ? AND ${sqlWibDate("created_at")} = ${SQL_WIB_TODAY}`,
        [u],
      )) > 0,
  },
  {
    id: "dm_tutup",
    title: "Tutup Hari",
    desc: "Isi refleksi singkat sebelum pulang.",
    glyph: "moon",
    actionLabel: "Tutup Hari",
    target: { modal: "reflect" },
    verify: (u) => hasPointsToday(u, ["tutup_hari"]),
  },
];

/** Acak deterministik — tanggal + user menghasilkan urutan yang sama sepanjang hari. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const NUDGES_PER_DAY = 4;

/**
 * Misi hari ini untuk satu orang.
 *
 * Dihitung di server supaya klaim bisa diperiksa terhadap daftar yang benar —
 * kalau pemilihannya hanya ada di browser, klien bisa mengaku ditugasi misi apa
 * pun yang paling mudah.
 */
export function missionsFor(userId: string, dateWib = wibDateString()): NudgeMission[] {
  let seed = 0;
  for (let i = 0; i < userId.length; i++) seed += userId.charCodeAt(i);
  for (let i = 0; i < dateWib.length; i++) seed += dateWib.charCodeAt(i) * (i + 1);
  return seededShuffle(NUDGE_MISSIONS, seed).slice(0, NUDGES_PER_DAY);
}

export function nudgeRefId(missionId: string, dateWib = wibDateString()): string {
  return `nudge:${missionId}:${dateWib}`;
}

/** Misi mana yang sudah dibayar hari ini — dibaca dari ledger, bukan localStorage. */
export async function claimedToday(userId: string, dateWib = wibDateString()): Promise<Set<string>> {
  const res = await db.execute({
    sql: `SELECT ref_id FROM xp_transactions
           WHERE user_id = ? AND action_type = 'nudge_daily' AND kind = 'earn'
             AND ref_id LIKE ?`,
    args: [userId, `nudge:%:${dateWib}`],
  });
  const out = new Set<string>();
  for (const r of res.rows) {
    const parts = String(r.ref_id).split(":");
    if (parts.length >= 3) out.add(parts[1]);
  }
  return out;
}
