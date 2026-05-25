import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

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

// GET: Fetch today's tasks for extension
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const res = await db.execute({
      sql: `SELECT id, title, goal_title, is_done, energy_level, est_time, tone, kpi_id 
            FROM daily_priorities WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
      args: [userId]
    });

    const tasks = res.rows.map(r => ({
      id: String(r.id),
      title: r.title,
      goal: r.goal_title || '',
      done: !!r.is_done,
      energy: r.energy_level || 'mid',
      est: r.est_time || '30m',
      tone: r.tone || 'sage',
      kpiId: r.kpi_id || null,
      date: new Date().toDateString(),
    }));

    return NextResponse.json({ tasks }, { headers: getCorsHeaders(request) });
  } catch (error: any) {
    console.error("Ext Tasks Error:", error);
    return NextResponse.json(
      { error: "Failed", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
