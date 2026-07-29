import { db } from "@/lib/db";
import { calculateLevel, calculateRank } from "@/lib/xp";
import { SQL_WIB_TODAY, sqlWibDate, wibDateString } from "@/lib/timeUtils";
import {
  POINTS_ACTIONS,
  resolveAction,
  DAILY_SAFETY_CEILING,
  type PointsScope,
} from "@/lib/pointsConfig";

/**
 * ── Mesin ekonomi poin Flowbee ─────────────────────────────────────────────
 *
 * Nilai dan kuotanya ada di `lib/pointsConfig.ts` (aman untuk klien); file ini
 * yang menjalankannya terhadap database.
 *
 * Semua pemberian poin WAJIB lewat `awardPoints()`. Jangan pernah menulis
 * `UPDATE users SET points = points + ?` di route lain: itu melewati kuota,
 * kunci idempoten, dan ledger sekaligus — persis kesalahan yang membuat check-in
 * dan check-out dulu lolos dari semua batas.
 */

export * from "@/lib/pointsConfig";

// ── Pembentuk ref_id ────────────────────────────────────────────────────────

/**
 * Kunci idempoten default kalau pemanggil tidak mengirim `refId`.
 *
 * Untuk aksi ber-scope `daily` tanggal WIB sudah cukup dan benar, jadi
 * pemanggil lama (mood, tutup hari, check-in, napas) otomatis jadi
 * sekali-per-hari tanpa perlu diubah sama sekali.
 *
 * Untuk aksi `lifetime`/`monthly` kita tidak bisa menebak identitas kejadian,
 * jadi jatuh ke deskripsi + tanggal. Itu tetap mencegah pembayaran ganda dalam
 * satu hari, tapi pemanggilnya sebaiknya mengirim `refId` sungguhan.
 */
function defaultRefId(action: string, scope: PointsScope, description?: string): string {
  const today = wibDateString();
  if (scope === "daily") return today;
  if (scope === "monthly") return today.slice(0, 7);
  const slug = (description || action).toLowerCase().replace(/\s+/g, "-").slice(0, 60);
  return `${slug}:${today}`;
}

export const refFor = {
  task: (taskId: string | number) => `task:${taskId}`,
  taskApproval: (taskId: string | number) => `task:${taskId}:acc`,
  habit: (habitId: string | number, dateWib: string) => `habit:${habitId}:${dateWib}`,
  focus: (sessionId: string | number) => `focus:${sessionId}`,
  kudos: (kudosId: string) => `kudos:${kudosId}`,
  survey: (surveyId: string | number) => `survey:${surveyId}`,
  learning: (moduleId: string | number) => `module:${moduleId}`,
  nudge: (missionId: string, dateWib: string) => `nudge:${missionId}:${dateWib}`,
  kpi: (kpiId: string | number, period: string) => `kpi:${kpiId}:${period}`,
  // Tanggal ikut jadi bagian kunci supaya milestone streak bisa diraih lagi
  // setelah putus dan dibangun ulang. Kunci seumur hidup (`streak:5` saja)
  // berarti sekali streak putus, konsistensi berikutnya tidak pernah dihargai
  // lagi — menghukum orang yang bangkit, bukan yang menyerah.
  //
  // Tidak bisa diperah: mencapai streak 5 lagi menuntut 5 hari kerja berturut
  // dari nol, jadi rata-ratanya tetap 5 poin/hari.
  streak: (days: number, dateWib: string) => `streak:${days}:${dateWib}`,
  monthly: (month: string) => month,
  day: (dateWib: string) => dateWib,
};

// ── Hasil pemberian poin ────────────────────────────────────────────────────

export type AwardStatus =
  | "awarded"
  | "already_awarded"
  | "quota_full"
  | "no_value"
  | "unknown_action"
  | "ceiling";

export interface AwardResult {
  success: boolean;
  status: AwardStatus;
  awarded: number;
  action: string;
  refId: string;
  message: string;
  quota: { used: number; limit: number | null };
  /** Selalu saldo sebenarnya, bahkan saat tidak ada poin diberikan. */
  newTotal: number;
  newCoins: number;
  level: number;
  rank: string;
}

async function currentBalance(userId: string) {
  const res = await db.execute({
    sql: "SELECT points, coins, level, `rank` FROM users WHERE id = ?",
    args: [userId],
  });
  const row = res.rows[0] || {};
  const points = Number(row.points) || 0;
  return {
    points,
    coins: Number(row.coins) || 0,
    level: Number(row.level) || calculateLevel(points),
    rank: (row.rank as string) || calculateRank(calculateLevel(points)),
  };
}

