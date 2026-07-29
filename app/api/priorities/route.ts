import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Direct create/delete for daily tasks.
 *
 * Why this exists: adding a task used to touch nothing but React state. The
 * only thing that ever persisted it was the 1500ms-debounced `POST /api/storage`
 * blob sync, which replays the whole state and does DELETE-then-reinsert. Any
 * refetch landing in the wrong window — a Pusher `refresh`, a second tab, the
 * extension, a failed sync — and the task was gone before it ever reached the
 * database. `/api/priorities/complete` was added for exactly this reason on the
 * completion path; create and delete never got the same treatment.
 *
 * These write immediately and authoritatively, so persistence never depends on
 * winning a race.
 */

// POST /api/priorities — create one task, now, not in 1500ms.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, userId, title } = body;

    if (!id || !userId || !title || !String(title).trim()) {
      return NextResponse.json({ error: "id, userId, dan title wajib diisi" }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO daily_priorities
              (id, user_id, title, description, target_date, goal_title, goal_id, kpi_id,
               energy_level, est_time, is_done, is_verified, status, tone,
               weekly_target_id, weekly_target_title, is_project, due_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE
              title=VALUES(title), description=VALUES(description),
              target_date=VALUES(target_date), goal_title=VALUES(goal_title),
              goal_id=VALUES(goal_id), kpi_id=VALUES(kpi_id),
              energy_level=VALUES(energy_level), est_time=VALUES(est_time),
              status=VALUES(status), tone=VALUES(tone),
              weekly_target_id=VALUES(weekly_target_id),
              weekly_target_title=VALUES(weekly_target_title),
              is_project=VALUES(is_project), due_date=VALUES(due_date)`,
      args: [
        String(id),
        userId,
        String(title).trim(),
        body.description || null,
        body.targetDate || null,
        body.goal || body.kpi_title || null,
        body.goal_id || null,
        body.kpi_id || null,
        body.energy || "mid",
        body.est || "30m",
        body.status || "todo",
        body.tone || "sage",
        body.weekly_target_id || null,
        body.weekly_target_title || null,
        body.is_project ? 1 : 0,
        body.due_date || null,
      ],
    });

    return NextResponse.json({ success: true, id: String(id) });
  } catch (error: any) {
    console.error("Priority create error:", error);
    return NextResponse.json({ error: "Gagal menyimpan task", details: error.message }, { status: 500 });
  }
}

// PATCH /api/priorities — edit one task's own fields, now.
//
// Editing used to be state-only, which was survivable while the blob sync
// replayed the whole task array. It no longer does, so an edit that does not
// come through here is simply lost on the next refetch.
//
// Only descriptive fields are writable. Completion state (`is_done`,
// `partial_progress`, proof) belongs to /api/priorities/complete and the review
// verdict (`is_verified`) belongs to lib/taskReview.ts — letting an edit carry
// them is how a stale client used to revert a manager's ACC.
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, userId } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: "id dan userId wajib diisi" }, { status: 400 });
    }
    if (body.title !== undefined && !String(body.title).trim()) {
      return NextResponse.json({ error: "title tidak boleh kosong" }, { status: 400 });
    }

    const EDITABLE: Record<string, string> = {
      title: "title",
      description: "description",
      targetDate: "target_date",
      due_date: "due_date",
      goal: "goal_title",
      goal_id: "goal_id",
      kpi_id: "kpi_id",
      energy: "energy_level",
      est: "est_time",
      tone: "tone",
      status: "status",
      weekly_target_id: "weekly_target_id",
      weekly_target_title: "weekly_target_title",
      is_project: "is_project",
    };

    const sets: string[] = [];
    const args: any[] = [];
    for (const [key, column] of Object.entries(EDITABLE)) {
      if (body[key] === undefined) continue;
      sets.push(`${column} = ?`);
      const v = body[key];
      args.push(key === "is_project" ? (v ? 1 : 0) : (key === "title" ? String(v).trim() : v || null));
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "tidak ada field yang bisa diubah" }, { status: 400 });
    }

    args.push(String(id), userId);
    await db.execute({
      sql: `UPDATE daily_priorities SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    return NextResponse.json({ success: true, id: String(id) });
  } catch (error: any) {
    console.error("Priority update error:", error);
    return NextResponse.json({ error: "Gagal memperbarui task", details: error.message }, { status: 500 });
  }
}

// DELETE /api/priorities?id=…&userId=… — remove one task, now.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ error: "id dan userId wajib diisi" }, { status: 400 });
    }

    // Scoped to the owner so a guessed id can't delete someone else's task.
    await db.execute({
      sql: `DELETE FROM daily_priorities WHERE id = ? AND user_id = ?`,
      args: [String(id), userId],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Priority delete error:", error);
    return NextResponse.json({ error: "Gagal menghapus task", details: error.message }, { status: 500 });
  }
}
