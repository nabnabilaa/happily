import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { goalId, status, requesterId } = await req.json();

    if (!goalId || !status || !requesterId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if requester is manager or hr
    const roleCheck = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [requesterId]
    });
    const role = (roleCheck.rows[0] as any)?.role;
    if (role !== 'hr' && role !== 'manager') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update goal status
    await db.execute({
      sql: "UPDATE goals SET status = ? WHERE id = ?",
      args: [status, goalId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve Goal Error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