/**
 * Berapa slot kuota yang terpakai hari ini untuk satu aksi.
 *
 * Yang dihitung adalah slot yang BELUM dibatalkan. Membatalkan sesuatu
 * mengembalikan slotnya, dan itu memang disengaja: salah klik tidak boleh
 * menghanguskan jatah. Tetap tidak bisa diperah, karena `ref_id` yang sudah
 * terpakai tidak akan pernah dibayar lagi — slot yang kembali hanya berguna
 * untuk kejadian yang benar-benar baru.
 */
async function quotaUsedToday(userId: string, action: string): Promise<number> {
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS used
            FROM xp_transactions e
           WHERE e.user_id = ?
             AND e.action_type = ?
             AND e.kind = 'earn'
             AND ${sqlWibDate("e.created_at")} = ${SQL_WIB_TODAY}
             AND NOT EXISTS (
                   SELECT 1 FROM xp_transactions r
                    WHERE r.user_id = e.user_id
                      AND r.action_type = e.action_type
                      AND r.ref_id = e.ref_id
                      AND r.kind = 'reversal'
                 )`,
    args: [userId, action],
  });
  return Number(res.rows[0]?.used) || 0;
}

/**
 * Total poin yang sudah didapat hari ini dari satu aksi, bersih setelah
 * pembatalan. Dipakai untuk `dailyPointCap` — beda dari `quotaUsedToday()`,
 * yang menghitung SLOT, bukan besarannya.
 */
async function pointsEarnedTodayFor(userId: string, action: string): Promise<number> {
  const res = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total
            FROM xp_transactions
           WHERE user_id = ?
             AND action_type = ?
             AND ${sqlWibDate("created_at")} = ${SQL_WIB_TODAY}`,
    args: [userId, action],
  });
  return Number(res.rows[0]?.total) || 0;
}

/**
 * Berapa kali persetujuan sebuah task pernah dibatalkan.
 *
 * Dipakai untuk menomori putaran review. Tanpa ini, siklus
 * tolak → revisi → ACC berakhir nol poin: kunci `task:<id>:acc` sudah terpakai
 * di putaran pertama, jadi persetujuan berikutnya selalu dianggap "sudah
 * dibayar". Task yang sah diperbaiki lalu disetujui tidak boleh berakhir tanpa
 * bayaran hanya karena sempat ditolak sekali.
 */
export async function taskReviewRound(userId: string, taskId: string | number): Promise<number> {
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM xp_transactions
           WHERE user_id = ? AND action_type = 'task_approved'
             AND kind = 'reversal' AND ref_id LIKE ?`,
    args: [userId, `task:${taskId}:acc%`],
  });
  return Number(res.rows[0]?.c) || 0;
}

/** Kunci persetujuan untuk putaran review ke-`round` (0 = putaran pertama). */
export function taskApprovalRef(taskId: string | number, round: number): string {
  return round === 0 ? `task:${taskId}:acc` : `task:${taskId}:acc:r${round}`;
}

async function earnedToday(userId: string): Promise<number> {
  const res = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) AS total
            FROM xp_transactions
           WHERE user_id = ?
             AND ${sqlWibDate("created_at")} = ${SQL_WIB_TODAY}`,
    args: [userId],
  });
  return Number(res.rows[0]?.total) || 0;
}

/**
 * Sinkronkan level & rank dengan saldo poin sebenarnya.
 *
 * Dipanggil pada SETIAP perubahan saldo, naik maupun turun. Sebelumnya level
 * hanya ditulis saat naik, sehingga rank hasil poin yang kemudian dibatalkan
 * tetap menempel selamanya.
 */
async function syncLevelAndRank(userId: string, points: number) {
  const level = calculateLevel(points);
  const rank = calculateRank(level);
  await db.execute({
    sql: "UPDATE users SET level = ?, `rank` = ? WHERE id = ?",
    args: [level, rank, userId],
  });
  return { level, rank };
}

function isDuplicateKey(error: any): boolean {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
}

/**
 * Satu-satunya pintu pemberian poin.
 *
 * Aman dipanggil berkali-kali dengan `refId` yang sama — panggilan kedua dan
 * seterusnya mengembalikan `already_awarded` tanpa menambah poin dan tanpa
 * membakar kuota.
 */
