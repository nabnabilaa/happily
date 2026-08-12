import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTriggerKey, dispatchNotification } from "@/lib/notificationService";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { userId, mood, energy, tag } = await request.json();

    // Identitas dari cookie sesi. Check-in mood adalah data wellbeing pribadi.
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

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

