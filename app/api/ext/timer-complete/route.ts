import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// POST: Record a completed focus session from extension
export async function POST(request: Request) {
  try {
    const { userId, durationMinutes, label } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const mins = Number(durationMinutes) || 25;

    // Award XP for focus session
    const txId = "tx_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await db.execute({
      sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
      args: [txId, userId, 20, "focus_session", `Sesi fokus ${mins} menit — ${label || 'Deep Work'}`]
    });

    await db.execute({
      sql: "UPDATE users SET points = points + 20, coins = coins + 5 WHERE id = ?",
      args: [userId]
    });

    return NextResponse.json({ success: true, xpAwarded: 20 });
  } catch (error: any) {
    console.error("Timer Complete Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}
