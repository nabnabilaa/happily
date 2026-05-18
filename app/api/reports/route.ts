import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// GET: Fetch or auto-generate monthly report for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = Number(searchParams.get('year')) || new Date().getFullYear();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Check if report exists
    const existingRes = await db.execute({
      sql: "SELECT * FROM monthly_reports WHERE user_id = ? AND month = ? AND year = ?",
      args: [userId, month, year]
    });

    if (existingRes.rows.length > 0) {
      const r = existingRes.rows[0];
      // Also fetch KPI data
      const kpiData = await getKPIData(userId, month, year);
      return NextResponse.json({
        report: {
          id: r.id, userId: r.user_id, month: r.month, year: r.year,
          totalTasks: r.total_tasks, tasksCompleted: r.tasks_completed,
          activeDays: r.active_days, totalWorkingDays: r.total_working_days,
          kpiScore: r.kpi_score, managerSummary: r.manager_summary,
          status: r.status,
        },
        kpiData,
      });
    }

    // Auto-generate from real data
    const report = await generateReport(userId, month, year);
    const kpiData = await getKPIData(userId, month, year);

    return NextResponse.json({ report, kpiData });
  } catch (error: any) {
    console.error("Report GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat laporan", details: error.message }, { status: 500 });
  }
}

// POST: Manager finalizes report
export async function POST(request: Request) {
  try {
    const { userId, month, year, managerSummary, kpiScores, reviewedBy } = await request.json();

    if (!userId || !month || !year) {
      return NextResponse.json({ error: "userId, month, year wajib diisi" }, { status: 400 });
    }

    // Generate base data
    const report = await generateReport(userId, Number(month), Number(year));

    // Calculate weighted KPI score
    let kpiScore = 0;
    if (kpiScores && Array.isArray(kpiScores)) {
      let totalWeight = 0;
      for (const ks of kpiScores) {
        // Update individual KPI scores
        await db.execute({
          sql: "UPDATE monthly_kpis SET final_score = ?, status = 'completed' WHERE id = ?",
          args: [ks.score, ks.kpiId]
        });
        kpiScore += (ks.score * ks.weight) / 100;
        totalWeight += ks.weight;
      }
      if (totalWeight > 0) kpiScore = Math.round(kpiScore);
    }

    const reportId = "rpt_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    // Upsert report
    await db.execute({
      sql: `INSERT INTO monthly_reports (id, user_id, month, year, total_tasks, tasks_completed, active_days, kpi_score, manager_summary, status, reviewed_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reviewed', ?)
            ON DUPLICATE KEY UPDATE 
            total_tasks = VALUES(total_tasks), tasks_completed = VALUES(tasks_completed),
            active_days = VALUES(active_days), kpi_score = VALUES(kpi_score),
            manager_summary = VALUES(manager_summary), status = 'reviewed', reviewed_by = VALUES(reviewed_by)`,
      args: [reportId, userId, month, year, report.totalTasks, report.tasksCompleted, report.activeDays, kpiScore, managerSummary || '', reviewedBy]
    });

    // Notify employee
    const notifId = "n_" + Date.now().toString(36);
    try {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [notifId, userId, "📊 Laporan bulanan kamu sudah direview", `Skor KPI: ${kpiScore}/100`, 'success']
      });
    } catch (e) { console.warn("Notif error:", e); }

    return NextResponse.json({ success: true, kpiScore });
  } catch (error: any) {
    console.error("Report POST Error:", error);
    return NextResponse.json({ error: "Gagal finalize laporan", details: error.message }, { status: 500 });
  }
}

// Helper: Generate report data from DB
async function generateReport(userId: string, month: number, year: number) {
  // Total tasks this month
  const tasksRes = await db.execute({
    sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
          FROM daily_priorities WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
    args: [userId, month, year]
  });

  // Active days (days with at least 1 task created)
  const daysRes = await db.execute({
    sql: `SELECT COUNT(DISTINCT DATE(created_at)) as days
          FROM daily_priorities WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
    args: [userId, month, year]
  });

  // Attendance days
  const attendanceRes = await db.execute({
    sql: `SELECT COUNT(*) as days FROM attendance 
          WHERE user_id = ? AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?`,
    args: [userId, month, year]
  });

  // XP total this month
  const xpRes = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions 
          WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
    args: [userId, month, year]
  });

  // Mood trend (most common mood)
  const moodRes = await db.execute({
    sql: `SELECT mood, COUNT(*) as cnt FROM mood_checkins 
          WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?
          GROUP BY mood ORDER BY cnt DESC LIMIT 3`,
    args: [userId, month, year]
  });

  const totalTasks = Number(tasksRes.rows[0]?.total) || 0;
  const tasksCompleted = Number(tasksRes.rows[0]?.done) || 0;
  const activeDays = Number(daysRes.rows[0]?.days) || 0;
  const attendanceDays = Number(attendanceRes.rows[0]?.days) || 0;
  const totalXP = Number(xpRes.rows[0]?.total) || 0;
  const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  // Quality Score: weighted composite (attendance 30%, task completion 40%, consistency 30%)
  const attendanceScore = Math.min(100, Math.round((attendanceDays / 22) * 100));
  const taskScore = completionRate;
  const consistencyScore = Math.min(100, Math.round((activeDays / 22) * 100));
  const qualityScore = Math.round(attendanceScore * 0.3 + taskScore * 0.4 + consistencyScore * 0.3);

  return {
    userId, month, year,
    totalTasks, tasksCompleted,
    activeDays: Math.max(activeDays, attendanceDays),
    totalWorkingDays: 22,
    completionRate,
    avgTasksPerDay: activeDays > 0 ? Math.round((totalTasks / activeDays) * 10) / 10 : 0,
    totalXP,
    qualityScore,
    moodTrend: moodRes.rows.map(r => ({ mood: r.mood, count: Number(r.cnt) })),
    status: 'draft',
  };
}

// Helper: Get KPI data with task link counts
async function getKPIData(userId: string, month: number, year: number) {
  const kpisRes = await db.execute({
    sql: `SELECT * FROM monthly_kpis WHERE assigned_to = ? AND month = ? AND year = ?`,
    args: [userId, month, year]
  });

  return Promise.all(kpisRes.rows.map(async (k) => {
    const linksRes = await db.execute({
      sql: `SELECT status, COUNT(*) as cnt FROM task_kpi_links WHERE kpi_id = ? GROUP BY status`,
      args: [String(k.id)]
    });

    const linkCounts: Record<string, number> = {};
    linksRes.rows.forEach(r => { linkCounts[String(r.status)] = Number(r.cnt); });

    return {
      id: k.id,
      title: k.title,
      targetDescription: k.target_description,
      weight: Number(k.weight),
      status: k.status,
      finalScore: k.final_score,
      managerNotes: k.manager_notes,
      links: {
        total: Object.values(linkCounts).reduce((a, b) => a + b, 0),
        approved: linkCounts['approved'] || 0,
        pending: linkCounts['pending'] || 0,
        rejected: linkCounts['rejected'] || 0,
        moved: linkCounts['moved'] || 0,
      }
    };
  }));
}
