import { db } from "@/lib/db";
import { sqlWibDate, sqlTaskWibDay, SQL_WIB_TODAY } from "@/lib/timeUtils";
import { AWAITING_REVIEW_SQL } from "@/lib/taskStatus";

/**
 * Satu sumber untuk seluruh agregat dashboard HR.
 *
 * ── Kenapa modul ini ada ────────────────────────────────────────────────────
 *
 * Logika ini pernah hidup di DUA tempat sekaligus: `/api/hr/dashboard` dan
 * cabang HR di dalam `/api/ext/sync`. Bukan diimpor — disalin. Keduanya sudah
 * terbukti menyimpang: saat kolom tanggal hitungan task diperbaiki, tambalannya
 * harus dikerjakan dua kali, dan `awaitingReview` sempat hanya ada di salah
 * satunya. Setiap perbaikan berikutnya akan mengulang risiko yang sama.
 *
 * ── Kenapa jumlah query-nya tetap ───────────────────────────────────────────
 *
 * Versi lama menghitung `deptPulse` dengan tiga query PER DEPARTEMEN. Untuk 10
 * departemen itu 30 query, dan dashboard ini dipanggil ulang oleh setiap sync
 * ekstensi — tiap 30 detik, per tab. Di sini agregat per departemen diambil
 * sekali lewat GROUP BY, lalu dipasangkan di memori.
 *
 * Hasilnya jumlah query tidak lagi bergantung pada jumlah karyawan MAUPUN
 * jumlah departemen. Sekitar 15 query, berapa pun besar perusahaannya.
 *
 * Rata-rata mood juga dihitung di SQL, bukan dengan menarik setiap baris
 * check-in ke memori lalu me-reduce-nya — untuk 65 orang selama 7 hari itu
 * ratusan baris yang hanya dipakai untuk satu angka.
 */

const MOOD_VALUES: Record<string, number> = {
  joy: 100, calm: 85, neutral: 65, tired: 40, stress: 20,
};

/** Rata-rata berbobot dari hasil `GROUP BY mood_key`. */
function moodAverage(rows: Array<Record<string, unknown>>): number {
  let total = 0;
  let count = 0;
  for (const r of rows) {
    const n = Number(r.c) || 0;
    total += (MOOD_VALUES[String(r.mood_key)] ?? 50) * n;
    count += n;
  }
  return count > 0 ? Math.round(total / count) : 0;
}

const MOOD_TALLY_SQL = `SELECT mood_key, COUNT(*) AS c FROM mood_checkins`;

export interface HrDeptPulse {
  dept: string;
  wellbeing: number;
  engagement: number;
  awaitingReview: number;
  headcount: number;
  atRisk: number;
  tone: string;
}

export interface HrAtRisk {
  id: string; name: string; role: string; dept: string;
  wellbeing: number; mood: string; completionRate: number; risk: string;
}

export interface HrMember {
  id: string; name: string; role: string; dept: string;
  mood: string; wellbeing: number;
  tasks: { done: number; total: number };
}

export interface HrDashboardData {
  metrics: {
    totalEmployees: number;
    engagementScore: number;
    engagementTrend: string;
    wellbeingAvg: number;
    wellbeingTrend: string;
    atRisk: number;
    atRiskTrend: string;
    awaitingReview: number;
    kpiOverview: { avgScore: number; totalKpis: number; completed: number };
  };
  atRiskEmployees: HrAtRisk[];
  deptPulse: HrDeptPulse[];
  members: HrMember[];
  programs: Array<Record<string, unknown>>;
}

