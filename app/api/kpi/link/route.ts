import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Create a task-KPI link (employee self-tags)
export async function POST(request: Request) {
  try {
    const { taskId, kpiId, weeklyTargetId } = await request.json();

    if (!taskId || !kpiId) {
      return NextResponse.json({ error: "taskId dan kpiId wajib diisi" }, { status: 400 });
    }

    await db.execute({
      sql: "INSERT INTO task_kpi_links (task_id, kpi_id, weekly_target_id, linked_by, status) VALUES (?, ?, ?, 'employee', 'pending')",
      args: [taskId, kpiId, weeklyTargetId || null]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KPI Link Error:", error);
    return NextResponse.json({ error: "Gagal membuat link", details: error.message }, { status: 500 });
  }
}

