import { db } from "@/lib/db";
import { awardPoints, refFor } from "@/lib/points";

/**
 * ── Inti domain Live Coworking ─────────────────────────────────────────────
 *
 * Semua aturan ruang fokus tinggal di sini, di server. Klien hanya menampilkan
 * dan mengusulkan; file inilah yang memutuskan.
 *
 * Tiga hal yang sebelumnya dikerjakan browser dan sekarang tidak lagi:
 *
 *   1. WAKTU. Sisa waktu diturunkan dari `ends_at` di database, bukan dari
 *      `setInterval` yang di-throttle browser saat tab di latar belakang. Dua
 *      perangkat yang sama-sama menghitung sendiri pasti menyimpang.
 *
 *   2. POIN. `focused_secs` diakumulasi dari transisi status yang tercatat,
 *      lalu dibayar sekali lewat `awardPoints()` dengan kunci idempoten
 *      `focus:<roomId>`. Klien tidak pernah mengirim angka menit maupun poin.
 *
 *   3. WEWENANG. Siapa boleh menendang, membubarkan, dan memulai ditentukan
 *      `PERMISSIONS` di bawah — bukan oleh `isHost` yang dihitung ulang di
 *      browser dari daftar peserta yang bisa saja kosong.
 *
 * Filosofi hukumannya: jangan menghukum ketidakberuntungan. Software tidak bisa
 * membedakan "menerima telfon dari rumah sakit" dari "bosan lalu buka TikTok",
 * jadi jangan berpura-pura bisa. Yang ada adalah anggaran interupsi yang cukup
 * untuk hidup normal, dan poin proporsional terhadap waktu yang benar-benar
 * difokuskan. Tidak ada lagi "Sesi Gagal" bernilai nol untuk orang yang sudah
 * fokus 40 menit.
 */

// ── Tipe ────────────────────────────────────────────────────────────────────

export type FocusMode = "zen" | "hardcore";
export type RoomStatus = "waiting" | "running" | "finished" | "aborted";
export type RoomVisibility = "public" | "code" | "invite" | "solo";
export type JoinPolicy = "open_early" | "always_open" | "locked";
export type ParticipantRole = "host" | "comod" | "member";
export type ParticipantStatus = "joined" | "focusing" | "interrupted" | "left" | "removed";
export type Outcome = "completed" | "partial" | "excused" | "abandoned" | "removed";
export type InterruptKind = "voluntary" | "detected";

export type FocusAction =
  | "START" | "SET_ROOM" | "KICK" | "BAN" | "PROMOTE_COMOD" | "DEMOTE_COMOD"
  | "OFFER_HOST" | "ACCEPT_HOST" | "DECLINE_HOST" | "EXCUSE" | "END_FOR_ALL"
  | "LEAVE" | "INTERRUPT_START" | "INTERRUPT_END" | "JOIN"
  | "OPEN_TO_PUBLIC" | "APPROVE_JOIN" | "REJECT_JOIN";

export interface RoomRow {
  id: string;
  name: string;
  description: string | null;
  mode: FocusMode;
  duration_mins: number;
  status: RoomStatus;
  host_id: string;
  visibility: RoomVisibility;
  join_code: string | null;
  join_policy: JoinPolicy;
  max_participants: number;
  started_at: Date | string | null;
  ends_at: Date | string | null;
  created_at: Date | string | null;
  host_last_seen: Date | string | null;
  closed_reason: string | null;
  settled_at: Date | string | null;
}

export interface ParticipantRow {
  room_id: string;
  user_id: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joined_at: Date | string | null;
  joined_session_at: Date | string | null;
  state_changed_at: Date | string | null;
  focused_secs: number;
  interrupt_secs: number;
  interrupts_used: number;
  interrupted_at: Date | string | null;
  interrupt_kind: InterruptKind | null;
  last_heartbeat: Date | string | null;
  outcome: Outcome | null;
  outcome_note: string | null;
  awarded_points: number | null;
  name?: string;
  avatar?: string | null;
}

// ── Konstanta yang dikalibrasi ──────────────────────────────────────────────

/** Detik tanpa heartbeat sebelum server menganggap peserta sedang menjauh. */
export const HEARTBEAT_STALE_SECS = 45;
/** Interval kirim heartbeat yang diharapkan dari klien. */
export const HEARTBEAT_INTERVAL_SECS = 20;
/** Host tanpa kabar selama ini → suksesi dijalankan. */
export const HOST_ABSENT_SECS = 90;
/** Ruang tunggu yang tidak pernah dimulai ditutup setelah ini. */
export const LOBBY_IDLE_SECS = 20 * 60;

/** Menit fokus minimum agar sebuah sesi berpoin. Mematikan spam sesi 1 menit. */
export const MIN_CREDITABLE_MINS = 10;
/** Menit fokus maksimum yang dibayar per sesi. Sisanya tetap tercatat di logbook. */
export const MAX_CREDITABLE_MINS = 120;

/**
 * Zona bebas: interupsi sependek ini tidak memakan jatah sama sekali.
 *
 * 60 detik dipilih supaya kejadian sehari-hari lolos tanpa drama — layar HP
 * terkunci otomatis (default iOS 30 detik), notifikasi OTP yang dibuka sekilas,
 * atau melirik pesan masuk. Zen jauh lebih longgar karena memang tidak menuntut
 * perangkat dijauhkan.
 */
export function graceSecsFor(mode: FocusMode, kind: InterruptKind): number {
  const base = mode === "zen" ? 180 : 60;
  // Melapor lebih baik daripada menghilang, jadi melapor diberi ruang lebih
  // lega. Ini insentif yang disengaja: kita ingin orang menekan tombol
  // "saya harus menjauh", bukan diam-diam menutup tab.
  return kind === "voluntary" ? Math.round(base * 1.5) : base;
}

