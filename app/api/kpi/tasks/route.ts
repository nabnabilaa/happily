import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });

    const res = await db.execute({
      sql: `SELECT id, title, is_done, description, created_at, target_date, weekly_target_id, weekly_target_title
            FROM daily_priorities 
            WHERE goal_id = ? OR kpi_id = ?
            ORDER BY created_at DESC`,
      args: [goalId, goalId]
    });

    const tasks = res.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      done: !!r.is_done,
      description: r.description,
      createdAt: r.created_at,
      targetDate: r.target_date,
      weekly_target_id: r.weekly_target_id || null,
      weekly_target_title: r.weekly_target_title || null
    }));

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("KPI Tasks Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}

