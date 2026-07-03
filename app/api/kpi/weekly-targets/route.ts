import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch weekly targets for a KPI
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('kpiId');

    if (!kpiId) {
      return NextResponse.json({ error: "kpiId required" }, { status: 400 });
    }

    const res = await db.execute({
      sql: `SELECT * FROM weekly_targets WHERE kpi_id = ? ORDER BY week_number ASC, created_at DESC`,
      args: [kpiId]
    });

    const weeklyTargets = res.rows.map(r => ({
      id: r.id,
      kpiId: r.kpi_id,
      title: r.title,
      description: r.description,
      weekNumber: Number(r.week_number),
      targetValue: r.target_value !== null ? Number(r.target_value) : 100,
      currentValue: r.current_value !== null ? Number(r.current_value) : 0,
      metricUnit: r.metric_unit || '%',
      status: r.status || 'active',
      createdAt: r.created_at
    }));

    return NextResponse.json({ weeklyTargets });
  } catch (error: any) {
    console.error("Weekly Targets GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat target mingguan", details: error.message }, { status: 500 });
  }
}

// POST: Create a new weekly target
export async function POST(request: Request) {
  try {
    const { kpiId, title, description, weekNumber, targetValue, metricUnit } = await request.json();

    if (!kpiId || !title || weekNumber === undefined) {
      return NextResponse.json({ error: "kpiId, title, dan weekNumber wajib diisi" }, { status: 400 });
    }

    const id = "wt_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    await db.execute({
      sql: `INSERT INTO weekly_targets (id, kpi_id, title, description, week_number, target_value, metric_unit) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, kpiId, title, description || '', Number(weekNumber), Number(targetValue) || 100, metricUnit || '%']
    });

    return NextResponse.json({ success: true, weeklyTargetId: id });
  } catch (error: any) {
    console.error("Weekly Targets POST Error:", error);
    return NextResponse.json({ error: "Gagal membuat target mingguan", details: error.message }, { status: 500 });
  }
}

// PUT: Update weekly target
export async function PUT(request: Request) {
  try {
    const { id, title, description, weekNumber, targetValue, currentValue, status, metricUnit } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (title !== undefined) { updates.push("title = ?"); args.push(title); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (weekNumber !== undefined) { updates.push("week_number = ?"); args.push(Number(weekNumber)); }
    if (targetValue !== undefined) { updates.push("target_value = ?"); args.push(Number(targetValue)); }
    if (currentValue !== undefined) { updates.push("current_value = ?"); args.push(Number(currentValue)); }
    if (status !== undefined) { updates.push("status = ?"); args.push(status); }
    if (metricUnit !== undefined) { updates.push("metric_unit = ?"); args.push(metricUnit); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE weekly_targets SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Weekly Targets PUT Error:", error);
    return NextResponse.json({ error: "Gagal update target mingguan", details: error.message }, { status: 500 });
  }
}

// PATCH: Add delta to current_value (used when task is completed)
export async function PATCH(request: Request) {
  try {
    const { id, delta } = await request.json();
    if (!id || delta === undefined) {
      return NextResponse.json({ error: "id dan delta wajib diisi" }, { status: 400 });
    }
    await db.execute({
      sql: `UPDATE weekly_targets SET current_value = GREATEST(0, COALESCE(current_value, 0) + ?) WHERE id = ?`,
      args: [Number(delta), id]
    });
    const res = await db.execute({ sql: `SELECT current_value, target_value FROM weekly_targets WHERE id = ?`, args: [id] });
    return NextResponse.json({ success: true, currentValue: Number(res.rows[0]?.current_value) || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal update progres target", details: error.message }, { status: 500 });
  }
}

// DELETE: Remove weekly target
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.execute({ sql: "DELETE FROM weekly_targets WHERE id = ?", args: [id] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Weekly Targets DELETE Error:", error);
    return NextResponse.json({ error: "Gagal menghapus target mingguan", details: error.message }, { status: 500 });
  }
}