export async function awardPoints(opts: {
  userId: string;
  action: string;
  refId?: string;
  description?: string;
  /** Untuk aksi bernilai variabel yang nilainya ditentukan server, bukan klien. */
  overrideValue?: number;
}): Promise<AwardResult> {
  const { userId, description } = opts;

  const action = resolveAction(opts.action);
  if (!action) {
    const bal = await currentBalance(userId);
    return {
      success: false, status: "unknown_action", awarded: 0,
      action: opts.action, refId: "",
      message: `Aksi tidak dikenal: ${opts.action}`,
      quota: { used: 0, limit: null },
      newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
    };
  }

  const spec = POINTS_ACTIONS[action];
  const refId = opts.refId || defaultRefId(action, spec.scope, description);
  const value = opts.overrideValue ?? spec.value;

  const base = {
    success: true as const,
    action,
    refId,
    quota: { used: 0, limit: spec.dailyQuota },
  };

  // Aksi tanpa nilai (mis. check-in terlambat, coworking yang belum aktif):
  // tidak ditulis ke ledger sama sekali supaya tidak mengotori penghitung kuota.
  if (value <= 0) {
    const bal = await currentBalance(userId);
    return {
      ...base, status: "no_value", awarded: 0,
      message: "Tercatat, tanpa poin.",
      newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
    };
  }

  // ── Lapis 1: kunci idempoten ──
  // Dicek sebelum kuota. Kalau dibalik, mengulang aksi lama akan memakan jatah
  // aksi baru.
  const existing = await db.execute({
    sql: `SELECT id FROM xp_transactions
           WHERE user_id = ? AND action_type = ? AND ref_id = ? AND kind = 'earn'
           LIMIT 1`,
    args: [userId, action, refId],
  });

  if (existing.rows.length > 0) {
    const bal = await currentBalance(userId);
    const used = spec.dailyQuota ? await quotaUsedToday(userId, action) : 0;
    return {
      ...base, status: "already_awarded", awarded: 0,
      quota: { used, limit: spec.dailyQuota },
      message: "Sudah dihitung sebelumnya.",
      newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
    };
  }

  // ── Lapis 2: kuota harian ──
  let used = 0;
  if (spec.dailyQuota !== null) {
    used = await quotaUsedToday(userId, action);
    if (used >= spec.dailyQuota) {
      const bal = await currentBalance(userId);
      // Kuota membatasi poin, bukan catatan aktivitasnya. Tanpa baris ini pesan
      // "Progresmu tetap tercatat" itu bohong: task keenam yang diselesaikan
      // dalam satu hari tidak muncul di logbook mana pun — padahal itulah yang
      // dibaca manager dan HR di MemberLogbookModal. Aman dari duplikat karena
      // pemeriksaan idempoten di atas sudah menyaring pengulangan aksi yang sama.
      await writeLogbook(userId, action, description, 0);
      return {
        ...base, status: "quota_full", awarded: 0,
        quota: { used, limit: spec.dailyQuota },
        message: `Kuota poin ${spec.label.toLowerCase()} hari ini sudah penuh (${used}/${spec.dailyQuota}). Progresmu tetap tercatat.`,
        newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
      };
    }
  }

  // ── Lapis 2b: plafon poin harian untuk aksi bernilai variabel ──
  //
  // Kuota slot membatasi berapa KALI, bukan berapa BESAR. Untuk sesi fokus yang
  // dibayar proporsional terhadap menit, satu sesi bisa bernilai 13 atau 90
  // poin — sehingga "3 slot" berarti antara 39 dan 270 poin, dan praktis tidak
  // membatasi apa pun. Plafon ini yang menutupnya.
  //
  // Kelebihannya dipotong, bukan ditolak: orang yang sudah fokus 2 jam lalu
  // menyelesaikan sesi ketiga tetap menerima sisa jatahnya, bukan nol.
  let cappedValue = value;
  if (spec.dailyPointCap !== undefined) {
    const earnedForAction = await pointsEarnedTodayFor(userId, action);
    const remaining = spec.dailyPointCap - earnedForAction;

    if (remaining <= 0) {
      const bal = await currentBalance(userId);
      await writeLogbook(userId, action, description, 0);
      return {
        ...base, status: "quota_full", awarded: 0,
        quota: { used, limit: spec.dailyQuota },
        message: `Kuota poin ${spec.label.toLowerCase()} hari ini sudah penuh. Progresmu tetap tercatat.`,
        newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
      };
    }
    cappedValue = Math.min(value, remaining);
  }

  // ── Pemutus arus ──
  // Tidak seharusnya pernah menyala. Kalau menyala, ada jalur yang lolos kuota.
  const todayTotal = await earnedToday(userId);
  if (todayTotal + cappedValue > DAILY_SAFETY_CEILING) {
    console.warn(
      `[points] Pemutus arus menyala untuk user ${userId}: ${todayTotal} + ${cappedValue} > ${DAILY_SAFETY_CEILING} (aksi: ${action}). ` +
      `Ini menandakan ada jalur pemberian poin yang melewati kuota — perlu diselidiki.`,
    );
    const bal = await currentBalance(userId);
    // Sama seperti kuota penuh: pemutus arus menahan poin, bukan jejak kerjanya.
    await writeLogbook(userId, action, description, 0);
    return {
      ...base, status: "ceiling", awarded: 0,
      quota: { used, limit: spec.dailyQuota },
      message: "Batas harian tercapai. Aktivitasmu tetap tercatat.",
      newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
    };
  }

  // ── Tulis ledger + saldo secara atomik ──
  const txId = "tx_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  try {
    await db.transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO xp_transactions (id, user_id, amount, action_type, ref_id, kind, description)
         VALUES (?, ?, ?, ?, ?, 'earn', ?)`,
        [txId, userId, cappedValue, action, refId, description || spec.label],
      );
      // Koin bertambah bersamaan dengan poin, tapi keduanya kolom terpisah:
      // `points` akumulasi seumur hidup untuk level/rank, `coins` saldo yang
      // dibelanjakan. Menulis `coins = points + ?` (bug lama) mengembalikan
      // seluruh koin yang sudah ditukar.
      await conn.execute(
        "UPDATE users SET points = points + ?, coins = coins + ? WHERE id = ?",
        [cappedValue, cappedValue, userId],
      );
    });
  } catch (error: any) {
    // Kunci unik menangkap balapan dua permintaan bersamaan dengan ref_id sama.
    if (isDuplicateKey(error)) {
      const bal = await currentBalance(userId);
      return {
        ...base, status: "already_awarded", awarded: 0,
        quota: { used, limit: spec.dailyQuota },
        message: "Sudah dihitung sebelumnya.",
        newTotal: bal.points, newCoins: bal.coins, level: bal.level, rank: bal.rank,
      };
    }
    throw error;
  }

  const bal = await currentBalance(userId);
  const { level, rank } = await syncLevelAndRank(userId, bal.points);

  await writeLogbook(userId, action, description, cappedValue);

  return {
    ...base, status: "awarded", awarded: cappedValue,
    quota: { used: used + 1, limit: spec.dailyQuota },
    message: `+${cappedValue} Poin`,
    newTotal: bal.points, newCoins: bal.coins, level, rank,
  };
}

/**
 * Membatalkan poin yang pernah diberikan.
 *
 * Ledger bersifat append-only: pembalikan ditulis sebagai baris baru bernilai
 * negatif, TIDAK pernah menghapus baris asli. Menghapusnya (perilaku lama)
 * berarti memutar mundur penghitung kuota, sehingga cap harian bisa direset
 * sendiri dengan membatalkan pekerjaan.
 *
 * Baris `earn` yang tetap ada itulah yang membuat aksi sama tidak bisa dibayar
 * dua kali, berapa kali pun dibatalkan lalu diulang.
 */
export async function reversePoints(opts: {
  userId: string;
  action: string;
  refId: string;
  reason?: string;
}): Promise<{ success: boolean; reversed: number; newTotal: number; newCoins: number }> {
  const { userId, refId, reason } = opts;
  const action = resolveAction(opts.action);

  if (!action) {
    const bal = await currentBalance(userId);
    return { success: false, reversed: 0, newTotal: bal.points, newCoins: bal.coins };
  }

  const earn = await db.execute({
    sql: `SELECT amount FROM xp_transactions
           WHERE user_id = ? AND action_type = ? AND ref_id = ? AND kind = 'earn'
           LIMIT 1`,
    args: [userId, action, refId],
  });

  if (earn.rows.length === 0) {
    const bal = await currentBalance(userId);
    return { success: true, reversed: 0, newTotal: bal.points, newCoins: bal.coins };
  }

  const amount = Number(earn.rows[0].amount) || 0;
  const txId = "rv_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  try {
    await db.transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO xp_transactions (id, user_id, amount, action_type, ref_id, kind, description)
         VALUES (?, ?, ?, ?, ?, 'reversal', ?)`,
        [txId, userId, -amount, action, refId, reason || `Dibatalkan: ${POINTS_ACTIONS[action].label}`],
      );
      // GREATEST menjaga saldo tidak pernah negatif kalau koin sudah terlanjur
      // dibelanjakan sebelum pembatalan terjadi.
      await conn.execute(
        "UPDATE users SET points = GREATEST(0, points - ?), coins = GREATEST(0, coins - ?) WHERE id = ?",
        [amount, amount, userId],
      );
    });
  } catch (error: any) {
    // Sudah pernah dibatalkan — kunci unik menolak baris kedua.
    if (isDuplicateKey(error)) {
      const bal = await currentBalance(userId);
      return { success: true, reversed: 0, newTotal: bal.points, newCoins: bal.coins };
    }
    throw error;
  }

  const bal = await currentBalance(userId);
  await syncLevelAndRank(userId, bal.points);

  return { success: true, reversed: amount, newTotal: bal.points, newCoins: bal.coins };
}