/**
 * Anggaran interupsi per sesi, proporsional dengan durasi.
 *
 * Dua dimensi sekaligus: berapa KALI boleh terganggu, dan TOTAL berapa lama.
 * Satu dimensi saja bisa diakali — jatah 3× tanpa batas total berarti tiga
 * interupsi satu jam.
 */
export function interruptBudget(durationMins: number): { allowance: number; totalSecs: number } {
  if (durationMins <= 25) return { allowance: 1, totalSecs: 3 * 60 };
  if (durationMins <= 50) return { allowance: 2, totalSecs: 6 * 60 };
  if (durationMins <= 90) return { allowance: 3, totalSecs: 10 * 60 };
  return { allowance: 4, totalSecs: 15 * 60 };
}

// ── Wewenang ────────────────────────────────────────────────────────────────

/**
 * Tabel wewenang. Sebelumnya `action/route.ts` tidak memeriksa apa pun kecuali
 * pada START — siapa saja bisa membubarkan ruangan orang lain atau merebut
 * posisi host lewat satu `fetch` dari console browser.
 */
const PERMISSIONS: Record<FocusAction, ParticipantRole[]> = {
  START: ["host"],
  SET_ROOM: ["host"],
  KICK: ["host", "comod"],
  BAN: ["host"],
  PROMOTE_COMOD: ["host"],
  DEMOTE_COMOD: ["host"],
  OFFER_HOST: ["host"],
  EXCUSE: ["host", "comod"],
  END_FOR_ALL: ["host"],
  OPEN_TO_PUBLIC: ["host"],
  APPROVE_JOIN: ["host", "comod"],
  REJECT_JOIN: ["host", "comod"],
  // Semua peserta boleh mengurus dirinya sendiri.
  ACCEPT_HOST: ["host", "comod", "member"],
  DECLINE_HOST: ["host", "comod", "member"],
  LEAVE: ["host", "comod", "member"],
  INTERRUPT_START: ["host", "comod", "member"],
  INTERRUPT_END: ["host", "comod", "member"],
  JOIN: ["host", "comod", "member"],
};

export function can(role: ParticipantRole, action: FocusAction): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

// ── Utilitas ────────────────────────────────────────────────────────────────

function toMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function sqlDate(ms: number): string {
  // Kolom DATETIME menyimpan UTC (lihat lib/db.ts), jadi format ISO tanpa zona.
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Alfabet tanpa karakter yang tertukar saat dibacakan lewat chat atau suara:
 * tanpa I/L/1, tanpa O/0. Kode dibaca manusia ke manusia, jadi ini penting.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Kode gabung yang dijamin unik. Versi lama memakai `Math.random().toString(36)
 * .substring(2, 6)` tanpa cek keunikan sama sekali: tabrakan primary key muncul
 * ke user sebagai "Internal Server Error", dan panjangnya bisa kurang dari 4
 * karakter kalau angka acaknya pendek.
 */
export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode(6);
    const clash = await db.execute(
      "SELECT 1 FROM focus_rooms WHERE join_code = ? LIMIT 1",
      [code],
    );
    if (clash.rows.length === 0) return code;
  }
  throw new Error("Gagal membuat kode ruangan unik setelah 12 percobaan.");
}

export function newRoomId(): string {
  return "fr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export async function logRoomEvent(
  roomId: string,
  eventType: string,
  opts: { actorId?: string | null; targetId?: string | null; payload?: any } = {},
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO focus_room_events (id, room_id, actor_id, target_id, event_type, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [
        "fe_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        roomId,
        opts.actorId ?? null,
        opts.targetId ?? null,
        eventType,
        opts.payload ? JSON.stringify(opts.payload) : null,
      ],
    );
  } catch (e) {
    // Jejak audit tidak boleh menjatuhkan aksi utamanya.
    console.warn("[focusRoom] Gagal menulis jejak audit:", e);
  }
}

// ── Pembacaan ───────────────────────────────────────────────────────────────

export async function getRoom(roomId: string): Promise<RoomRow | null> {
  const res = await db.execute("SELECT * FROM focus_rooms WHERE id = ? LIMIT 1", [roomId]);
  return (res.rows[0] as RoomRow) ?? null;
}

export async function getRoomByJoinCode(code: string): Promise<RoomRow | null> {
  const res = await db.execute(
    `SELECT * FROM focus_rooms
      WHERE join_code = ? AND status IN ('waiting','running') AND visibility <> 'solo'
      LIMIT 1`,
    [String(code || "").trim().toUpperCase()],
  );
  return (res.rows[0] as RoomRow) ?? null;
}

export async function getParticipants(roomId: string): Promise<ParticipantRow[]> {
  const res = await db.execute(
    `SELECT fp.*, u.name, u.avatar_image AS avatar
       FROM focus_room_participants fp
       JOIN users u ON u.id = fp.user_id
      WHERE fp.room_id = ?
      ORDER BY fp.joined_at ASC`,
    [roomId],
  );
  return res.rows as ParticipantRow[];
}

export async function getParticipant(
  roomId: string,
  userId: string,
): Promise<ParticipantRow | null> {
  const res = await db.execute(
    "SELECT * FROM focus_room_participants WHERE room_id = ? AND user_id = ? LIMIT 1",
    [roomId, userId],
  );
  return (res.rows[0] as ParticipantRow) ?? null;
}

