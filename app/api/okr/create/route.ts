import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, objective_title, period, parent_okr_id, division_id, assignees } = body;

    if (!userId || !type || !objective_title || !period) {
      return NextResponse.json({ error: "userId, type, objective_title, dan period wajib diisi" }, { status: 400 });
    }

    // Get user
    const userRes = await db.execute("SELECT id, role, division_id FROM users WHERE id = ?", [userId]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Permission checks
    if (type === "company" && user.role !== "hr") {
      return NextResponse.json({ error: "Hanya HR yang bisa membuat Company OKR" }, { status: 403 });
    }
    if (type === "team" && user.role !== "manager") {
      return NextResponse.json({ error: "Hanya Manager yang bisa membuat Team OKR" }, { status: 403 });
    }
    if (type === "assigned" && user.role !== "manager") {
      return NextResponse.json({ error: "Hanya Manager yang bisa membuat Assigned OKR" }, { status: 403 });
    }

    if (type === "assigned" && Array.isArray(assignees) && assignees.length > 0) {
      for (const assigneeId of assignees) {
         const id = "okr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
         await db.execute({
           sql: `INSERT INTO okrs (id, type, owner_id, division_id, parent_okr_id, period, objective_title, created_by)
                 VALUES (?, 'individual', ?, ?, ?, ?, ?, ?)`,
           args: [id, assigneeId, user.division_id, parent_okr_id || null, period, objective_title, userId]
         });
      }
      return NextResponse.json({ success: true, message: "Assigned OKRs created" });
    }

    const id = "okr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const ownerId = type === "company" ? null : userId;
    const divId = type === "company" ? null : (type === "team" ? (division_id || user.division_id) : user.division_id);

    await db.execute({
      sql: `INSERT INTO okrs (id, type, owner_id, division_id, parent_okr_id, period, objective_title, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, type, ownerId, divId, parent_okr_id || null, period, objective_title, userId]
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Create OKR Error:", error);
    return NextResponse.json({ error: "Gagal membuat OKR", details: error.message }, { status: 500 });
  }
}
