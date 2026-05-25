import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Save push subscription for a user
export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json();
    if (!userId || !subscription) {
      return NextResponse.json({ error: "userId and subscription required" }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    // Upsert: remove old subscriptions for this endpoint, insert new
    await db.execute({
      sql: "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      args: [userId, endpoint]
    });

    await db.execute({
      sql: "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)",
      args: [userId, endpoint, keys.p256dh, keys.auth]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push Subscribe Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}

// DELETE: Remove push subscription
export async function DELETE(request: Request) {
  try {
    const { userId, endpoint } = await request.json();
    await db.execute({
      sql: "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      args: [userId, endpoint]
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

