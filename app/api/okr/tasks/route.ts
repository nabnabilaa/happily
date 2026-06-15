import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - List tasks
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const status = request.nextUrl.searchParams.get("status");
    const filter = request.nextUrl.searchParams.get("filter"); // 'my' | 'review' | 'team'

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const userRes = await db.execute("SELECT id, role, division_id FROM users WHERE id = ?", [userId]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let sql = `SELECT t.*, a.name as assignee_name, c.name as creator_name, kr.title as kr_title, o.objective_title as okr_title
               FROM okr_tasks t
               LEFT JOIN users a ON t.assignee_id = a.id
               LEFT JOIN users c ON t.created_by = c.id
               LEFT JOIN key_results kr ON t.key_result_id = kr.id
               LEFT JOIN okrs o ON kr.okr_id = o.id
               WHERE 1=1`;
    const args: any[] = [];

    if (filter === 'my') {
      sql += " AND t.assignee_id = ?";
      args.push(userId);
    } else if (filter === 'review' && user.role === 'manager') {
      // Tasks pending review from employees in same division
      sql += " AND t.status = 'review' AND t.assignee_id IN (SELECT id FROM users WHERE division_id = ? AND role = 'employee')";
      args.push(user.division_id);
    } else if (filter === 'team' && user.role === 'manager') {
      // All tasks for employees in same division
      sql += " AND t.assignee_id IN (SELECT id FROM users WHERE division_id = ?)";
      args.push(user.division_id);
    } else if (user.role === 'hr') {
      // HR sees everything - no additional filter
    } else {
      // Default for employee: own tasks only
      sql += " AND t.assignee_id = ?";
      args.push(userId);
    }

    if (status) {
      sql += " AND t.status = ?";
      args.push(status);
    }

    sql += " ORDER BY FIELD(t.status, 'review', 'in_progress', 'todo', 'done'), t.created_at DESC";

    const res = await db.execute(sql, args);
    return NextResponse.json({ tasks: res.rows });
  } catch (error: any) {
    console.error("OKR Tasks List Error:", error);
    return NextResponse.json({ error: "Failed to load tasks", details: error.message }, { status: 500 });
  }
}

// POST - Create task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, key_result_id, assignee_id, title, description, due_date } = body;

    if (!userId || !title || !assignee_id) {
      return NextResponse.json({ error: "userId, title, dan assignee_id wajib diisi" }, { status: 400 });
    }

    // Validate creator
    const creatorRes = await db.execute("SELECT id, role, division_id FROM users WHERE id = ?", [userId]);
    const creator = creatorRes.rows[0];
    if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    // Validate assignee
    const assigneeRes = await db.execute("SELECT id, role, division_id FROM users WHERE id = ?", [assignee_id]);
    const assignee = assigneeRes.rows[0];
    if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });

    // Manager can only assign to employees in same division
    if (creator.role === 'manager' && assignee.role === 'employee') {
      if (String(creator.division_id) !== String(assignee.division_id)) {
        return NextResponse.json({ error: "Manager hanya bisa assign task ke Employee di divisi yang sama" }, { status: 403 });
      }
    }

    const id = "okrt_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    await db.execute({
      sql: `INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, description, status, due_date)
            VALUES (?, ?, ?, ?, ?, ?, 'todo', ?)`,
      args: [id, key_result_id || null, assignee_id, userId, title, description || null, due_date || null]
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Create OKR Task Error:", error);
    return NextResponse.json({ error: "Gagal membuat task", details: error.message }, { status: 500 });
  }
}
