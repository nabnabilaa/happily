import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// GET: Fetch task-KPI links for review (Manager sees all pending links from team)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const month = searchParams.get('month') || new Date().getMonth() + 1;
    const year = searchParams.get('year') || new Date().getFullYear();

    if (!managerId) return NextResponse.json({ error: "managerId required" }, { status: 400 });

    // Get all KPIs assigned by this manager
    const kpisRes = await db.execute({
      sql: `SELECT k.id, k.title, k.weight, k.assigned_to, u.name as employee_name
            FROM monthly_kpis k
            JOIN users u ON k.assigned_to = u.id
            WHERE k.assigned_by = ? AND k.month = ? AND k.year = ? AND k.status = 'active'`,
      args: [managerId, Number(month), Number(year)]
    });

    // For each KPI, get linked tasks
    const reviewData = await Promise.all(kpisRes.rows.map(async (kpi) => {
      const linksRes = await db.execute({
        sql: `SELECT tkl.*, dp.title as task_title, dp.is_done as task_done, dp.created_at as task_date
              FROM task_kpi_links tkl
              JOIN daily_priorities dp ON tkl.task_id = dp.id
              WHERE tkl.kpi_id = ?
              ORDER BY tkl.created_at DESC`,
        args: [String(kpi.id)]
      });

      return {
        kpiId: kpi.id,
        kpiTitle: kpi.title,
        weight: Number(kpi.weight),
        employeeId: kpi.assigned_to,
        employeeName: kpi.employee_name,
        links: linksRes.rows.map(l => ({
          id: l.id,
          taskId: l.task_id,
          taskTitle: l.task_title,
          taskDone: !!l.task_done,
          taskDate: l.task_date,
          linkedBy: l.linked_by,
          status: l.status,
          reviewedAt: l.reviewed_at,
        }))
      };
    }));

    return NextResponse.json({ reviewData });
  } catch (error: any) {
    console.error("KPI Review GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat review data", details: error.message }, { status: 500 });
  }
}

// PUT: Approve / Reject / Move a task-KPI link
export async function PUT(request: Request) {
  try {
    const { linkId, action, newKpiId, reviewedBy } = await request.json();
    // action: 'approve' | 'reject' | 'move'

    if (!linkId || !action) {
      return NextResponse.json({ error: "linkId dan action wajib diisi" }, { status: 400 });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (action === 'approve') {
      await db.execute({
        sql: "UPDATE task_kpi_links SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        args: [reviewedBy, now, linkId]
      });
    } else if (action === 'reject') {
      await db.execute({
        sql: "UPDATE task_kpi_links SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        args: [reviewedBy, now, linkId]
      });
    } else if (action === 'move' && newKpiId) {
      await db.execute({
        sql: "UPDATE task_kpi_links SET kpi_id = ?, status = 'moved', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        args: [newKpiId, reviewedBy, now, linkId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KPI Review PUT Error:", error);
    return NextResponse.json({ error: "Gagal update review", details: error.message }, { status: 500 });
  }
}
