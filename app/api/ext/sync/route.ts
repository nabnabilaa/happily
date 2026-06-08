import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hpEventEmitter } from "@/lib/events";
import { triggerRollupForGoal } from "@/lib/rollup";

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
    const { userId, tasks, notes, habits, calendarRequest, deletedTaskIds, deletedNoteIds, focusTaskId, focusProgress, focusIntention } = await request.json();
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
      const affectedGoalIds = new Set<string>();
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
          } else {
            affectedGoalIds.add(String(verifiedGoalId));
          }
        }

        await db.execute({
          sql: `INSERT INTO daily_priorities (id, user_id, title, description, target_date, kpi_id, goal_id, energy_level, est_time, is_done, tone, source, 
                proof_link, proof_notes, metric_value, progress, is_project, project_duration_days, project_description, time_tracked, timer_started_at, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'extension', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                is_done = VALUES(is_done), title = VALUES(title), progress = VALUES(progress),
                description = VALUES(description), target_date = VALUES(target_date),
                kpi_id = VALUES(kpi_id), goal_id = VALUES(goal_id),
                proof_link = COALESCE(VALUES(proof_link), proof_link),
                metric_value = COALESCE(VALUES(metric_value), metric_value),
                time_tracked = VALUES(time_tracked),
                timer_started_at = VALUES(timer_started_at)`,
          args: [
            String(t.id), userId, t.title, t.description || null, t.targetDate || null, t.kpiId || null, verifiedGoalId, t.energy || 'mid', t.est || '30m', 
            t.done ? 1 : 0, t.tone || 'sage',
            t.proofLink || null, t.proofNotes || null, t.metricValue || null,
            t.progress || 0, t.isProject ? 1 : 0, t.projectDurationDays || null, t.projectDescription || null,
            t.timeTracked || 0, t.timerStartedAt || null
          ]
        });
        tasksSynced++;
      }
      
      // Trigger rollup for all affected goals
      for (const gid of Array.from(affectedGoalIds)) {
        await triggerRollupForGoal(gid);
      }
    }

    // ── NOTES SYNC ──
    if (notes && Array.isArray(notes)) {
      for (const n of notes) {
        if (!n.id || !n.content) continue;

        await db.execute({
          sql: `INSERT INTO notes (id, user_id, title, content, visibility, shared_with_users, shared_permission, source, related_event_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'extension', ?)
                ON DUPLICATE KEY UPDATE content = VALUES(content), title = VALUES(title), 
                visibility = VALUES(visibility), shared_with_users = VALUES(shared_with_users), 
                shared_permission = VALUES(shared_permission)`,
          args: [
            String(n.id), userId, n.title || null, n.content,
            n.visibility || 'private',
            n.sharedWithUsers ? JSON.stringify(n.sharedWithUsers) : null,
            n.sharedPermission || 'view',
            n.relatedEventId || null
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

    // Sync Focus Task to users table if provided in the payload
    if (focusTaskId !== undefined || focusProgress !== undefined || focusIntention !== undefined) {
      try {
        await db.execute({
          sql: `UPDATE users SET 
                focus_task_id = ?, 
                focus_progress = ?, 
                focus_intention = ? 
                WHERE id = ?`,
          args: [
            focusTaskId !== undefined ? (focusTaskId || null) : null,
            focusProgress !== undefined ? (Number(focusProgress) || 0) : 0,
            focusIntention !== undefined ? (focusIntention || "") : "",
            userId
          ]
        });
      } catch (e) {
        console.error("Failed to update focus task in users table:", e);
      }
    }

    // ── HABITS SYNC (Programmatic Diffing) ──
    if (habits && Array.isArray(habits)) {
      try {
        const dbHabitsRes = await db.execute({
          sql: "SELECT id, name, streak, target_days, is_done_today, glyph, completed_dates FROM habits WHERE user_id = ?",
          args: [userId]
        });
        const dbHabitsMap = new Map<string, any>();
        for (const r of dbHabitsRes.rows) {
          const key = (r.name || '').toLowerCase().trim();
          if (key) dbHabitsMap.set(key, r);
        }

        const payloadHabitsSet = new Set<string>();
        const seenHabits = new Set<string>();

        for (const h of habits) {
          const habitNameLower = (h.name || '').toLowerCase().trim();
          if (!habitNameLower || seenHabits.has(habitNameLower)) continue;
          seenHabits.add(habitNameLower);
          payloadHabitsSet.add(habitNameLower);

          const existing = dbHabitsMap.get(habitNameLower);
          const isDoneTodayVal = h.done ? 1 : 0;
          const completedDatesStr = h.completedDates ? JSON.stringify(h.completedDates) : null;

          if (!existing) {
            // Insert new habit
            await db.execute({
              sql: `INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph, completed_dates) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [userId, h.name, h.streak || 0, h.target || 30, isDoneTodayVal, h.glyph || 'check', completedDatesStr]
            });
          } else {
            let existingCompletedDatesStr = null;
            if (existing.completed_dates) {
              existingCompletedDatesStr = typeof existing.completed_dates === 'string' 
                ? existing.completed_dates 
                : JSON.stringify(existing.completed_dates);
            }
            const existingIsDone = Number(existing.is_done_today);
            const existingStreak = Number(existing.streak);
            const existingTarget = Number(existing.target_days);

            if (
              existingStreak !== h.streak ||
              existingTarget !== h.target ||
              existingIsDone !== isDoneTodayVal ||
              existing.glyph !== h.glyph ||
              existingCompletedDatesStr !== completedDatesStr ||
              existing.name !== h.name
            ) {
              await db.execute({
                sql: `UPDATE habits SET streak = ?, target_days = ?, is_done_today = ?, glyph = ?, completed_dates = ?, name = ? WHERE id = ? AND user_id = ?`,
                args: [h.streak, h.target, isDoneTodayVal, h.glyph, completedDatesStr, h.name, existing.id, userId]
              });
            }
          }
        }

        // Delete habits in DB that are not in the payload
        const deleteHabitIds = Array.from(dbHabitsMap.entries())
          .filter(([key]) => !payloadHabitsSet.has(key))
          .map(([, r]) => r.id);

        if (deleteHabitIds.length > 0) {
          await db.execute({
            sql: `DELETE FROM habits WHERE user_id = ? AND id IN (${deleteHabitIds.map(() => '?').join(',')})`,
            args: [userId, ...deleteHabitIds]
          });
        }
      } catch (e) {
        console.error("Habit sync error in ext:", e);
      }
    }

    // ── Fetch user identity for extension (role-based awareness) ──
    const userRes = await db.execute({
      sql: "SELECT id, name, role, user_role_context, points, coins, level, `rank`, avatar_image, streak, focus_task_id, focus_progress, focus_intention, department FROM users WHERE id = ?",
      args: [userId]
    });
    const userRow = userRes.rows[0];
    const userDept = userRow?.department || '';

    // ── Return latest data from website (for 2-way sync) ──
    
    // Tasks today / active
    const tasksRes = await db.execute({
      sql: `SELECT id, title, goal_title, is_done, energy_level, est_time, tone, 
            proof_link, proof_notes, metric_value, progress, is_project, project_duration_days, project_description, goal_id, kpi_id, description, target_date, time_tracked, timer_started_at, created_at
            FROM daily_priorities WHERE user_id = ? AND (is_done = 0 OR COALESCE(DATE(target_date), DATE(created_at)) = CURDATE())`,
      args: [userId]
    });

    // Notes (own + shared, recent 20)
    const notesRes = await db.execute({
      sql: `SELECT n.id, n.title, n.content, n.visibility, n.shared_with_users, n.shared_permission, n.related_event_id, n.created_at, n.user_id, u.name as author_name, u.department as author_department
            FROM notes n
            JOIN users u ON n.user_id = u.id
            WHERE n.user_id = ? 
               OR n.visibility = 'company'
               OR (n.visibility = 'division' AND u.department = ?)
               OR (n.visibility = 'custom' AND JSON_CONTAINS(n.shared_with_users, JSON_QUOTE(?)))
            ORDER BY n.updated_at DESC LIMIT 20`,
      args: [userId, userDept, userId]
    });

    // All users (for member picker in extension)
    const allUsersRes = await db.execute(
      "SELECT id, name, department FROM users ORDER BY name ASC"
    );

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
    let teamGoals: any[] = [];
    let teamApprovals: any[] = [];
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
          status: r.status,
          energy: r.energy_level,
          est: r.est_time,
          tone: r.tone,
          createdAt: r.created_at
        }));
      }

      // Fetch team goals and pending approvals
      const memberIds = members.map(m => String(m.id)).concat([userId]);
      const placeholders = memberIds.map(() => '?').join(',');
      const goalsRes = await db.execute({
        sql: `SELECT g.*, u.name as joined_owner_name FROM goals g
              LEFT JOIN users u ON g.owner_id = u.id
              WHERE (g.scope = 'team' AND g.owner_id IN (${placeholders}))
              OR (g.scope = 'assigned' AND g.assigned_by_id = ?)`,
        args: [...memberIds, userId]
      });

      teamGoals = await Promise.all(goalsRes.rows.map(async g => {
        const childRes = await db.execute({
          sql: `SELECT progress FROM goals WHERE parent_id = ?`,
          args: [String(g.id)]
        });
        let rollupProgress = Number(g.progress) || 0;
        const rawDue = (g.due_date as string) || '';
        let dueDisplay = rawDue;
        if (rawDue.includes('T')) {
          try {
            const d = new Date(rawDue);
            if (!isNaN(d.getTime())) {
              dueDisplay = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            }
          } catch (e) {}
        }

        return {
          id: g.id,
          title: g.title,
          progress: rollupProgress,
          due: dueDisplay,
          tone: g.tone || 'blue',
          scope: g.scope,
          assignedById: g.assigned_by_id,
          ownerId: g.owner_id,
          owner: (g.joined_owner_name as string) || (g.owner_name as string) || 'Team Member',
          status: g.status || 'pending',
          is_kpi: !!g.is_kpi,
          parent_id: g.parent_id,
          alignment: g.alignment || 100,
          metric: childRes.rows.length > 0 ? `${childRes.rows.length} aligned OKR` : g.metric
        };
      }));

      if (memberIdsOnly.length > 0) {
        const memberPlaceholders = memberIdsOnly.map(() => '?').join(',');
        const pendingRes = await db.execute({
          sql: `SELECT g.*, u.name as owner_name 
                FROM goals g 
                JOIN users u ON g.owner_id = u.id
                WHERE g.owner_id IN (${memberPlaceholders}) AND g.status = 'pending'`,
          args: memberIdsOnly
        });
        teamApprovals = pendingRes.rows.map(a => ({
          id: a.id,
          type: a.is_kpi ? 'KPI GOAL' : 'GOAL',
          from: a.owner_name,
          desc: a.title,
          urgent: a.is_kpi === 1,
          progress: a.progress || 0,
          due: a.due_date ? String(a.due_date).split(' ')[0] : ''
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

        const todayTasksRes = await db.execute({
          sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
                FROM daily_priorities WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
          args: [String(u.id)]
        });
        const tTotal = Number(todayTasksRes.rows[0]?.total) || 0;
        const tDone = Number(todayTasksRes.rows[0]?.done) || 0;

        members.push({
          id: u.id,
          name: u.name,
          role: u.job_title || 'Employee',
          dept: u.team_name || 'Unassigned',
          mood,
          wellbeing: MOOD_VALUES[mood] || 50,
          tasks: { done: tDone, total: tTotal }
        });
      }

      const teamsRes = await db.execute("SELECT * FROM departments");
      deptPulse = await Promise.all(teamsRes.rows.map(async (t) => {
        const teamUserIds = await db.execute({ sql: "SELECT id FROM users WHERE department = ?", args: [String(t.name)] });
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

    const hasChanges = tasksSynced > 0 || notesSynced > 0 || (deletedTaskIds && deletedTaskIds.length > 0) || (deletedNoteIds && deletedNoteIds.length > 0);
    if (hasChanges) {
      // Emit real-time event to refresh open website tabs
      hpEventEmitter.emit("db_update", { type: "refresh", targetUserId: userId, timestamp: Date.now() });
    }

    // Fetch today's attendance status
    const todayRes = await db.execute({
      sql: `SELECT check_in_at, check_out_at, check_in_type, mood
            FROM attendance 
            WHERE user_id = ? AND DATE(check_in_at) = CURDATE()
            ORDER BY check_in_at DESC LIMIT 1`,
      args: [userId]
    });
    const todayRecord = todayRes.rows[0];
    let attendanceStatus = 'not_checked_in';
    if (todayRecord) {
      attendanceStatus = todayRecord.check_out_at ? 'checked_out' : 'checked_in';
    }

    // Fetch Habits from DB to return
    const habitsRes = await db.execute({
      sql: "SELECT id, name, streak, target_days, is_done_today, glyph, completed_dates FROM habits WHERE user_id = ?",
      args: [userId]
    });
    const habitsUnique: any[] = [];
    const seenHabits = new Set<string>();
    for (const r of habitsRes.rows) {
      const habitNameLower = (r.name || '').toLowerCase().trim();
      if (!habitNameLower || seenHabits.has(habitNameLower)) continue;
      seenHabits.add(habitNameLower);
      let completedDates = [];
      try {
        if (r.completed_dates) {
          completedDates = typeof r.completed_dates === 'string' ? JSON.parse(r.completed_dates) : r.completed_dates;
        }
      } catch (e) { console.error("Failed to parse habit completed_dates", e); }
      
      const todayReal = new Date();
      const todayStr = `${todayReal.getFullYear()}-${String(todayReal.getMonth() + 1).padStart(2, '0')}-${String(todayReal.getDate()).padStart(2, '0')}`;
      const isDoneToday = completedDates ? completedDates.includes(todayStr) : !!r.is_done_today;

      habitsUnique.push({
        name: r.name, streak: r.streak, target: r.target_days, done: isDoneToday, glyph: r.glyph, completedDates
      });
    }

    return NextResponse.json({ 
      success: true, 
      tasksSynced, notesSynced,
      habits: habitsUnique,
      todayAttendance: todayRecord ? {
        status: attendanceStatus,
        checkInAt: todayRecord.check_in_at,
        checkOutAt: todayRecord.check_out_at,
        type: todayRecord.check_in_type,
        mood: todayRecord.mood,
      } : {
        status: attendanceStatus
      },
      user: userRow ? {
        id: userRow.id, name: userRow.name,
        role: userRow.user_role_context || userRow.role,
        points: userRow.points, coins: userRow.coins,
        level: userRow.level, rank: userRow.rank,
        streak: userRow.streak, avatarImage: userRow.avatar_image,
        focusTaskId: userRow.focus_task_id ? (isNaN(Number(userRow.focus_task_id)) ? userRow.focus_task_id : Number(userRow.focus_task_id)) : null,
        focusProgress: userRow.focus_progress || 0,
        focusIntention: userRow.focus_intention || "",
      } : null,
      tasks: tasksRes.rows.map(r => {
        let taskDate = '';
        if (r.target_date) {
          if (r.target_date instanceof Date) {
            const d = r.target_date;
            taskDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          } else {
            const str = String(r.target_date);
            taskDate = str.includes('T') ? str.split('T')[0] : (str.includes(' ') ? str.split(' ')[0] : str);
          }
        } else {
          const d = r.created_at ? (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)) : new Date();
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
          targetDate: taskDate,
          timeTracked: Number(r.time_tracked) || 0,
          timerStartedAt: r.timer_started_at || null,
        };
      }),
      notes: notesRes.rows.map(r => {
        let swu: string[] = [];
        try { if (r.shared_with_users) swu = typeof r.shared_with_users === 'string' ? JSON.parse(r.shared_with_users) : r.shared_with_users; } catch(_) {}
        return {
          id: r.id, title: r.title, content: r.content,
          visibility: r.visibility,
          sharedWithUsers: swu,
          sharedPermission: r.shared_permission || 'view',
          relatedEventId: r.related_event_id,
          createdAt: r.created_at,
          userId: r.user_id,
          authorName: r.author_name || 'SAYA',
          authorDepartment: r.author_department || '',
        };
      }),
      allUsers: allUsersRes.rows.map(r => ({ id: r.id, name: r.name, department: r.department })),
      calendar: calEvents,
      notifications: notifsRes.rows.map(r => ({
        id: r.id, title: r.title, message: r.message, type: r.type,
      })),
      members: (userRole === 'manager' || userRole === 'hr') ? members : undefined,
      teamTasks: userRole === 'manager' ? teamTasks : undefined,
      teamGoals: userRole === 'manager' ? teamGoals : undefined,
      teamApprovals: userRole === 'manager' ? teamApprovals : undefined,
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