/** Peserta yang masih terhitung ada di ruangan. */
export function isActive(p: ParticipantRow): boolean {
  return p.status === "joined" || p.status === "focusing" || p.status === "interrupted";
}

/** Peserta yang sedang menjalani sesi (bukan sekadar menunggu di lobby). */
export function isInSession(p: ParticipantRow): boolean {
  return p.status === "focusing" || p.status === "interrupted";
}

// ── Akuntansi waktu ─────────────────────────────────────────────────────────

/**
 * Memajukan pembukuan seorang peserta sampai `now`.
 *
 * Anchor-nya `state_changed_at`: setiap kali kita menambahkan waktu ke sebuah
 * akumulator, anchor ikut maju. Itu yang membuat fungsi ini aman dipanggil
 * berkali-kali — memanggilnya dua kali berturut-turut tidak menghitung ganda.
 *
 * Peserta yang berhenti mengirim heartbeat tidak langsung dianggap gagal.
 * Waktunya berhenti dihitung sebagai fokus per `last_heartbeat` (bukan per
 * `now`, karena detik-detik setelah itu memang tidak terbukti), lalu ia masuk
 * status `interrupted`. Ini yang membalik insentif lama: dulu menutup tab justru
 * lolos tanpa deteksi, sekarang menutup tab adalah jalur dengan hasil terburuk.
 */
interface ReconcileResult {
  changed: boolean;
  patch: Partial<ParticipantRow> & Record<string, any>;
  finalized: Outcome | null;
}

function reconcileParticipant(
  p: ParticipantRow,
  room: RoomRow,
  nowMs: number,
): ReconcileResult {
  const patch: Record<string, any> = {};
  let changed = false;
  let finalized: Outcome | null = null;

  if (!isInSession(p)) return { changed: false, patch, finalized: null };

  const endsAt = toMs(room.ends_at);
  // Pembukuan tidak boleh melewati akhir sesi: waktu setelah `ends_at` bukan
  // waktu fokus, dan menghitungnya akan membayar orang yang lupa menutup tab.
  const horizon = endsAt ? Math.min(nowMs, endsAt) : nowMs;

  let anchor = toMs(p.state_changed_at) ?? toMs(p.joined_session_at) ?? toMs(room.started_at) ?? horizon;
  let focused = Number(p.focused_secs) || 0;
  let interrupted = Number(p.interrupt_secs) || 0;
  let used = Number(p.interrupts_used) || 0;
  let status: ParticipantStatus = p.status;
  let interruptKind: InterruptKind | null = p.interrupt_kind ?? null;

  if (status === "focusing") {
    const lastBeat = toMs(p.last_heartbeat) ?? anchor;
    const staleAt = lastBeat + HEARTBEAT_STALE_SECS * 1000;

    if (horizon > staleAt) {
      // Fokus hanya diakui sampai detak terakhir yang terbukti.
      const provenUntil = Math.max(anchor, Math.min(lastBeat, horizon));
      focused += Math.max(0, Math.round((provenUntil - anchor) / 1000));
      status = "interrupted";
      interruptKind = "detected";
      anchor = provenUntil;
      patch.interrupted_at = sqlDate(provenUntil);
      changed = true;
    } else if (horizon > anchor) {
      focused += Math.round((horizon - anchor) / 1000);
      anchor = horizon;
      changed = true;
    }
  }

  if (status === "interrupted") {
    const elapsed = Math.max(0, Math.round((horizon - anchor) / 1000));
    if (elapsed > 0) {
      interrupted += elapsed;
      anchor = horizon;
      changed = true;
    }

    const budget = interruptBudget(Number(room.duration_mins) || 25);
    const grace = graceSecsFor(room.mode, interruptKind ?? "detected");
    const thisInterruptSecs = Math.max(
      0,
      Math.round((horizon - (toMs(p.interrupted_at) ?? anchor)) / 1000),
    );

    const outOfTime = interrupted > budget.totalSecs;
    const outOfTurns = used >= budget.allowance && thisInterruptSecs > grace;

    if (outOfTime || outOfTurns) {
      // Sesi peserta INI diselesaikan. Sesi peserta lain tidak tersentuh —
      // tidak ada hukuman kolektif.
      finalized = "partial";
      status = "left";
      changed = true;
    }
  }

  if (!changed) return { changed: false, patch, finalized: null };

  patch.focused_secs = focused;
  patch.interrupt_secs = interrupted;
  patch.interrupts_used = used;
  patch.status = status;
  patch.interrupt_kind = interruptKind;
  patch.state_changed_at = sqlDate(anchor);

  if (finalized) {
    patch.outcome = finalized;
    patch.outcome_note = "Anggaran interupsi habis";
  }

  return { changed, patch, finalized };
}

async function applyPatch(roomId: string, userId: string, patch: Record<string, any>) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  await db.execute(
    `UPDATE focus_room_participants SET ${keys.map((k) => `${k} = ?`).join(", ")}
      WHERE room_id = ? AND user_id = ?`,
    [...keys.map((k) => patch[k]), roomId, userId],
  );
}

/**
 * Mengembalikan peserta dari interupsi ke status fokus.
 *
 * Ini SATU-SATUNYA tempat `interrupts_used` bertambah, sehingga jatah tidak
 * mungkin terhitung ganda: jatah dipakai saat interupsi BERAKHIR, bukan saat
 * dimulai, dan hanya kalau durasinya melewati zona bebas.
 */
