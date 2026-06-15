import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") || "2026-Q3";
    const divisionId = request.nextUrl.searchParams.get("divisionId");
    const approvalType = request.nextUrl.searchParams.get("approvalType");

    // All OKRs with progress
    let okrSql = `SELECT o.*, d.name as division_name, u.name as owner_name
                   FROM okrs o
                   LEFT JOIN departments d ON o.division_id = d.id
                   LEFT JOIN users u ON o.owner_id = u.id
                   WHERE o.period = ?`;
    const okrArgs: any[] = [period];

    if (divisionId) {
      okrSql += " AND (o.division_id = ? OR o.type = 'company')";
      okrArgs.push(divisionId);
    }
    okrSql += " ORDER BY FIELD(o.type, 'company', 'team', 'individual')";

    const okrRes = await db.execute(okrSql, okrArgs);

    // All tasks with approval info
    let taskSql = `SELECT t.*, a.name as assignee_name, a.role as assignee_role, a.division_id,
                          d.name as division_name, kr.title as kr_title
                   FROM okr_tasks t
                   LEFT JOIN users a ON t.assignee_id = a.id
                   LEFT JOIN departments d ON a.division_id = d.id
                   LEFT JOIN key_results kr ON t.key_result_id = kr.id
                   WHERE 1=1`;
    const taskArgs: any[] = [];

    if (approvalType) {
      taskSql += " AND t.approval_type = ?";
      taskArgs.push(approvalType);
    }
    if (divisionId) {
      taskSql += " AND a.division_id = ?";
      taskArgs.push(divisionId);
    }
    taskSql += " ORDER BY t.updated_at DESC";

    const taskRes = await db.execute(taskSql, taskArgs);

    // Summary stats
    const statsRes = await db.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
        SUM(CASE WHEN approval_type = 'reviewed' THEN 1 ELSE 0 END) as reviewed_count,
        SUM(CASE WHEN approval_type = 'self_approved' THEN 1 ELSE 0 END) as self_approved_count
      FROM okr_tasks
    `);

    return NextResponse.json({
      okrs: okrRes.rows,
      tasks: taskRes.rows,
      stats: statsRes.rows[0] || {},
      period
    });
  } catch (error: any) {
    console.error("OKR Reports Error:", error);
    return NextResponse.json({ error: "Failed to load reports", details: error.message }, { status: 500 });
  }
}