/**
 * Memotong poin sebagai penalti (mis. tidak aktif berhari-hari).
 *
 * Beda dari `reversePoints`, yang membatalkan satu kejadian tertentu. Penalti
 * adalah entri negatif berdiri sendiri — tapi tetap lewat sini supaya ledger
 * utuh dan level/rank ikut turun. Pemotongan langsung ke tabel `users`
 * membiarkan level menempel di angka lama, jadi seseorang bisa kehilangan poin
 * tanpa kehilangan pangkat yang dibelinya.
 *
 * `refId` membuat penalti idempoten: satu penalti per user per hari, walau cron
 * berjalan dua kali.
 */
export async function applyPenalty(opts: {
  userId: string;
  amount: number;
  refId: string;
  reason: string;
}): Promise<{ applied: number; newTotal: number }> {
  const { userId, refId, reason } = opts;
  const bal = await currentBalance(userId);

  // Saldo tidak boleh negatif — penalti dipotong sebesar yang tersedia saja.
  const amount = Math.min(Math.max(0, Math.round(opts.amount)), bal.points);
  if (amount <= 0) return { applied: 0, newTotal: bal.points };

  const txId = "pn_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  try {
    await db.transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO xp_transactions (id, user_id, amount, action_type, ref_id, kind, description)
         VALUES (?, ?, ?, 'penalty_inactive', ?, 'reversal', ?)`,
        [txId, userId, -amount, refId, reason],
      );
      await conn.execute(
        "UPDATE users SET points = GREATEST(0, points - ?), coins = GREATEST(0, coins - ?) WHERE id = ?",
        [amount, amount, userId],
      );
    });
  } catch (error: any) {
    if (isDuplicateKey(error)) return { applied: 0, newTotal: bal.points };
    throw error;
  }

  const after = await currentBalance(userId);
  await syncLevelAndRank(userId, after.points);
  return { applied: amount, newTotal: after.points };
}

async function writeLogbook(
  userId: string,
  action: string,
  description: string | undefined,
  amount: number,
) {
  try {
    const spec = POINTS_ACTIONS[action];
    const logId = "log_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    await db.execute({
      sql: `INSERT INTO logbook_entries (id, user_id, type, title, description, xp_earned, created_at)
            VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      args: [
        logId, userId, spec.logbook.type,
        `${spec.logbook.emoji} ${description || spec.label}`,
        description || spec.label, amount,
      ],
    });
  } catch (e) {
    console.warn("[points] Gagal menulis logbook:", e);
  }
}

/**
 * Sisa kuota hari ini untuk sekumpulan aksi — untuk penghitung hidup di widget
 * ("Task hari ini 3/5"). Kuota ditampilkan di tempat aksinya dikerjakan, bukan
 * sebagai tabel plafon di guide.
 */
export async function quotaStatus(
  userId: string,
  actions: string[],
): Promise<Record<string, { used: number; limit: number | null; value: number }>> {
  const out: Record<string, { used: number; limit: number | null; value: number }> = {};
  for (const raw of actions) {
    const action = resolveAction(raw);
    if (!action) continue;
    const spec = POINTS_ACTIONS[action];
    out[action] = {
      used: spec.dailyQuota === null ? 0 : await quotaUsedToday(userId, action),
      limit: spec.dailyQuota,
      value: spec.value,
    };
  }
  return out;
}
