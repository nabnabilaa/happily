import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST - Change task status with approval workflow
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { userId, action, revision_note } = body;
    // action: 'start' | 'submit_review' | 'accept' | 'revise' | 'mark_done'

    if (!userId || !action) {
      return NextResponse.json({ error: "userId dan action wajib diisi" }, { status: 400 });
    }

    // Get task
    const taskRes = await db.execute("SELECT * FROM okr_tasks WHERE id = ?", [taskId]);
    const task = taskRes.rows[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Get user
    const userRes = await db.execute("SELECT id, role, division_id FROM users WHERE id = ?", [userId]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let newStatus = task.status;
    let approvalType = null;
    let approvedBy = null;
    let approvedAt = null;
    let revisionNote = task.revision_note;

    switch (action) {
      case 'start':
        // To Do → In Progress
        if (task.status !== 'todo') {
          return NextResponse.json({ error: "Task harus berstatus To Do untuk di-start" }, { status: 400 });
        }
        if (task.assignee_id !== userId) {
          return NextResponse.json({ error: "Hanya assignee yang bisa start task ini" }, { status: 403 });
        }
        newStatus = 'in_progress';
        break;

      case 'submit_review':
        // In Progress → Review (Employee only)
        if (task.status !== 'in_progress') {
          return NextResponse.json({ error: "Task harus berstatus In Progress untuk submit review" }, { status: 400 });
        }
        if (task.assignee_id !== userId) {
          return NextResponse.json({ error: "Hanya assignee yang bisa submit review" }, { status: 403 });
        }
        if (user.role !== 'employee') {
          return NextResponse.json({ error: "Hanya Employee yang menggunakan Submit for Review. Manager/HR gunakan Mark as Done." }, { status: 400 });
        }
        newStatus = 'review';
        revisionNote = null; // Clear previous revision notes
        break;

      case 'accept':
        // Review → Done (Manager accepting employee's task)
        if (task.status !== 'review') {
          return NextResponse.json({ error: "Task harus berstatus Review untuk di-accept" }, { status: 400 });
        }
        if (user.role !== 'manager') {
          return NextResponse.json({ error: "Hanya Manager yang bisa accept task" }, { status: 403 });
        }
        // Verify manager is in same division as assignee
        const assigneeRes = await db.execute("SELECT division_id FROM users WHERE id = ?", [task.assignee_id]);
        const assignee = assigneeRes.rows[0];
        if (String(user.division_id) !== String(assignee?.division_id)) {
          return NextResponse.json({ error: "Manager hanya bisa accept task Employee di divisi yang sama" }, { status: 403 });
        }
        newStatus = 'done';
        approvalType = 'reviewed';
        approvedBy = userId;
        approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        break;

      case 'revise':
        // Review → In Progress (Manager sending back)
        if (task.status !== 'review') {
          return NextResponse.json({ error: "Task harus berstatus Review untuk di-revise" }, { status: 400 });
        }
        if (user.role !== 'manager') {
          return NextResponse.json({ error: "Hanya Manager yang bisa revise task" }, { status: 403 });
        }
        newStatus = 'in_progress';
        revisionNote = revision_note || 'Perlu perbaikan';
        break;

      case 'mark_done':
        // In Progress → Done (Self-approve for Manager/HR)
        if (task.status !== 'in_progress' && task.status !== 'todo') {
          return NextResponse.json({ error: "Task harus berstatus In Progress atau To Do" }, { status: 400 });
        }
        if (task.assignee_id !== userId) {
          return NextResponse.json({ error: "Hanya assignee yang bisa mark as done" }, { status: 403 });
        }
        // Self-approve check: only Manager/HR for their own tasks
        if (user.role === 'employee') {
          return NextResponse.json({ error: "Employee tidak bisa langsung Mark as Done. Gunakan Submit for Review." }, { status: 403 });
        }
        // Must be own task (created_by === assignee_id for individual OKR)
        if (task.created_by !== task.assignee_id && user.role !== 'hr') {
          return NextResponse.json({ error: "Self-approve hanya untuk task dari Individual OKR sendiri" }, { status: 403 });
        }
        newStatus = 'done';
        approvalType = 'self_approved';
        approvedBy = userId;
        approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        break;

      default:
        return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE okr_tasks SET status = ?, approval_type = ?, approved_by = ?, approved_at = ?, revision_note = ? WHERE id = ?`,
      args: [newStatus, approvalType, approvedBy, approvedAt, revisionNote, taskId]
    });

    // Send notifications based on action
    if (action === 'submit_review') {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [crypto.randomUUID(), task.created_by, "Task Perlu Review", `Task "${task.title}" disubmit untuk review oleh ${user.name || 'anggota tim'}.`, "okr_review"]
      });
    } else if (action === 'accept') {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [crypto.randomUUID(), task.assignee_id, "Task Diterima", `Task "${task.title}" telah di-accept oleh Manager. Kerja bagus!`, "okr_accepted"]
      });
    } else if (action === 'revise') {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [crypto.randomUUID(), task.assignee_id, "Revisi Task", `Task "${task.title}" dikembalikan dengan catatan: "${revisionNote}"`, "okr_revision"]
      });
    }

    // Update key_result current_value if task is done
    if (newStatus === 'done' && task.key_result_id) {
      const doneCount = await db.execute(
        "SELECT COUNT(*) as cnt FROM okr_tasks WHERE key_result_id = ? AND status = 'done'",
        [task.key_result_id]
      );
      const totalCount = await db.execute(
        "SELECT COUNT(*) as cnt FROM okr_tasks WHERE key_result_id = ?",
        [task.key_result_id]
      );
      const done = Number(doneCount.rows[0]?.cnt) || 0;
      const total = Number(totalCount.rows[0]?.cnt) || 1;
      
      // Get KR target_value and calculate proportional progress
      const krRes = await db.execute("SELECT target_value FROM key_results WHERE id = ?", [task.key_result_id]);
      const targetValue = Number(krRes.rows[0]?.target_value) || 100;
      const newValue = Math.round((done / total) * targetValue * 100) / 100;
      
      await db.execute({
        sql: "UPDATE key_results SET current_value = ? WHERE id = ?",
        args: [newValue, task.key_result_id]
      });
    }

    return NextResponse.json({ success: true, newStatus, approvalType });
  } catch (error: any) {
    console.error("Task Status Change Error:", error);
    return NextResponse.json({ error: "Gagal update status task", details: error.message }, { status: 500 });
  }
}