export async function resumeFromInterrupt(
  room: RoomRow,
  p: ParticipantRow,
): Promise<{ resumed: boolean; consumedAllowance: boolean; secs: number }> {
  if (p.status !== "interrupted") return { resumed: false, consumedAllowance: false, secs: 0 };

  const kind = p.interrupt_kind ?? "detected";
  const grace = graceSecsFor(room.mode, kind);
  const startedMs = toMs(p.interrupted_at) ?? Date.now();
  const secs = Math.max(0, Math.round((Date.now() - startedMs) / 1000));
  const consumesAllowance = secs > grace;

  await db.execute(
    `UPDATE focus_room_participants
        SET status = 'focusing',
            interrupts_used = interrupts_used + ?,
            interrupted_at = NULL,
            interrupt_kind = NULL,
            state_changed_at = UTC_TIMESTAMP(),
            last_heartbeat = UTC_TIMESTAMP()
      WHERE room_id = ? AND user_id = ? AND status = 'interrupted'`,
    [consumesAllowance ? 1 : 0, room.id, p.user_id],
  );

  return { resumed: true, consumedAllowance: consumesAllowance, secs };
}

// ── Suksesi host ────────────────────────────────────────────────────────────

/**
 * Ruangan tidak boleh berada dalam keadaan tanpa host.
 *
 * Urutannya sengaja deterministik supaya hasilnya bisa dijelaskan ke user dan
 * tidak berubah-ubah antar pemanggilan: co-moderator dulu (mereka sudah
 * menerima peran pengawasan), lalu yang paling banyak fokus (paling terlibat,
 * paling rugi kalau ruangan bubar), lalu yang paling awal bergabung.
 */
export async function electNewHost(
  roomId: string,
  excludeUserId: string,
): Promise<ParticipantRow | null> {
  const participants = await getParticipants(roomId);
  const candidates = participants.filter(
    (p) => isActive(p) && String(p.user_id) !== String(excludeUserId),
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const comod = (a.role === "comod" ? 0 : 1) - (b.role === "comod" ? 0 : 1);
    if (comod !== 0) return comod;
    const focus = (Number(b.focused_secs) || 0) - (Number(a.focused_secs) || 0);
    if (focus !== 0) return focus;
    return (toMs(a.joined_at) ?? 0) - (toMs(b.joined_at) ?? 0);
  });

  return candidates[0];
}

export async function transferHost(
  roomId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  await db.transaction(async (conn) => {
    await conn.execute(
      "UPDATE focus_room_participants SET role = 'member' WHERE room_id = ? AND user_id = ?",
      [roomId, fromUserId],
    );
    await conn.execute(
      "UPDATE focus_room_participants SET role = 'host' WHERE room_id = ? AND user_id = ?",
      [roomId, toUserId],
    );
    await conn.execute("UPDATE focus_rooms SET host_id = ?, host_last_seen = UTC_TIMESTAMP() WHERE id = ?", [
      toUserId,
      roomId,
    ]);
  });
}

// ── Rekonsiliasi ruangan ────────────────────────────────────────────────────

export interface RoomState {
  room: RoomRow;
  participants: ParticipantRow[];
  /** Terisi kalau rekonsiliasi ini yang menutup ruangan. */
  justClosed: boolean;
  hostChangedTo: string | null;
}

/**
 * Memajukan seluruh keadaan ruangan ke `now` dan menyimpannya.
 *
 * Dipanggil di setiap pembacaan dan setiap aksi, jadi tidak ada background job
 * yang wajib hidup agar sistem benar. Ruangan yang tidak pernah disentuh lagi
 * dibereskan oleh `reapStaleRooms()`.
 */
export async function reconcileRoom(roomId: string): Promise<RoomState | null> {
  const room = await getRoom(roomId);
  if (!room) return null;

  const nowMs = Date.now();
  let participants = await getParticipants(roomId);
  let justClosed = false;
  let hostChangedTo: string | null = null;

  if (room.status === "running") {
    for (const p of participants) {
      const { changed, patch } = reconcileParticipant(p, room, nowMs);
      if (changed) await applyPatch(roomId, String(p.user_id), patch);
    }
    participants = await getParticipants(roomId);

    const endsAt = toMs(room.ends_at);
    if (endsAt && nowMs >= endsAt) {
      await closeRoom(roomId, "completed");
      justClosed = true;
    } else if (!participants.some((p) => isActive(p))) {
      // Semua orang sudah pergi — tidak ada gunanya ruangan tetap hidup.
      await closeRoom(roomId, "empty");
      justClosed = true;
    }
  }

  if (room.status === "waiting") {
    const createdAt = toMs(room.created_at) ?? nowMs;
    if (nowMs - createdAt > LOBBY_IDLE_SECS * 1000) {
      await closeRoom(roomId, "idle");
      justClosed = true;
    }
  }

  // Suksesi: host yang hilang tidak boleh menyandera ruangan. Kepergiannya juga
  // tidak boleh menghanguskan kerja peserta lain — itu menghukum orang yang
  // tidak melakukan kesalahan apa pun.
  if (!justClosed && (room.status === "waiting" || room.status === "running")) {
    const hostSeen = toMs(room.host_last_seen) ?? toMs(room.started_at) ?? toMs(room.created_at) ?? nowMs;
    const hostRow = participants.find((p) => String(p.user_id) === String(room.host_id));
    const hostGone = !hostRow || !isActive(hostRow);

    // Ketidakhadiran hanya memicu suksesi pada sesi yang SEDANG BERJALAN.
    // Di ruang tunggu tidak ada yang dipertaruhkan, dan host yang menutup layar
    // sambil menunggu rekan datang tidak seharusnya kehilangan ruangannya —
    // ruang tunggu yang benar-benar telantar sudah diurus batas idle di atas.
    const hostAbsent = room.status === "running" && nowMs - hostSeen > HOST_ABSENT_SECS * 1000;

    if (hostGone || hostAbsent) {
      const heir = await electNewHost(roomId, String(room.host_id));
      if (heir) {
        await transferHost(roomId, String(room.host_id), String(heir.user_id));
        await logRoomEvent(roomId, "HOST_SUCCEEDED", {
          actorId: null,
          targetId: String(heir.user_id),
          payload: { reason: hostGone ? "host_left" : "host_absent" },
        });
        hostChangedTo = String(heir.user_id);
      } else if (hostGone) {
        await closeRoom(roomId, "host_gone");
        justClosed = true;
      }
    }
  }

  const finalRoom = (await getRoom(roomId))!;
  return {
    room: finalRoom,
    participants: await getParticipants(roomId),
    justClosed,
    hostChangedTo,
  };
}

