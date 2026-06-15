import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { okr_id, title, target_value, current_value, unit, userId } = body;

    if (!okr_id || !title || !userId) {
      return NextResponse.json({ error: "okr_id, title, dan userId wajib diisi" }, { status: 400 });
    }

    const id = "kr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    await db.execute({
      sql: `INSERT INTO key_results (id, okr_id, title, target_value, current_value, unit)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, okr_id, title, target_value || 100, current_value || 0, unit || '%']
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Create Key Result Error:", error);
    return NextResponse.json({ error: "Gagal membuat Key Result", details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, target_value, current_value, unit } = body;

    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (title !== undefined) { updates.push("title = ?"); args.push(title); }
    if (target_value !== undefined) { updates.push("target_value = ?"); args.push(target_value); }
    if (current_value !== undefined) { updates.push("current_value = ?"); args.push(current_value); }
    if (unit !== undefined) { updates.push("unit = ?"); args.push(unit); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Tidak ada field yang diupdate" }, { status: 400 });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE key_results SET ${updates.join(", ")} WHERE id = ?`,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update Key Result Error:", error);
    return NextResponse.json({ error: "Gagal update Key Result", details: error.message }, { status: 500 });
  }
}
