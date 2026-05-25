import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Aggregated employee profile data (for HR employee detail view)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const month = searchParams.get("month") || String(new Date().getMonth() + 1);
    const year = searchParams.get("year") || String(new Date().getFullYear());

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // 1. User basic info
    const userRes = await db.execute({
      sql: `SELECT id, name, email, role, job_title, department, manager_id, 
                   avatar_image, points, level, streak, coins, created_at
            FROM users WHERE id = ?`,
      args: [userId]
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const user = userRes.rows[0] as any;

    // 2. Manager name
    let managerName = null;
    if (user.manager_id) {
      const mgrRes = await db.execute({
        sql: "SELECT name FROM users WHERE id = ?",
        args: [user.manager_id]
      });
      if (mgrRes.rows.length > 0) managerName = (mgrRes.rows[0] as any).name;
    }

    // 3. Attendance summary for the month (MySQL compatible)
    const attRes = await db.execute({
      sql: `SELECT COUNT(*) as total_days,
                   SUM(CASE WHEN check_out_at IS NOT NULL THEN duration_minutes ELSE 0 END) as total_minutes,
                   SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
                   SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END) as early_leave_days
            FROM attendance 
            WHERE user_id = ? AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?`,
      args: [userId, Number(month), Number(year)]
    });
    const att = attRes.rows[0] as any;

    // 4. KPI count + score
    const kpiRes = await db.execute({
      sql: `SELECT COUNT(*) as total, 
                   AVG(CASE WHEN final_score IS NOT NULL THEN final_score END) as avg_score
            FROM monthly_kpis 
            WHERE assigned_to = ? AND month = ? AND year = ?`,
      args: [userId, Number(month), Number(year)]
    });
    const kpi = kpiRes.rows[0] as any;

    // 5. Recent mood (last 7 entries)
    const moodRes = await db.execute({
      sql: `SELECT mood_key, created_at FROM mood_checkins 
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 7`,
      args: [userId]
    });

    // 6. Logbook entries count this month (MySQL compatible)
    const logRes = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM logbook_entries 
            WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
      args: [userId, Number(month), Number(year)]
    });

    // 6b. Task summary (completed / total priorities) for the month (MySQL compatible)
    const tasksRes = await db.execute({
      sql: `SELECT COUNT(*) as total, 
                   SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as completed
            FROM daily_priorities 
            WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
      args: [userId, Number(month), Number(year)]
    });
    const taskData = tasksRes.rows[0] as any;
    const taskTotal = Number(taskData?.total) || 0;
    const taskCompleted = Number(taskData?.completed) || 0;
    const taskCompletionRate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

    // 7. AI Weekly Summary (latest)
    const aiRes = await db.execute({
      sql: `SELECT summary_text, score, week_start, week_end FROM ai_weekly_summaries 
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [userId]
    });

    // 8. Monthly report status
    const reportRes = await db.execute({
      sql: `SELECT status, kpi_score, manager_summary FROM monthly_reports 
            WHERE user_id = ? AND month = ? AND year = ?`,
      args: [userId, Number(month), Number(year)]
    });

    return NextResponse.json({
      user: {
        ...user,
        managerName,
      },
      attendance: {
        totalDays: Number(att.total_days) || 0,
        totalMinutes: Number(att.total_minutes) || 0,
        lateDays: Number(att.late_days) || 0,
        earlyLeaveDays: Number(att.early_leave_days) || 0,
      },
      kpi: {
        total: Number(kpi.total) || 0,
        avgScore: kpi.avg_score ? Math.round(Number(kpi.avg_score)) : null,
      },
      taskSummary: {
        completed: taskCompleted,
        total: taskTotal,
        completionRate: taskCompletionRate,
      },
      recentMoods: moodRes.rows,
      logbookCount: Number((logRes.rows[0] as any).cnt) || 0,
      latestAISummary: aiRes.rows.length > 0 ? aiRes.rows[0] : null,
      monthlyReport: reportRes.rows.length > 0 ? reportRes.rows[0] : null,
      period: { month: Number(month), year: Number(year) },
    });
  } catch (error: any) {
    console.error("User Profile Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}

