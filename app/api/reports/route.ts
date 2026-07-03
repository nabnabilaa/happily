import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        // Award XP if Quality Score is >= 70%
        if (report.qualityScore >= 70) {
          let xpAmount = 0;
          let actionType = '';
          let desc = '';

          // Fetch KPI details to get the title
          const kpiQuery = await db.execute({
            sql: "SELECT title FROM monthly_kpis WHERE id = ?",
            args: [ks.kpiId]
          });
          const kpiTitle = kpiQuery.rows[0]?.title || ks.kpiId;

          if (ks.score >= 100) {
            xpAmount = 250;
            actionType = 'kpi_exceeded';
            desc = `KPI Bulanan melampaui target: ${kpiTitle} (${ks.score}/100)`;
          } else if (ks.score >= 70) {
            xpAmount = 150;
            actionType = 'kpi_achieved';
            desc = `KPI Bulanan tercapai: ${kpiTitle} (${ks.score}/100)`;
          }

          if (xpAmount > 0) {
            // Check if already awarded to prevent double awards
            const checkAward = await db.execute({
              sql: "SELECT id FROM xp_transactions WHERE user_id = ? AND action_type = ? AND description LIKE ?",
              args: [userId, actionType, `%${ks.kpiId}%`]
            });

            if (checkAward.rows.length === 0) {
              const txId = "tx_kpi_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
              await db.execute({
                sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
                args: [txId, userId, xpAmount, actionType, desc]
              });
              await db.execute({
                sql: "UPDATE users SET points = points + ?, coins = points + ? WHERE id = ?",
                args: [xpAmount, xpAmount, userId]
              });
              
              // Notify employee
              const kpNotifId = "n_kpi_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
              await db.execute({
                sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
                args: [kpNotifId, userId, `🏆 Bonus Point KPI: +${xpAmount}!`, desc, 'success']
              });
            }
          }
        }

        kpiScore += (ks.score * ks.weight) / 100;
        totalWeight += ks.weight;
      }
      if (totalWeight > 0) kpiScore = Math.round(kpiScore);
    }

    // Award Monthly Streak Bonus (+200 XP) if user has completed all working days in that month
    if (report.activeDays >= report.totalWorkingDays) {
      try {
        const checkStreak = await db.execute({
          sql: "SELECT id FROM xp_transactions WHERE user_id = ? AND action_type = 'streak_monthly' AND description LIKE ?",
          args: [userId, `%${month}/${year}%`]
        });

        if (checkStreak.rows.length === 0) {
          const txId = "tx_sm_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
          await db.execute({
            sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
            args: [txId, userId, 200, 'streak_monthly', `🔥 Streak sebulan penuh: ${month}/${year}`]
          });
          await db.execute({
            sql: "UPDATE users SET points = points + 200, coins = points + 200 WHERE id = ?",
            args: [userId]
          });
          
          const notifStreakId = "n_sm_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
          await db.execute({
            sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
            args: [notifStreakId, userId, "💎 Streak Sebulan Penuh!", `Selamat! Kamu aktif di semua hari kerja di bulan ${month}/${year}. Bonus +200 Point!`, 'success']
          });
        }
      } catch (e) {
        console.warn("Monthly streak award error:", e);
      }
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

// Helper: Get exact working days in a month (excluding weekends)
function getWorkingDaysInMonth(month: number, year: number): number {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count || 22;
}

// Helper: Generate report data from DB
async function generateReport(userId: string, month: number, year: number) {
  // Total tasks this month
  const tasksRes = await db.execute({
    sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done,
               COALESCE(SUM(time_tracked), 0) as total_time_tracked,
               COALESCE(SUM(CASE WHEN is_project = 1 THEN 1 ELSE 0 END), 0) as project_count
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
  const totalTimeTrackedSeconds = Number(tasksRes.rows[0]?.total_time_tracked) || 0;
  const projectTaskCount = Number(tasksRes.rows[0]?.project_count) || 0;
  const activeDays = Number(daysRes.rows[0]?.days) || 0;
  const attendanceDays = Number(attendanceRes.rows[0]?.days) || 0;
  const totalXP = Number(xpRes.rows[0]?.total) || 0;
  const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  const totalWorkingDays = getWorkingDaysInMonth(month, year);

  // Quality Score: weighted composite (attendance 30%, task completion 40%, consistency 30%)
  const attendanceScore = Math.min(100, Math.round((attendanceDays / totalWorkingDays) * 100));
  const taskScore = completionRate;
  const consistencyScore = Math.min(100, Math.round((activeDays / totalWorkingDays) * 100));
  const qualityScore = Math.round(attendanceScore * 0.3 + taskScore * 0.4 + consistencyScore * 0.3);

  return {
    userId, month, year,
    totalTasks, tasksCompleted,
    activeDays: Math.max(activeDays, attendanceDays),
    totalWorkingDays,
    completionRate,
    avgTasksPerDay: activeDays > 0 ? Math.round((totalTasks / activeDays) * 10) / 10 : 0,
    totalXP,
    qualityScore,
    totalTimeTrackedHours: Math.round(totalTimeTrackedSeconds / 3600 * 10) / 10,
    projectTaskCount,
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

    // Task detail per KPI bulan ini
    const taskDetailRes = await db.execute({
      sql: `SELECT dp.id, dp.title, dp.status, dp.is_done, dp.partial_progress,
                   dp.time_tracked, dp.proof_link, dp.proof_notes, dp.metric_value,
                   dp.target_date, dp.due_date, dp.completed_at, dp.is_project
            FROM daily_priorities dp
            WHERE dp.kpi_id = ? AND dp.user_id = ?
            ORDER BY dp.created_at DESC LIMIT 20`,
      args: [String(k.id), String(k.assigned_to || userId)]
    });

    const weeklyRes = await db.execute({
      sql: `SELECT id, title, week_number, target_value, current_value, metric_unit, status
            FROM weekly_targets WHERE kpi_id = ? ORDER BY week_number ASC`,
      args: [String(k.id)]
    });

    return {
      id: k.id,
      title: k.title,
      targetDescription: k.target_description,
      weight: Number(k.weight),
      status: k.status,
      finalScore: k.final_score,
      managerNotes: k.manager_notes,
      metricTarget: k.metric_target ? Number(k.metric_target) : null,
      metricCurrent: k.metric_current ? Number(k.metric_current) : null,
      reviewStatus: k.review_status || null,
      reviewNote: k.review_note || null,
      links: {
        total: Object.values(linkCounts).reduce((a, b) => a + b, 0),
        approved: linkCounts['approved'] || 0,
        pending: linkCounts['pending'] || 0,
        rejected: linkCounts['rejected'] || 0,
        moved: linkCounts['moved'] || 0,
      },
      tasks: taskDetailRes.rows.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        isDone: !!t.is_done,
        partialProgress: Number(t.partial_progress) || 0,
        timeTrackedSeconds: Number(t.time_tracked) || 0,
        proofLinks: (() => { try { const v = JSON.parse(t.proof_link as string); return Array.isArray(v) ? v : [t.proof_link]; } catch { return t.proof_link ? [t.proof_link] : []; } })(),
        notes: t.proof_notes || null,
        metricValue: t.metric_value ? Number(t.metric_value) : null,
        targetDate: t.target_date || null,
        dueDate: t.due_date || null,
        completedAt: t.completed_at || null,
        isProject: !!t.is_project,
      })),
      weeklyTargets: weeklyRes.rows.map(w => ({
        id: w.id,
        title: w.title,
        weekNumber: Number(w.week_number),
        targetValue: Number(w.target_value),
        currentValue: Number(w.current_value),
        metricUnit: w.metric_unit,
        status: w.status,
      })),
    };
  }));
}