/** Menutup ruangan dan menyelesaikan pembukuan semua pesertanya. */
export async function closeRoom(roomId: string, reason: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || room.status === "finished" || room.status === "aborted") return;

  const status: RoomStatus = reason === "aborted" || reason === "host_gone" ? "aborted" : "finished";
  await db.execute("UPDATE focus_rooms SET status = ?, closed_reason = ? WHERE id = ?", [
    status,
    reason,
    roomId,
  ]);
  await logRoomEvent(roomId, "ROOM_CLOSED", { payload: { reason } });
  await settleRoom(roomId);
}

// ── Penyelesaian & poin ─────────────────────────────────────────────────────

/** Poin per menit fokus. Dikalibrasi terhadap ekonomi di lib/points.ts. */
const RATE_PER_MIN = 0.5;

const MODE_MULTIPLIER: Record<FocusMode, number> = { zen: 1.0, hardcore: 1.25 };

const OUTCOME_FACTOR: Record<Outcome, number> = {
  completed: 1.0,
  partial: 0.8,
  excused: 0.9,
  abandoned: 0,
  removed: 0,
};

/**
 * Pengali tim dihitung dari peserta yang BENAR-BENAR menyelesaikan, bukan dari
 * yang pernah bergabung. Kalau dihitung dari yang bergabung, host tinggal
 * mengundang lima orang yang langsung keluar untuk mendapat 1.2×.
 */
export function teamMultiplier(finishers: number): number {
  if (finishers <= 1) return 1;
  return Math.min(1.2, 1 + 0.05 * (finishers - 1));
}

export function computePoints(opts: {
  focusedSecs: number;
  mode: FocusMode;
  outcome: Outcome;
  finishers: number;
}): number {
  const factor = OUTCOME_FACTOR[opts.outcome] ?? 0;
  if (factor === 0) return 0;

  const mins = Math.floor(opts.focusedSecs / 60);
  if (mins < MIN_CREDITABLE_MINS) return 0;

  const creditable = Math.min(mins, MAX_CREDITABLE_MINS);
  const raw =
    creditable * RATE_PER_MIN * MODE_MULTIPLIER[opts.mode] * teamMultiplier(opts.finishers) * factor;
  return Math.max(0, Math.round(raw));
}

/**
 * Menentukan hasil akhir seorang peserta.
 *
 * Tidak ada lagi kategori "gagal" bernilai nol untuk orang yang sudah fokus
 * lama. Satu-satunya hasil bernilai nol untuk peserta yang tidak dikeluarkan
 * adalah `abandoned` — dan itu tepat, karena orang yang tidak pernah kembali
 * memang tidak melakukan apa pun yang layak dihargai.
 */
function decideOutcome(p: ParticipantRow, room: RoomRow): Outcome {
  if (p.outcome) return p.outcome; // sudah difinalkan lebih awal
  if (p.status === "removed") return "removed";

  const budget = interruptBudget(Number(room.duration_mins) || 25);
  const interrupted = Number(p.interrupt_secs) || 0;

  if (p.status === "interrupted") {
    return interrupted > budget.totalSecs ? "abandoned" : "partial";
  }
  if (p.status === "focusing") return "completed";
  if (p.status === "left") return "partial";
  // Tidak pernah benar-benar masuk sesi (masih 'joined' saat ruangan ditutup).
  return "abandoned";
}

/**
 * Mencatat sesi yang tidak menghasilkan poin ke logbook.
 *
 * `awardPoints()` menulis logbook sendiri, tapi hanya ketika ada poin yang
 * benar-benar diberikan. Tanpa fungsi ini, sesi yang tertahan kuota harian atau
 * yang di bawah menit minimum lenyap total dari catatan — dan "hari yang
 * terlihat kosong padahal orangnya bekerja" adalah kesalahan yang lebih mahal
 * daripada poin yang tidak jadi diberikan.
 */
async function writeUncreditedLogbook(
  userId: string,
  mins: number,
  room: RoomRow,
  isSolo: boolean,
): Promise<void> {
  try {
    const label = `${isSolo ? "Sesi fokus" : "Coworking"} ${mins} menit — ${room.name}`;
    // `id` dilepas ke AUTO_INCREMENT — kolomnya INT, dan string "log_<base36>"
    // yang dulu dikirim di sini selalu ditolak MySQL. Lihat lib/points.ts.
    await db.execute(
      `INSERT INTO logbook_entries (user_id, type, title, description, xp_earned, created_at)
       VALUES (?, 'activity', ?, ?, 0, UTC_TIMESTAMP())`,
      [
        userId,
        `${isSolo ? "⏱️" : "👥"} ${label}`,
        label,
      ],
    );
  } catch (e) {
    console.warn("[focusRoom] Gagal mencatat sesi tanpa poin ke logbook:", e);
  }
}

