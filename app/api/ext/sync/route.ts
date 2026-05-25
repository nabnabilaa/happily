import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

// POST: Enhanced 2-way sync between extension and web
export async function POST(request: Request) {
  try {
    const { userId, tasks, notes, calendarRequest, deletedTaskIds, deletedNoteIds } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    // ── DELETIONS SYNC ──
    if (deletedTaskIds && Array.isArray(deletedTaskIds) && deletedTaskIds.length > 0) {
      const placeholders = deletedTaskIds.map(() => '?').join(',');
      await db.execute({
        sql: `DELETE FROM daily_priorities WHERE user_id = ? AND id IN (${placeholders})`,
        args: [userId, ...deletedTaskIds.map(String)]
      });
    }

    if (deletedNoteIds && Array.isArray(deletedNoteIds) && deletedNoteIds.length > 0) {
      const placeholders = deletedNoteIds.map(() => '?').join(',');
      await db.execute({
        sql: `DELETE FROM notes WHERE user_id = ? AND id IN (${placeholders})`,
        args: [userId, ...deletedNoteIds.map(String)]
      });
    }

    let tasksSynced = 0;
    let notesSynced = 0;

    // ── TASKS SYNC ──
    if (tasks && Array.isArray(tasks)) {
      for (const t of tasks) {
        if (!t.id || !t.title) continue;

        // Check if the referenced goalId exists in the goals table to avoid foreign key errors
        let verifiedGoalId = t.goalId || null;
        if (verifiedGoalId) {
          const goalExists = await db.execute({
            sql: "SELECT id FROM goals WHERE id = ?",
            args: [String(verifiedGoalId)]
          });
          if (goalExists.rows.length === 0) {
            verifiedGoalId = null;
          }
        }

        await db.execute({
          sql: `INSERT INTO daily_priorities (id, user_id, title, description, target_date, kpi_id, goal_id, energy_level, est_time, is_done, tone, source, 
                proof_link, proof_notes, metric_value, progress, is_project, project_duration_days, project_description, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'extension', ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                is_done = VALUES(is_done), title = VALUES(title), progress = VALUES(progress),
                description = VALUES(description), target_date = VALUES(target_date),
                kpi_id = VALUES(kpi_id), goal_id = VALUES(goal_id),
                proof_link = COALESCE(VALUES(proof_link), proof_link),
                metric_value = COALESCE(VALUES(metric_value), metric_value)`,
          args: [
            String(t.id), userId, t.title, t.description || null, t.targetDate || null, t.kpiId || null, verifiedGoalId, t.energy || 'mid', t.est || '30m', 
            t.done ? 1 : 0, t.tone || 'sage',
            t.proofLink || null, t.proofNotes || null, t.metricValue || null,
            t.progress || 0, t.isProject ? 1 : 0, t.projectDurationDays || null, t.projectDescription || null
          ]
        });
        tasksSynced++;
      }
    }

    // ── NOTES SYNC ──
    if (notes && Array.isArray(notes)) {
      for (const n of notes) {
        if (!n.id || !n.content) continue;

        await db.execute({
          sql: `INSERT INTO notes (id, user_id, title, content, visibility, source, related_event_id)
                VALUES (?, ?, ?, ?, ?, 'extension', ?)
                ON DUPLICATE KEY UPDATE content = VALUES(content), title = VALUES(title)`,
          args: [
            String(n.id), userId, n.title || null, n.content,
            n.visibility || 'private', n.relatedEventId || null
          ]
        });
        notesSynced++;
      }
    }

    // Log sync
    try {
      await db.execute({
        sql: "INSERT INTO ext_sync_log (user_id, tasks_synced, direction) VALUES (?, ?, 'ext_to_web')",
        args: [userId, tasksSynced + notesSynced]
      });
    } catch (e) { /* non-critical */ }

    // ── Fetch user identity for extension (role-based awareness) ──
    const userRes = await db.execute({
      sql: "SELECT id, name, role, user_role_context, points, coins, level, `rank`, avatar_image, streak FROM users WHERE id = ?",
      args: [userId]
    });
    const userRow = userRes.rows[0];

    // ── Return latest data from website (for 2-way sync) ──
    
    // Tasks today / active
    const tasksRes = await db.execute({
      sql: `SELECT id, title, goal_title, is_done, energy_level, est_time, tone, 
            proof_link, proof_notes, metric_value, progress, is_project, project_duration_days, project_description, goal_id, kpi_id, description, target_date, created_at
            FROM daily_priorities WHERE user_id = ? AND (is_done = 0 OR COALESCE(DATE(target_date), DATE(created_at)) = CURDATE())`,
      args: [userId]
    });

    // Notes (own, recent 20)
    const notesRes = await db.execute({
      sql: `SELECT id, title, content, visibility, related_event_id, created_at
            FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`,
      args: [userId]
    });

    // Calendar events (upcoming 7 days)
    let calEvents: any[] = [];
    if (calendarRequest) {
      const calRes = await db.execute({
        sql: `SELECT e.id, e.title, e.description, e.start_time, e.end_time, e.notification_offset_minutes, e.recurrence, e.location
              FROM calendar_events e 
              LEFT JOIN calendar_attendees a ON e.id = a.event_id AND a.user_id = ?
              WHERE (e.creator_id = ? OR a.user_id = ?) AND e.start_time >= NOW() AND e.start_time <= DATE_ADD(NOW(), INTERVAL 7 DAY)
              ORDER BY e.start_time ASC`,
        args: [userId, userId, userId]
      });
      calEvents = calRes.rows.map(r => ({
        id: r.id, title: r.title, description: r.description,
        startTime: r.start_time, endTime: r.end_time,
        notificationOffsetMinutes: r.notification_offset_minutes,
        recurrence: r.recurrence, location: r.location,
      }));
    }

    // Unread notifications
    const notifsRes = await db.execute({
      sql: `SELECT id, title, message, type, created_at FROM notifications 
            WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10`,
      args: [userId]
    });

    const userRole = (userRow ? (userRow.user_role_context || userRow.role) : 'employee').toLowerCase();
    
    let members: any[] = [];
    let teamTasks: any[] = [];
    let hrMetrics: any = null;
    let atRiskEmployees: any[] = [];
    let deptPulse: any[] = [];

    if (userRole === 'manager') {
      const membersRes = await db.execute({
        sql: `SELECT u.*, 
              (SELECT mood_key FROM mood_checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as mood,
              (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND is_done = 1 AND DATE(created_at) = CURDATE()) as tasks_done,
              (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND DATE(created_at) = CURDATE()) as tasks_total
              FROM users u WHERE u.manager_id = ?`,
        args: [userId]
      });

      members = membersRes.rows.map(m => ({
        id: m.id,
        name: m.name,
        role: m.job_title || 'Team Member',
        mood: m.mood || 'neutral',
        wellbeing: m.mood === 'joy' ? 90 : m.mood === 'stress' ? 30 : m.mood === 'tired' ? 50 : 70,
        tasks: { done: Number(m.tasks_done), total: Number(m.tasks_total) }
      }));

      const memberIdsOnly = members.map(m => String(m.id));
      if (memberIdsOnly.length > 0) {
        const placeholders = memberIdsOnly.map(() => '?').join(',');
        const tasksRes = await db.execute({
          sql: `SELECT dp.*, u.name as user_name FROM daily_priorities dp 
                JOIN users u ON dp.user_id = u.id
                WHERE dp.user_id IN (${placeholders}) AND (dp.is_done = 0 OR DATE(dp.created_at) = CURDATE())`,
          args: memberIdsOnly
        });
        teamTasks = tasksRes.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          title: r.title,
          goalId: r.goal_id,
          done: !!r.is_done,
          verified: !!r.is_verified,
          energy: r.energy_level,
          est: r.est_time,
          tone: r.tone,
          createdAt: r.created_at
        }));
      }
    } else if (userRole === 'hr') {
      const MOOD_VALUES: Record<string, number> = { joy: 100, calm: 85, neutral: 65, tired: 40, stress: 20 };
      
      const usersRes = await db.execute("SELECT u.*, u.department as team_name FROM users u");
      const users = usersRes.rows;
      const totalEmployees = users.length;

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

      const moodsRes = await db.execute("SELECT mood_key FROM mood_checkins WHERE created_at > DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
      const wellbeingAvg = moodsRes.rows.length > 0 
        ? Math.round(moodsRes.rows.reduce((acc, m) => acc + (MOOD_VALUES[String(m.mood_key)] || 50), 0) / moodsRes.rows.length)
        : 0;

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

      const teamsRes = await db.execute("SELECT * FROM departments");
      deptPulse = await Promise.all(teamsRes.rows.map(async (t) => {
        const teamUserIds = await db.execute({ sql: "SELECT id FROM users WHERE department_id = ?", args: [String(t.id)] });
        const headcount = teamUserIds.rows.length;
        if (headcount === 0) return { dept: t.name, wellbeing: 0, engagement: 0, headcount: 0, atRisk: 0, tone: 'sage' };

        const ids = teamUserIds.rows.map(r => String(r.id));
        const placeholders = ids.map(() => '?').join(',');

        const deptTasksRes = await db.execute({
          sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
                FROM daily_priorities WHERE user_id IN (${placeholders}) AND MONTH(created_at) = MONTH(CURDATE())`,
          args: ids
        });
        const dTotal = Number(deptTasksRes.rows[0]?.total) || 1;
        const dDone = Number(deptTasksRes.rows[0]?.done) || 0;
        const deptEngagement = Math.round((dDone / dTotal) * 100);

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

      hrMetrics = {
        totalEmployees,
        engagementScore,
        engagementTrend: (engagementTrend >= 0 ? '+' : '') + engagementTrend,
        wellbeingAvg,
        wellbeingTrend: (wellbeingTrend >= 0 ? '+' : '') + wellbeingTrend,
        atRisk: atRiskEmployees.length,
      };
    }


    return NextResponse.json({ 
      success: true, 
      tasksSynced, notesSynced,
      user: userRow ? {
        id: userRow.id, name: userRow.name,
        role: userRow.user_role_context || userRow.role,
        points: userRow.points, coins: userRow.coins,
        level: userRow.level, rank: userRow.rank,
        streak: userRow.streak, avatarImage: userRow.avatar_image,
      } : null,
      tasks: tasksRes.rows.map(r => {
        let taskDate = '';
        if (r.target_date) {
          taskDate = String(r.target_date).split(' ')[0];
        } else {
          const d = r.created_at ? new Date(r.created_at) : new Date();
          taskDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return {
          id: String(r.id), title: r.title, goal: r.goal_title || '',
          done: !!r.is_done, energy: r.energy_level || 'mid',
          date: taskDate,
          proofLink: r.proof_link || '', progress: r.progress || 0,
          isProject: !!r.is_project, metricValue: r.metric_value,
          goalId: r.goal_id, kpiId: r.kpi_id,
          description: r.description || '',
          targetDate: r.target_date || '',
        };
      }),
      notes: notesRes.rows.map(r => ({
        id: r.id, title: r.title, content: r.content,
        visibility: r.visibility, relatedEventId: r.related_event_id,
        createdAt: r.created_at,
      })),
      calendar: calEvents,
      notifications: notifsRes.rows.map(r => ({
        id: r.id, title: r.title, message: r.message, type: r.type,
      })),
      members: userRole === 'manager' ? members : undefined,
      teamTasks: userRole === 'manager' ? teamTasks : undefined,
      metrics: (userRole === 'hr') ? hrMetrics : undefined,
      atRiskEmployees: (userRole === 'hr') ? atRiskEmployees.slice(0, 5) : undefined,
      deptPulse: (userRole === 'hr') ? deptPulse : undefined,
    }, {
      headers: getCorsHeaders(request)
    });
  } catch (error: any) {
    console.error("Ext Sync Error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

