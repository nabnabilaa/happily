import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { calculateTriggerKey, dispatchNotification } from "@/lib/notificationService";

export async function POST(request: Request) {
  try {
    const { userId, mood, energy, tag } = await request.json();

    if (!userId || !mood) {
      return NextResponse.json({ error: "userId dan mood wajib diisi" }, { status: 400 });
    }

    // Insert mood check-in to time-series table
    await db.execute({
      sql: "INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag) VALUES (?, ?, ?, ?)",
      args: [userId, mood, energy || null, tag || null]
    });

    // Also update user's current mood (for quick access)
    await db.execute({
      sql: "UPDATE users SET mood_key = ? WHERE id = ?",
      args: [mood, userId]
    });

    // Calculate trigger key based on Mood, Energy and Tag using the priority weighting system
    const triggerKey = calculateTriggerKey(mood, energy || null, tag || null);
    
    // Dispatch template notification (Zero LLM cost!)
    await dispatchNotification(userId, triggerKey, {
      mood: mood,
      energy: energy || "sedang",
      tag: tag || "biasa"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mood Check-in Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan mood", details: error.message }, { status: 500 });
  }
}