/**
 * Membayar seluruh peserta satu kali.
 *
 * Idempoten di dua lapis: `settled_at` di ruangan, dan kunci `focus:<roomId>`
 * di ledger poin. Memanggilnya berulang kali aman.
 */
export async function settleRoom(roomId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || room.settled_at) return;

  // Klaim hak menyelesaikan di bawah kunci baris, supaya dua permintaan
  // bersamaan tidak sama-sama masuk ke perhitungan. `db.execute` tidak
  // melaporkan jumlah baris terpengaruh, jadi SELECT ... FOR UPDATE adalah
  // satu-satunya cara mendapat klaim yang benar-benar eksklusif di sini.
  const claimed = await db.transaction(async (conn) => {
    const [rows]: any = await conn.execute(
      "SELECT settled_at FROM focus_rooms WHERE id = ? FOR UPDATE",
      [roomId],
    );
    if (!rows[0] || rows[0].settled_at) return false;
    await conn.execute("UPDATE focus_rooms SET settled_at = UTC_TIMESTAMP() WHERE id = ?", [roomId]);
    return true;
  });
  if (!claimed) return;

  const nowMs = Date.now();
  const participants = await getParticipants(roomId);

  // Pembukuan terakhir sebelum menghitung, supaya detik-detik menjelang akhir
  // sesi tidak hilang.
  for (const p of participants) {
    if (isInSession(p)) {
      const { changed, patch } = reconcileParticipant(p, room, nowMs);
      if (changed) await applyPatch(roomId, String(p.user_id), patch);
    }
  }

  const settled = await getParticipants(roomId);
  const outcomes = new Map<string, Outcome>();
  for (const p of settled) outcomes.set(String(p.user_id), decideOutcome(p, room));

  const finishers = [...outcomes.values()].filter(
    (o) => o === "completed" || o === "partial" || o === "excused",
  ).length;

  const isSolo = room.visibility === "solo";

  for (const p of settled) {
    const userId = String(p.user_id);
    const outcome = outcomes.get(userId)!;
    const points = computePoints({
      focusedSecs: Number(p.focused_secs) || 0,
      mode: room.mode,
      outcome,
      finishers,
    });

    const mins = Math.floor((Number(p.focused_secs) || 0) / 60);

    let awarded = 0;
    if (points > 0) {
      const result = await awardPoints({
        userId,
        // Sesi bersama dan sesi sendiri punya kuota terpisah: yang satu
        // menghargai kolaborasi, yang satu menghargai kedalaman kerja pribadi.
        action: isSolo ? "focus_session" : "coworking_session",
        refId: refFor.focus(roomId),
        description: `${isSolo ? "Sesi fokus" : "Coworking"} ${mins} menit — ${room.name}`,
        overrideValue: points,
      });
      awarded = result.awarded;
    }

    await db.execute(
      "UPDATE focus_room_participants SET outcome = ?, awarded_points = ? WHERE room_id = ? AND user_id = ?",
      [outcome, awarded, roomId, userId],
    );

    // Waktu yang tidak berpoin tetap waktu yang dikerjakan.
    //
    // Kuota harian penuh, sesi di bawah sepuluh menit, atau menit di atas
    // plafon semuanya menghasilkan nol poin — tapi menghapusnya dari catatan
    // berarti manager melihat hari yang terlihat kosong padahal orangnya
    // bekerja. Poin adalah insentif; logbook adalah rekaman. Keduanya tidak
    // harus sepakat.
    if (awarded === 0 && mins >= 1 && OUTCOME_FACTOR[outcome] > 0) {
      await writeUncreditedLogbook(userId, mins, room, isSolo);
    }

    await logRoomEvent(roomId, "SETTLED", {
      targetId: userId,
      payload: { outcome, focusedSecs: Number(p.focused_secs) || 0, points },
    });
  }

  // Melaporkan yang tertahan dilakukan SETELAH semua orang dibayar, dan di
  // dalam penjaganya sendiri. Push adalah urusan sampingan; ia tidak boleh
  // punya kesempatan menggagalkan pembayaran yang sudah diklaim di atas.
  const sessionMins = Math.max(
    1,
    Math.round((nowMs - (toMs(room.started_at) ?? nowMs - room.duration_mins * 60_000)) / 60_000),
  );
  for (const p of settled) {
    if (!OUTCOME_FACTOR[outcomes.get(String(p.user_id))!]) continue;
    try {
      await reportHeldNotifications(String(p.user_id), sessionMins);
    } catch (e) {
      console.warn("[FocusRoom] Held-notification report failed:", e);
    }
  }
}

/**
 * Memberi tahu apa yang menumpuk selama sesi berjalan.
 *
 * SATU push berisi hitungan, bukan N push beruntun. Melepaskan lima notifikasi
 * sekaligus di detik sesi berakhir bukan menahan interupsi — itu menundanya
 * lalu melipatgandakannya, dan orang yang baru selesai fokus justru dihukum
 * karena sudah fokus.
 *
 * Jendelanya dihitung dengan `LEAST(NOW(), UTC_TIMESTAMP())` seperti pemeriksa
 * duplikat di lib/notificationService.ts. Kolom `created_at` di tabel itu
 * ditulis dua gaya zona waktu, dan menciptakan konvensi ketiga di sini akan
 * membuat hitungannya meleset persis pada selisih zona server.
 */
