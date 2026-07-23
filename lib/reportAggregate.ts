import { db } from "@/lib/db";

// Shared report aggregation used by the dashboard route AND the auto-recap crons.
// Returns team-level aggregates + per-person breakdown for a given scope & period.

export interface AggregateOpts {
  month: number;
  year: number;
  week?: number;               // 0 = semua minggu
  department?: string;         // 'all' | <name>
  userIds?: string[];          // explicit subset
  managerScope?: string | null; // limit to this manager's direct reports
}

export function getWorkingDaysInMonth(month: number, year: number): number {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) count++;
    date.setDate(date.getDate() + 1);
  }
  return count || 22;
}

export function emptyTeam() {
  return {
    headcount: 0, avgCompletion: 0, avgKpiScore: 0, avgQuality: 0, totalTasks: 0, tasksCompleted: 0,
    weekly: [], byKpi: [], byDivision: [], kpiHealth: { onTrack: 0, atRisk: 0, behind: 0, total: 0 },
    topPerformers: [], needsAttention: [],
  };
}

export async function aggregateReport(opts: AggregateOpts): Promise<{ team: any; people: any[] }> {
  const { month, year } = opts;
  const week = opts.week || 0;
  const department = opts.department || 'all';
  const userIdList = (opts.userIds || []).map(s => String(s).trim()).filter(Boolean);
  const managerScope = opts.managerScope || null;

  // ── 1. Users dalam cakupan ──
  const uParts: string[] = ['1=1'];
  const uArgs: any[] = [];
  if (managerScope) { uParts.push('u.manager_id = ?'); uArgs.push(managerScope); }
  if (userIdList.length) {
    uParts.push(`u.id IN (${userIdList.map(() => '?').join(',')})`);
    uArgs.push(...userIdList);
  } else if (department !== 'all') {
    uParts.push('u.department = ?');
    uArgs.push(department);
  }
  const usersRes = await db.execute({
    sql: `SELECT u.id, u.name, u.department, u.job_title, u.avatar_image
          FROM users u WHERE ${uParts.join(' AND ')} ORDER BY u.name ASC`,
    args: uArgs,
  });
  const users = usersRes.rows as any[];
  if (users.length === 0) return { team: emptyTeam(), people: [] };

  const ids = users.map(u => String(u.id));
  const inIds = ids.map(() => '?').join(',');
  const workingDays = getWorkingDaysInMonth(month, year);

  // ── 2. Task stats per user ──
  const tasksRes = await db.execute({
    sql: `SELECT user_id, COUNT(*) as total,
                 SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done,
                 COUNT(DISTINCT DATE(created_at)) as active_days
          FROM daily_priorities
          WHERE user_id IN (${inIds}) AND MONTH(created_at) = ? AND YEAR(created_at) = ?
          GROUP BY user_id`,
    args: [...ids, month, year],
  });
  const taskMap = new Map<string, any>();
  for (const r of tasksRes.rows as any[]) taskMap.set(String(r.user_id), r);

  // ── 3. Attendance per user ──
  const attMap = new Map<string, number>();
  try {
    const attRes = await db.execute({
      sql: `SELECT user_id, COUNT(*) as days FROM attendance
            WHERE user_id IN (${inIds}) AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?
            GROUP BY user_id`,
      args: [...ids, month, year],
    });
    for (const r of attRes.rows as any[]) attMap.set(String(r.user_id), Number(r.days) || 0);
  } catch { /* attendance table optional */ }

  // ── 4. Monthly KPIs ──
  const kpisRes = await db.execute({
    sql: `SELECT id, assigned_to, title, weight, final_score, status, kpi_type, metric_target, metric_current
          FROM monthly_kpis WHERE assigned_to IN (${inIds}) AND month = ? AND year = ?`,
    args: [...ids, month, year],
  });
  const kpiRows = kpisRes.rows as any[];
  const kpiIds = kpiRows.map(k => String(k.id));

  // ── 5. Weekly targets ──
  let wtRows: any[] = [];
  if (kpiIds.length) {
    const inKpis = kpiIds.map(() => '?').join(',');
    let wtSql = `SELECT id, kpi_id, week_number, title, target_value, current_value, metric_unit, status, timeframe
                 FROM weekly_targets WHERE kpi_id IN (${inKpis})`;
    const wtArgs: any[] = [...kpiIds];
    if (week > 0) { wtSql += ' AND week_number = ?'; wtArgs.push(week); }
    wtSql += ' ORDER BY week_number ASC';
    const wtRes = await db.execute({ sql: wtSql, args: wtArgs });
    wtRows = wtRes.rows as any[];
  }
  const wtByKpi = new Map<string, any[]>();
  for (const wt of wtRows) {
    const k = String(wt.kpi_id);
    (wtByKpi.get(k) || wtByKpi.set(k, []).get(k))!.push(wt);
  }

  // ── 5b. Progress target mingguan dari TASK (done=100, partial=sebagian) — sesuai logika GoalCard employee ──
  const wtTaskMap = new Map<string, { sum: number; cnt: number }>();
  if (wtRows.length) {
    const wtIds = wtRows.map(w => String(w.id));
    const inWt = wtIds.map(() => '?').join(',');
    const tRes = await db.execute({
      sql: `SELECT weekly_target_id, COUNT(*) as cnt,
                   SUM(CASE WHEN is_done = 1 THEN 100 ELSE COALESCE(partial_progress, 0) END) as sumprog
            FROM daily_priorities WHERE weekly_target_id IN (${inWt}) GROUP BY weekly_target_id`,
      args: wtIds,
    });
    for (const r of tRes.rows as any[]) wtTaskMap.set(String(r.weekly_target_id), { sum: Number(r.sumprog) || 0, cnt: Number(r.cnt) || 0 });
  }
  // Progress 1 target mingguan: dari task bila ada, else fallback current/target.
  const wtProgress = (wt: any): number => {
    const t = wtTaskMap.get(String(wt.id));
    if (t && t.cnt > 0) return Math.round(t.sum / t.cnt);
    const target = Number(wt.target_value) || 0, current = Number(wt.current_value) || 0;
    return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  };
  const kpisByUser = new Map<string, any[]>();
  for (const k of kpiRows) {
    const u = String(k.assigned_to);
    (kpisByUser.get(u) || kpisByUser.set(u, []).get(u))!.push(k);
  }

  const people = users.map(u => {
    const uid = String(u.id);
    const t = taskMap.get(uid) || {};
    const totalTasks = Number(t.total) || 0;
    const tasksCompleted = Number(t.done) || 0;
    const activeDays = Number(t.active_days) || 0;
    const attendanceDays = attMap.get(uid) || 0;
    const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const myKpis = (kpisByUser.get(uid) || []).map(k => {
      const wts = (wtByKpi.get(String(k.id)) || [])
        .sort((a, b) => Number(a.week_number) - Number(b.week_number))
        .map(wt => ({
          week: Number(wt.week_number), title: wt.title || '',
          target: Number(wt.target_value) || 0, current: Number(wt.current_value) || 0,
          unit: wt.metric_unit || '',
          // Durasi bebas per target; fallback ke label minggu kalau belum diisi.
          timeframe: wt.timeframe || (wt.week_number ? `Minggu ${wt.week_number}` : ''),
          achievement: wtProgress(wt),           // task-based (bukan current/target)
          status: wt.status || 'active',
        }));
      // Capaian KPI: rata-rata progress mingguan (task-based) > metric_current/target > 0.
      const metricTarget = Number(k.metric_target) || 0, metricCurrent = Number(k.metric_current) || 0;
      const achievement = wts.length
        ? Math.round(wts.reduce((s, w) => s + w.achievement, 0) / wts.length)
        : (k.kpi_type === 'metric' && metricTarget > 0 ? Math.min(100, Math.round((metricCurrent / metricTarget) * 100)) : 0);
      return {
        id: String(k.id), title: k.title || '', weight: Number(k.weight) || 0,
        finalScore: k.final_score != null ? Number(k.final_score) : null, // skor review manager (terpisah)
        status: k.status || '', achievement, weekly: wts,
      };
    });

    let weightedSum = 0, totalWeight = 0;
    for (const k of myKpis) { weightedSum += (k.achievement * k.weight) / 100; totalWeight += k.weight; }
    const kpiScore = totalWeight > 0 ? Math.round(weightedSum) : (myKpis.length ? Math.round(myKpis.reduce((s, k) => s + k.achievement, 0) / myKpis.length) : 0);

    const weekBuckets = new Map<number, number[]>();
    for (const k of myKpis) for (const w of k.weekly) {
      (weekBuckets.get(w.week) || weekBuckets.set(w.week, []).get(w.week))!.push(w.achievement);
    }
    const weekly = [...weekBuckets.entries()].sort((a, b) => a[0] - b[0]).map(([wk, arr]) => ({
      week: wk, avgAchievement: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length), targetCount: arr.length,
    }));

    // Daftar target datar (lintas KPI) untuk chart per-target: nama + kontribusi % + timeframe.
    const targets = myKpis.flatMap(k => k.weekly.map(w => ({
      kpiId: k.id, kpiTitle: k.title, title: w.title, timeframe: w.timeframe,
      achievement: w.achievement, target: w.target, current: w.current, unit: w.unit, status: w.status,
    })));

    const attendanceScore = Math.min(100, Math.round((attendanceDays / workingDays) * 100));
    const consistencyScore = Math.min(100, Math.round((Math.max(activeDays, attendanceDays) / workingDays) * 100));
    const qualityScore = Math.round(attendanceScore * 0.3 + completionRate * 0.4 + consistencyScore * 0.3);

    return {
      id: uid, name: u.name, department: u.department || 'Lainnya', jobTitle: u.job_title || '', avatarImage: u.avatar_image || null,
      totalTasks, tasksCompleted, completionRate,
      activeDays: Math.max(activeDays, attendanceDays), attendanceDays, workingDays,
      kpiScore, qualityScore, kpiCount: myKpis.length, kpis: myKpis, weekly, targets,
    };
  });

  const n = people.length;
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  const teamWeek = new Map<number, number[]>();
  for (const p of people) for (const w of p.weekly) {
    (teamWeek.get(w.week) || teamWeek.set(w.week, []).get(w.week))!.push(w.avgAchievement);
  }
  const divMap = new Map<string, { comp: number[]; kpi: number[] }>();
  for (const p of people) {
    const d = divMap.get(p.department) || divMap.set(p.department, { comp: [], kpi: [] }).get(p.department)!;
    d.comp.push(p.completionRate); d.kpi.push(p.kpiScore);
  }
  let onTrack = 0, atRisk = 0, behind = 0;
  for (const p of people) for (const k of p.kpis) {
    if (k.achievement >= 80) onTrack++; else if (k.achievement >= 50) atRisk++; else behind++;
  }
  // Capaian rata-rata per KPI (dikelompokkan by judul) — pengganti tren mingguan di level tim.
  const kpiTitleMap = new Map<string, number[]>();
  for (const p of people) for (const k of p.kpis) {
    (kpiTitleMap.get(k.title) || kpiTitleMap.set(k.title, []).get(k.title))!.push(k.achievement);
  }
  const byKpi = [...kpiTitleMap.entries()]
    .map(([title, arr]) => ({ title, avgAchievement: avg(arr), count: arr.length }))
    .sort((a, b) => b.avgAchievement - a.avgAchievement);

  const team = {
    headcount: n,
    avgCompletion: avg(people.map(p => p.completionRate)),
    avgKpiScore: avg(people.map(p => p.kpiScore)),
    avgQuality: avg(people.map(p => p.qualityScore)),
    totalTasks: people.reduce((s, p) => s + p.totalTasks, 0),
    tasksCompleted: people.reduce((s, p) => s + p.tasksCompleted, 0),
    weekly: [...teamWeek.entries()].sort((a, b) => a[0] - b[0]).map(([wk, arr]) => ({ week: wk, avgAchievement: avg(arr) })),
    byKpi,
    byDivision: [...divMap.entries()].map(([dept, v]) => ({
      department: dept, headcount: v.comp.length, avgCompletion: avg(v.comp), avgKpi: avg(v.kpi),
    })).sort((a, b) => b.avgKpi - a.avgKpi),
    kpiHealth: { onTrack, atRisk, behind, total: onTrack + atRisk + behind },
    topPerformers: [...people].sort((a, b) => b.kpiScore - a.kpiScore).slice(0, 3).map(p => ({ id: p.id, name: p.name, kpiScore: p.kpiScore })),
    needsAttention: [...people].filter(p => p.kpiScore < 50 || p.completionRate < 50).sort((a, b) => a.kpiScore - b.kpiScore).slice(0, 3).map(p => ({ id: p.id, name: p.name, kpiScore: p.kpiScore, completionRate: p.completionRate })),
  };

  return { team, people };
}
