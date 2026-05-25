import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MOOD_VALUES: Record<string, number> = { joy: 100, calm: 85, neutral: 65, tired: 40, stress: 20 };

export async function GET() {
  try {
    // 1. Fetch all users
    const usersRes = await db.execute("SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id");
    const users = usersRes.rows;
    const totalEmployees = users.length;

    // 2. Engagement Score = avg(tasks_done / tasks_total) across all users this month
    const taskStatsRes = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM daily_priorities 
       WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`
    );
    const totalTasks = Number(taskStatsRes.rows[0]?.total) || 1;
    const doneTasks = Number(taskStatsRes.rows[0]?.done) || 0;
    const engagementScore = Math.min(100, Math.round((doneTasks / totalTasks) * 100));

    // 3. Wellbeing = average mood from last 7 days (real data)
    const moodsRes = await db.execute("SELECT mood_key FROM mood_checkins WHERE created_at > DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
    const wellbeingAvg = moodsRes.rows.length > 0 
      ? Math.round(moodsRes.rows.reduce((acc, m) => acc + (MOOD_VALUES[String(m.mood_key)] || 50), 0) / moodsRes.rows.length)
      : 0;

    // 4. Trends: compare this month vs last month
    const lastMonthTasksRes = await db.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM daily_priorities 
       WHERE MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) 
       AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`
    );
    const lastTotal = Number(lastMonthTasksRes.rows[0]?.total) || 1;
    const lastDone = Number(lastMonthTasksRes.rows[0]?.done) || 0;
    const lastEngagement = Math.round((lastDone / lastTotal) * 100);
    const engagementTrend = engagementScore - lastEngagement;

    const lastMoodsRes = await db.execute(
      "SELECT mood_key FROM mood_checkins WHERE created_at BETWEEN DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    );
    const lastWellbeing = lastMoodsRes.rows.length > 0
      ? Math.round(lastMoodsRes.rows.reduce((acc, m) => acc + (MOOD_VALUES[String(m.mood_key)] || 50), 0) / lastMoodsRes.rows.length)
      : 0;
    const wellbeingTrend = wellbeingAvg - lastWellbeing;

    // 5. At-Risk Employees (low mood + low task completion)
    const atRiskEmployees: any[] = [];
    for (const u of users) {
      const latestMoodRes = await db.execute({
        sql: "SELECT mood_key FROM mood_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        args: [String(u.id)]
      });
      const mood = String(latestMoodRes.rows[0]?.mood_key || 'neutral');

      const userTasksRes = await db.execute({
        sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
              FROM daily_priorities WHERE user_id = ? AND created_at > DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        args: [String(u.id)]
      });
      const uTotal = Number(userTasksRes.rows[0]?.total) || 0;
      const uDone = Number(userTasksRes.rows[0]?.done) || 0;
      const completionRate = uTotal > 0 ? Math.round((uDone / uTotal) * 100) : 0;

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
    const teamsRes = await db.execute("SELECT * FROM teams");
    const deptPulse = await Promise.all(teamsRes.rows.map(async (t) => {
      const teamUserIds = await db.execute({ sql: "SELECT id FROM users WHERE team_id = ?", args: [String(t.id)] });
      const headcount = teamUserIds.rows.length;
      if (headcount === 0) return { dept: t.name, wellbeing: 0, engagement: 0, headcount: 0, atRisk: 0, tone: 'sage' };

      const ids = teamUserIds.rows.map(r => String(r.id));
      const placeholders = ids.map(() => '?').join(',');

      // Dept engagement = avg task completion this month
      const deptTasksRes = await db.execute({
        sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
              FROM daily_priorities WHERE user_id IN (${placeholders}) AND MONTH(created_at) = MONTH(CURDATE())`,
        args: ids
      });
      const dTotal = Number(deptTasksRes.rows[0]?.total) || 1;
      const dDone = Number(deptTasksRes.rows[0]?.done) || 0;
      const deptEngagement = Math.round((dDone / dTotal) * 100);

      // Dept wellbeing = avg mood last 7 days
      const deptMoodsRes = await db.execute({
        sql: `SELECT mood_key FROM mood_checkins WHERE user_id IN (${placeholders}) AND created_at > DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
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