export async function buildHrDashboard(): Promise<HrDashboardData> {
  // Kolom yang dipakai saja. `SELECT u.*` ikut menarik `wellbeing_routine`,
  // `avatar_image`, dan setiap kolom lain untuk SETIAP karyawan — muatan besar
  // yang hampir seluruhnya dibuang sebelum dikirim.
  const usersRes = await db.execute(
    "SELECT id, name, job_title, department FROM users"
  );
  const users = usersRes.rows;
  const totalEmployees = users.length;

  // ── Agregat se-perusahaan ────────────────────────────────────────────────
  const [thisMonth, lastMonth, moods7, moods14, awaitingAll] = await Promise.all([
    db.execute(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
       FROM daily_priorities
       WHERE MONTH(${sqlTaskWibDay()}) = MONTH(${SQL_WIB_TODAY})
         AND YEAR(${sqlTaskWibDay()}) = YEAR(${SQL_WIB_TODAY})`
    ),
    db.execute(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
       FROM daily_priorities
       WHERE MONTH(${sqlTaskWibDay()}) = MONTH(DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 1 MONTH))
         AND YEAR(${sqlTaskWibDay()}) = YEAR(DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 1 MONTH))`
    ),
    db.execute(
      `${MOOD_TALLY_SQL}
       WHERE ${sqlWibDate("created_at")} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)
       GROUP BY mood_key`
    ),
    db.execute(
      `${MOOD_TALLY_SQL}
       WHERE ${sqlWibDate("created_at")}
             BETWEEN DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 14 DAY)
                 AND DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)
       GROUP BY mood_key`
    ),
    /*
     * Dihitung lewat query sendiri, BUKAN menjumlahkan angka per divisi:
     * penjumlahan itu akan melewatkan setiap orang yang belum punya divisi —
     * justru kelompok yang paling perlu terlihat, karena pekerjaan mereka tidak
     * masuk antrean ACC manajer mana pun.
     */
    db.execute(
      `SELECT COUNT(*) AS c FROM daily_priorities dp WHERE ${AWAITING_REVIEW_SQL}`
    ),
  ]);

  const totalTasks = Number(thisMonth.rows[0]?.total) || 1;
  const doneTasks = Number(thisMonth.rows[0]?.done) || 0;
  const engagementScore = Math.min(100, Math.round((doneTasks / totalTasks) * 100));

  const lastTotal = Number(lastMonth.rows[0]?.total) || 1;
  const lastDone = Number(lastMonth.rows[0]?.done) || 0;
  const engagementTrend = engagementScore - Math.round((lastDone / lastTotal) * 100);

  const wellbeingAvg = moodAverage(moods7.rows);
  const wellbeingTrend = wellbeingAvg - moodAverage(moods14.rows);
  const awaitingReview = Number(awaitingAll.rows[0]?.c) || 0;

  // ── Agregat per orang ────────────────────────────────────────────────────
  const [latestMoodRes, weekStatsRes, todayStatsRes] = await Promise.all([
    db.execute(
      `SELECT mc.user_id, mc.mood_key
       FROM mood_checkins mc
       JOIN (
         SELECT user_id, MAX(created_at) AS latest
         FROM mood_checkins GROUP BY user_id
       ) newest ON newest.user_id = mc.user_id AND newest.latest = mc.created_at`
    ),
    db.execute(
      `SELECT user_id, COUNT(*) AS total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
       FROM daily_priorities
       WHERE ${sqlTaskWibDay()} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)
       GROUP BY user_id`
    ),
    db.execute(
      `SELECT user_id, COUNT(*) AS total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
       FROM daily_priorities
       WHERE ${sqlTaskWibDay()} = ${SQL_WIB_TODAY}
       GROUP BY user_id`
    ),
  ]);

  const moodByUser = new Map<string, string>();
  for (const r of latestMoodRes.rows) {
    // Kalau ada dua check-in dengan created_at identik, yang pertama menang —
    // sama seperti LIMIT 1 pada versi sebelumnya.
    if (!moodByUser.has(String(r.user_id))) {
      moodByUser.set(String(r.user_id), String(r.mood_key || "neutral"));
    }
  }

  const toStats = (rows: Array<Record<string, unknown>>) => {
    const m = new Map<string, { total: number; done: number }>();
    for (const r of rows) {
      m.set(String(r.user_id), { total: Number(r.total) || 0, done: Number(r.done) || 0 });
    }
    return m;
  };
  const weekStats = toStats(weekStatsRes.rows);
  const todayStats = toStats(todayStatsRes.rows);

  const atRiskEmployees: HrAtRisk[] = [];
  const members: HrMember[] = [];
  const atRiskIds = new Set<string>();

  for (const u of users) {
    const uid = String(u.id);
    const mood = moodByUser.get(uid) || "neutral";
    const dept = String(u.department || "") || "Unassigned";

    const week = weekStats.get(uid) || { total: 0, done: 0 };
    const completionRate = week.total > 0 ? Math.round((week.done / week.total) * 100) : 0;

    if (mood === "stress" || mood === "tired" || (week.total > 0 && completionRate < 30)) {
      atRiskEmployees.push({
        id: uid,
        name: String(u.name),
        role: String(u.job_title || ""),
        dept,
        wellbeing: MOOD_VALUES[mood] || 50,
        mood,
        completionRate,
        risk: mood === "stress" ? "high" : "medium",
      });
      atRiskIds.add(uid);
    }

    const today = todayStats.get(uid) || { total: 0, done: 0 };
    members.push({
      id: uid,
      name: String(u.name),
      role: String(u.job_title || "Employee"),
      dept,
      mood,
      wellbeing: MOOD_VALUES[mood] || 50,
      tasks: { done: today.done, total: today.total },
    });
  }

  // ── Agregat per departemen, tanpa query per departemen ───────────────────
  //
  // Ketiganya di-JOIN ke `users` supaya pengelompokannya dilakukan database,
  // bukan dengan mengulang query untuk tiap nama departemen.
  const [deptsRes, deptTasksRes, deptMoodsRes, deptAwaitingRes] = await Promise.all([
    db.execute("SELECT name FROM departments"),
    db.execute(
      `SELECT u.department AS dept, COUNT(*) AS total,
              SUM(CASE WHEN dp.is_done = 1 THEN 1 ELSE 0 END) AS done
       FROM daily_priorities dp JOIN users u ON u.id = dp.user_id
       WHERE MONTH(${sqlTaskWibDay("dp")}) = MONTH(${SQL_WIB_TODAY})
       GROUP BY u.department`
    ),
    db.execute(
      `SELECT u.department AS dept, mc.mood_key, COUNT(*) AS c
       FROM mood_checkins mc JOIN users u ON u.id = mc.user_id
       WHERE ${sqlWibDate("mc.created_at")} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)
       GROUP BY u.department, mc.mood_key`
    ),
    db.execute(
      `SELECT u.department AS dept, COUNT(*) AS c
       FROM daily_priorities dp JOIN users u ON u.id = dp.user_id
       WHERE ${AWAITING_REVIEW_SQL}
       GROUP BY u.department`
    ),
  ]);

  const headcountByDept = new Map<string, number>();
  const atRiskByDept = new Map<string, number>();
  for (const u of users) {
    const d = String(u.department || "");
    headcountByDept.set(d, (headcountByDept.get(d) || 0) + 1);
    if (atRiskIds.has(String(u.id))) {
      atRiskByDept.set(d, (atRiskByDept.get(d) || 0) + 1);
    }
  }

  const taskByDept = new Map<string, { total: number; done: number }>();
  for (const r of deptTasksRes.rows) {
    taskByDept.set(String(r.dept || ""), {
      total: Number(r.total) || 0,
      done: Number(r.done) || 0,
    });
  }

  const moodRowsByDept = new Map<string, Array<Record<string, unknown>>>();
  for (const r of deptMoodsRes.rows) {
    const d = String(r.dept || "");
    if (!moodRowsByDept.has(d)) moodRowsByDept.set(d, []);
    moodRowsByDept.get(d)!.push(r);
  }

  const awaitingByDept = new Map<string, number>();
  for (const r of deptAwaitingRes.rows) {
    awaitingByDept.set(String(r.dept || ""), Number(r.c) || 0);
  }

  const deptPulse: HrDeptPulse[] = deptsRes.rows.map((t) => {
    const name = String(t.name);
    const headcount = headcountByDept.get(name) || 0;
    if (headcount === 0) {
      return { dept: name, wellbeing: 0, engagement: 0, awaitingReview: 0, headcount: 0, atRisk: 0, tone: "sage" };
    }

    const tasks = taskByDept.get(name) || { total: 0, done: 0 };
    // `|| 1` mempertahankan perilaku lama: divisi tanpa task tercatat 0%, bukan
    // pembagian dengan nol.
    const engagement = Math.round((tasks.done / (tasks.total || 1)) * 100);
    const wellbeing = moodAverage(moodRowsByDept.get(name) || []);

    return {
      dept: name,
      wellbeing,
      engagement,
      awaitingReview: awaitingByDept.get(name) || 0,
      headcount,
      atRisk: atRiskByDept.get(name) || 0,
      tone: wellbeing > 70 ? "sage" : wellbeing > 40 ? "yellow" : "coral",
    };
  });

  // ── Tambahan yang boleh kosong ───────────────────────────────────────────
  let programs: Array<Record<string, unknown>> = [];
  try {
    const learningRes = await db.execute("SELECT id, title, tone FROM learning_items");
    programs = learningRes.rows.map((r) => ({
      id: r.id, title: r.title, enrolled: 0, completed: 0, tone: r.tone || "blue",
    }));
  } catch {
    /* learning_items boleh belum ada */
  }

  let kpiOverview = { avgScore: 0, totalKpis: 0, completed: 0 };
  try {
    const now = new Date();
    const kpiRes = await db.execute({
      sql: `SELECT COUNT(*) AS total,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                   AVG(final_score) AS avg_score
            FROM monthly_kpis WHERE month = ? AND year = ?`,
      args: [now.getMonth() + 1, now.getFullYear()],
    });
    kpiOverview = {
      totalKpis: Number(kpiRes.rows[0]?.total) || 0,
      completed: Number(kpiRes.rows[0]?.completed) || 0,
      avgScore: Math.round(Number(kpiRes.rows[0]?.avg_score) || 0),
    };
  } catch {
    /* monthly_kpis boleh kosong */
  }

  return {
    metrics: {
      totalEmployees,
      engagementScore,
      engagementTrend: (engagementTrend >= 0 ? "+" : "") + engagementTrend,
      wellbeingAvg,
      wellbeingTrend: (wellbeingTrend >= 0 ? "+" : "") + wellbeingTrend,
      atRisk: atRiskEmployees.length,
      atRiskTrend: "0",
      awaitingReview,
      kpiOverview,
    },
    atRiskEmployees,
    deptPulse,
    members,
    programs,
  };
}
