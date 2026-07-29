import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sqlWibDate, SQL_WIB_TODAY } from '@/lib/timeUtils';

const MOOD_VALUES: Record<string, number> = { joy: 100, calm: 85, neutral: 65, tired: 40, stress: 20 };

export async function GET() {
  try {
    // 1. Fetch all users
    const usersRes = await db.execute("SELECT u.*, u.department as team_name FROM users u");
    const users = usersRes.rows;
    const totalEmployees = users.length;

    // 2. Engagement Score = avg(tasks_done / tasks_total) across all users this month
    const taskStatsRes = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM daily_priorities 
       WHERE MONTH(${sqlWibDate('created_at')}) = MONTH(${SQL_WIB_TODAY})
         AND YEAR(${sqlWibDate('created_at')}) = YEAR(${SQL_WIB_TODAY})`
    );
    const totalTasks = Number(taskStatsRes.rows[0]?.total) || 1;
    const doneTasks = Number(taskStatsRes.rows[0]?.done) || 0;
    const engagementScore = Math.min(100, Math.round((doneTasks / totalTasks) * 100));

    // 3. Wellbeing = average mood from last 7 days (real data)
    const moodsRes = await db.execute(
      `SELECT mood_key FROM mood_checkins
       WHERE ${sqlWibDate('created_at')} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)`
    );
    const wellbeingAvg = moodsRes.rows.length > 0 
      ? Math.round(moodsRes.rows.reduce((acc, m) => acc + (MOOD_VALUES[String(m.mood_key)] || 50), 0) / moodsRes.rows.length)
      : 0;

    // 4. Trends: compare this month vs last month
    const lastMonthTasksRes = await db.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM daily_priorities 
       WHERE MONTH(${sqlWibDate('created_at')}) = MONTH(DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 1 MONTH))
         AND YEAR(${sqlWibDate('created_at')}) = YEAR(DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 1 MONTH))`
    );
    const lastTotal = Number(lastMonthTasksRes.rows[0]?.total) || 1;
    const lastDone = Number(lastMonthTasksRes.rows[0]?.done) || 0;
    const lastEngagement = Math.round((lastDone / lastTotal) * 100);
    const engagementTrend = engagementScore - lastEngagement;

    const lastMoodsRes = await db.execute(
      `SELECT mood_key FROM mood_checkins
       WHERE ${sqlWibDate('created_at')}
             BETWEEN DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 14 DAY)
                 AND DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)`
    );
    const lastWellbeing = lastMoodsRes.rows.length > 0
      ? Math.round(lastMoodsRes.rows.reduce((acc, m) => acc + (MOOD_VALUES[String(m.mood_key)] || 50), 0) / lastMoodsRes.rows.length)
      : 0;
    const wellbeingTrend = wellbeingAvg - lastWellbeing;

    // 5. At-Risk Employees (low mood + low task completion)
    const atRiskEmployees: any[] = [];

    // Dua agregat, bukan dua query per karyawan. Loop ini sebelumnya menembak
    // 2 × jumlah karyawan query setiap kali dashboard HR dibuka, dan dashboard
    // ini juga dipanggil ulang oleh setiap event `refresh` dari Pusher.
    const latestMoodRes = await db.execute(
      `SELECT mc.user_id, mc.mood_key
       FROM mood_checkins mc
       JOIN (
         SELECT user_id, MAX(created_at) AS latest
         FROM mood_checkins GROUP BY user_id
       ) newest ON newest.user_id = mc.user_id AND newest.latest = mc.created_at`
    );
    const moodByUser = new Map<string, string>();
    for (const r of latestMoodRes.rows) {
      if (!moodByUser.has(String(r.user_id))) {
        moodByUser.set(String(r.user_id), String(r.mood_key || 'neutral'));
      }
    }

    const weekStatsRes = await db.execute(
      `SELECT user_id, COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM daily_priorities
       WHERE ${sqlWibDate('created_at')} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)
       GROUP BY user_id`
    );
    const weekStats = new Map<string, { total: number; done: number }>();
    for (const r of weekStatsRes.rows) {
      weekStats.set(String(r.user_id), { total: Number(r.total) || 0, done: Number(r.done) || 0 });
    }

    for (const u of users) {
      const mood = moodByUser.get(String(u.id)) || 'neutral';
      const week = weekStats.get(String(u.id)) || { total: 0, done: 0 };
      const uTotal = week.total;
      const completionRate = uTotal > 0 ? Math.round((week.done / uTotal) * 100) : 0;

      if (mood === 'stress' || mood === 'tired' || (uTotal > 0 && completionRate < 30)) {
        atRiskEmployees.push({
          id: u.id, name: u.name, role: u.job_title,
          dept: u.team_name || 'Unassigned',
          wellbeing: MOOD_VALUES[mood] || 50, mood,
          completionRate,
          risk: mood === 'stress' ? 'high' : 'medium'
        });
      }
    }

    // 6. Dept Pulse — REAL data per department
    const teamsRes = await db.execute("SELECT * FROM departments");
    const deptPulse = await Promise.all(teamsRes.rows.map(async (t) => {
      const teamUserIds = await db.execute({ sql: "SELECT id FROM users WHERE department = ?", args: [t.name] });
      const headcount = teamUserIds.rows.length;
      if (headcount === 0) return { dept: t.name, wellbeing: 0, engagement: 0, headcount: 0, atRisk: 0, tone: 'sage' };

      const ids = teamUserIds.rows.map(r => String(r.id));
      const placeholders = ids.map(() => '?').join(',');

      // Dept engagement = avg task completion this month
      const deptTasksRes = await db.execute({
        sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
              FROM daily_priorities WHERE user_id IN (${placeholders}) AND MONTH(${sqlWibDate('created_at')}) = MONTH(${SQL_WIB_TODAY})`,
        args: ids
      });
      const dTotal = Number(deptTasksRes.rows[0]?.total) || 1;
      const dDone = Number(deptTasksRes.rows[0]?.done) || 0;
      const deptEngagement = Math.round((dDone / dTotal) * 100);

      // Dept wellbeing = avg mood last 7 days
      const deptMoodsRes = await db.execute({
        sql: `SELECT mood_key FROM mood_checkins WHERE user_id IN (${placeholders}) AND ${sqlWibDate('created_at')} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)`,
        args: ids
      });
      const deptWellbeing = deptMoodsRes.rows.length > 0
        ? Math.round(deptMoodsRes.rows.reduce((acc, m) => acc + (MOOD_VALUES[String(m.mood_key)] || 50), 0) / deptMoodsRes.rows.length)
        : 0;

      const deptAtRisk = atRiskEmployees.filter(e => ids.includes(String(e.id))).length;

      return {
        dept: t.name, wellbeing: deptWellbeing, engagement: deptEngagement,
        headcount, atRisk: deptAtRisk,
        tone: deptWellbeing > 70 ? 'sage' : deptWellbeing > 40 ? 'yellow' : 'coral'
      };
    }));

    // 7. L&D Programs (real counts — or 0 if no tracking table yet)
    let programs: any[] = [];
    try {
      const learningRes = await db.execute("SELECT * FROM learning_items");
      programs = learningRes.rows.map(r => ({
        id: r.id, title: r.title, enrolled: 0, completed: 0, tone: r.tone || 'blue'
      }));
    } catch (e) { /* learning_items table may not exist yet */ }

    // 8. KPI Overview (avg scores from monthly_kpis)
    let kpiOverview = { avgScore: 0, totalKpis: 0, completed: 0 };
    try {
      const m = new Date().getMonth() + 1;
      const y = new Date().getFullYear();
      const kpiRes = await db.execute({
        sql: `SELECT COUNT(*) as total, 
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              AVG(final_score) as avg_score
              FROM monthly_kpis WHERE month = ? AND year = ?`,
        args: [m, y]
      });
      kpiOverview = {
        totalKpis: Number(kpiRes.rows[0]?.total) || 0,
        completed: Number(kpiRes.rows[0]?.completed) || 0,
        avgScore: Math.round(Number(kpiRes.rows[0]?.avg_score) || 0),
      };
    } catch (e) { /* table may be empty */ }

    const members = users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.job_title || 'Employee',
      team: u.team_name || 'Unassigned'
    }));

    return NextResponse.json({
      metrics: {
        totalEmployees,
        engagementScore,
        engagementTrend: (engagementTrend >= 0 ? '+' : '') + engagementTrend,
        wellbeingAvg,
        wellbeingTrend: (wellbeingTrend >= 0 ? '+' : '') + wellbeingTrend,
        atRisk: atRiskEmployees.length,
        atRiskTrend: '0',
        kpiOverview,
      },
      atRiskEmployees: atRiskEmployees.slice(0, 5),
      deptPulse,
      programs,
      members
    });
  } catch (error) {
    console.error("HR Dashboard Error:", error);
    return NextResponse.json({ error: 'Failed to fetch HR data' }, { status: 500 });
  }
}