async function reportHeldNotifications(userId: string, sinceMinutes: number): Promise<void> {
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM notifications
           WHERE user_id = ? AND is_read = 0
             AND created_at >= LEAST(NOW(), UTC_TIMESTAMP()) - INTERVAL ? MINUTE`,
    args: [userId, sinceMinutes],
  });

  const count = Number(res.rows[0]?.n ?? 0);
  if (count < 1) return;

  const { sendPushNotification } = await import("./pushService");
  await sendPushNotification(
    userId,
    "Sesi fokusmu selesai",
    count === 1
      ? "Ada 1 kabar yang menunggu selama kamu fokus."
      : `Ada ${count} kabar yang menunggu selama kamu fokus.`,
    "/",
    // Sesinya sudah berakhir saat baris ini jalan, tapi status peserta di tabel
    // belum tentu sudah ikut berubah. Tanpa bypass, satu-satunya push yang
    // dikirim justru karena sesi selesai bisa ditahan oleh sesi itu sendiri.
    { bypassFocus: true },
  );
}

// ── Pemeliharaan ────────────────────────────────────────────────────────────

/**
 * Membereskan ruangan yang tidak ada lagi yang membukanya.
 *
 * Tanpa ini, ruangan yang host-nya menutup laptop akan menggantung di lobby dan
 * menjebak tamu di layar "Menunggu host memulai sesi" tanpa batas waktu.
 */
export async function reapStaleRooms(): Promise<number> {
  const stale = await db.execute(
    `SELECT id FROM focus_rooms
      WHERE status IN ('waiting','running')
        AND (
              (status = 'running' AND ends_at IS NOT NULL AND ends_at <= UTC_TIMESTAMP())
           OR (status = 'waiting' AND created_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND))
        )
      LIMIT 50`,
    [LOBBY_IDLE_SECS],
  );

  for (const row of stale.rows) {
    try {
      await closeRoom(String(row.id), "expired");
    } catch (e) {
      console.warn("[focusRoom] Gagal menutup ruangan kedaluwarsa:", row.id, e);
    }
  }
  return stale.rows.length;
}

/**
 * Satu user tidak boleh menjalani dua sesi sekaligus.
 *
 * Tanpa ini, membuka lima tab menghasilkan lima sesi paralel yang semuanya
 * dibayar — cara curang termudah yang tidak butuh alat apa pun.
 */
export async function findActiveSessionElsewhere(
  userId: string,
  exceptRoomId?: string,
): Promise<string | null> {
  const res = await db.execute(
    `SELECT fp.room_id FROM focus_room_participants fp
       JOIN focus_rooms fr ON fr.id = fp.room_id
      WHERE fp.user_id = ?
        AND fp.status IN ('focusing','interrupted')
        AND fr.status = 'running'
        AND fr.id <> ?
      LIMIT 1`,
    [userId, exceptRoomId ?? ""],
  );
  return res.rows[0] ? String(res.rows[0].room_id) : null;
}

/**
 * Sedang fokus dalam arti "sedang tidak boleh diinterupsi".
 *
 * Bukan sekadar "punya sesi", dan bedanya disengaja:
 *
 *   • RUANG TUNGGU belum menghitung apa pun. Menahan kabar di sana berarti
 *     menahan kabar tanpa melindungi satu menit pun.
 *   • MENJAUH berarti orangnya sudah terlanjur terganggu. Menahan notifikasi
 *     justru menyembunyikan alasan dia menjauh — bisa jadi kabar itu sendiri.
 *
 * Penjaga `ends_at` di baris terakhir bukan hiasan. Sesi yang lewat waktunya
 * tapi belum sempat disentuh reaper tetap berstatus `running` di tabel; tanpa
 * penjaga itu satu sesi macet akan membungkam notifikasi user selamanya, dan
 * kegagalan seperti itu tidak akan pernah dilaporkan siapa pun karena bentuknya
 * adalah ketiadaan.
 */
export async function isFocusProtected(userId: string): Promise<boolean> {
  try {
    const res = await db.execute(
      `SELECT 1 FROM focus_room_participants fp
         JOIN focus_rooms fr ON fr.id = fp.room_id
        WHERE fp.user_id = ?
          AND fp.status = 'focusing'
          AND fr.status = 'running'
          AND (fr.ends_at IS NULL OR fr.ends_at > UTC_TIMESTAMP())
        LIMIT 1`,
      [userId],
    );
    return res.rows.length > 0;
  } catch (e) {
    // Gagal memeriksa harus berarti "kirim saja". Menelan notifikasi karena
    // query error adalah kegagalan diam-diam; notifikasi yang lolos saat sesi
    // fokus cuma mengganggu, dan itu keadaan yang sama seperti sebelum fitur
    // ini ada.
    console.warn("[FocusRoom] Focus-protection check failed, allowing push:", e);
    return false;
  }
}

/**
 * Permintaan masuk yang belum dijawab, untuk ruangan ber-visibility `invite`.
 *
 * Antreannya hidup di `focus_room_events`, bukan di tabel sendiri: setiap
 * permintaan dan setiap jawabannya memang sudah harus tercatat sebagai jejak
 * audit, jadi menambah tabel kedua berarti menyimpan kebenaran yang sama di dua
 * tempat dan membuka peluang keduanya berbeda.
 *
 * "Belum dijawab" = ada JOIN_REQUEST yang tidak punya jawaban lebih baru.
 */
export async function pendingJoinRequests(
  roomId: string,
): Promise<Array<{ userId: string; name: string; avatar: string | null; requestedAt: string }>> {
  const res = await db.execute(
    `SELECT e.target_id, u.name, u.avatar_image AS avatar, MAX(e.created_at) AS requested_at
       FROM focus_room_events e
       JOIN users u ON u.id = e.target_id
      WHERE e.room_id = ? AND e.event_type = 'JOIN_REQUEST'
        AND NOT EXISTS (
          SELECT 1 FROM focus_room_events r
           WHERE r.room_id = e.room_id
             AND r.target_id = e.target_id
             AND r.event_type IN ('JOIN_APPROVED','JOIN_REJECTED')
             AND r.created_at >= e.created_at
        )
      GROUP BY e.target_id, u.name, u.avatar_image
      ORDER BY requested_at ASC
      LIMIT 20`,
    [roomId],
  );

  return res.rows.map((r: any) => ({
    userId: String(r.target_id),
    name: r.name ?? "Rekan",
    avatar: r.avatar ?? null,
    requestedAt: r.requested_at ? new Date(r.requested_at).toISOString() : new Date().toISOString(),
  }));
}

export async function isBanned(roomId: string, userId: string): Promise<boolean> {
  const res = await db.execute(
    "SELECT 1 FROM focus_room_bans WHERE room_id = ? AND user_id = ? LIMIT 1",
    [roomId, userId],
  );
  return res.rows.length > 0;
}

// ── Bentuk data untuk klien ─────────────────────────────────────────────────

/**
 * Ringkasan peserta yang aman dikirim ke semua orang di ruangan.
 *
 * Sengaja TIDAK memuat telemetri per detik. Manajer mendapat agregat, bukan
 * "Rina membuka HP jam 14:03" — itu surveilans, dan akan menghancurkan
 * kepercayaan pada fitur ini lebih cepat daripada bug mana pun.
 */
export function publicParticipant(p: ParticipantRow, room?: RoomRow) {
  // Berapa menit setelah sesi dimulai orang ini baru bergabung. Ditampilkan
  // sebagai label halus, bukan sebagai tuduhan: poinnya memang sudah dihitung
  // dari waktu ia benar-benar hadir, jadi ini murni transparansi.
  let joinedAtMin: number | null = null;
  if (room?.started_at && p.joined_session_at) {
    const delta = (toMs(p.joined_session_at) ?? 0) - (toMs(room.started_at) ?? 0);
    const mins = Math.floor(delta / 60000);
    if (mins >= 1) joinedAtMin = mins;
  }

  return {
    id: String(p.user_id),
    name: p.name ?? "Rekan",
    avatar: p.avatar ?? null,
    role: p.role,
    isHost: p.role === "host",
    status: p.status,
    focusedMins: Math.floor((Number(p.focused_secs) || 0) / 60),
    interruptsUsed: Number(p.interrupts_used) || 0,
    joinedAtMin,
    outcome: p.outcome,
    awardedPoints: p.awarded_points,
  };
}

export function publicRoom(
  room: RoomRow,
  participants: ParticipantRow[],
  viewerId?: string,
  /** Antrean permintaan masuk, sudah diambil pemanggil (lihat pendingJoinRequests). */
  pendingRequests?: Array<{ userId: string; name: string; avatar: string | null; requestedAt: string }>,
) {
  const active = participants.filter(isActive);
  const viewer = viewerId
    ? participants.find((p) => String(p.user_id) === String(viewerId))
    : undefined;
  const isMember = Boolean(viewer && isActive(viewer));
  const canModerate = viewer?.role === "host" || viewer?.role === "comod";

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    mode: room.mode,
    status: room.status,
    visibility: room.visibility,
    joinPolicy: room.join_policy,
    durationMins: Number(room.duration_mins) || 25,
    maxParticipants: Number(room.max_participants) || 8,
    startedAt: room.started_at ? new Date(room.started_at).toISOString() : null,
    // Klien menurunkan hitungan mundur dari sini. Tidak ada lagi durasi yang
    // dihitung ulang secara lokal dan menyimpang antar perangkat.
    endsAt: room.ends_at ? new Date(room.ends_at).toISOString() : null,
    serverNow: new Date().toISOString(),
    hostId: String(room.host_id),
    participantCount: active.length,
    participants: active.map((p) => publicParticipant(p, room)),
    // Kode hanya untuk orang yang sudah di dalam. Sebelumnya kode setiap
    // ruangan dikirim ke semua klien yang memuat lobby, sehingga "minta kode
    // dari host" hanyalah ritual kosong.
    joinCode: isMember ? room.join_code : null,
    // Antrean hanya untuk yang berwenang menjawabnya. Peserta biasa tidak perlu
    // tahu siapa saja yang pernah ditolak masuk.
    pendingRequests: canModerate ? (pendingRequests ?? []) : [],
    interruptBudget: interruptBudget(Number(room.duration_mins) || 25),
    viewer: viewer
      ? {
          role: viewer.role,
          status: viewer.status,
          focusedMins: Math.floor((Number(viewer.focused_secs) || 0) / 60),
          interruptsUsed: Number(viewer.interrupts_used) || 0,
          interruptSecs: Number(viewer.interrupt_secs) || 0,
          interruptedAt: viewer.interrupted_at
            ? new Date(viewer.interrupted_at).toISOString()
            : null,
          // Sukarela dan terdeteksi punya zona bebas berbeda (1.5×), jadi klien
          // harus tahu yang mana — kalau tidak, hitungan mundur yang
          // ditampilkan ke user bukan hitungan mundur yang dipakai server.
          interruptKind: viewer.interrupt_kind ?? null,
          graceSecs: graceSecsFor(room.mode, viewer.interrupt_kind ?? "detected"),
          /** Sisa total waktu interupsi sebelum sesi orang ini diselesaikan. */
          interruptSecsLeft: Math.max(
            0,
            interruptBudget(Number(room.duration_mins) || 25).totalSecs -
              (Number(viewer.interrupt_secs) || 0),
          ),
          outcome: viewer.outcome,
          awardedPoints: viewer.awarded_points,
        }
      : null,
  };
}
