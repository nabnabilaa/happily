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

