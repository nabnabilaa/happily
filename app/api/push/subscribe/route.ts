import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json();

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "userId dan subscription wajib diisi" }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh || "";
    const auth = keys?.auth || "";

    if (!p256dh || !auth) {
      return NextResponse.json({ error: "Keys p256dh dan auth wajib diisi" }, { status: 400 });
    }

    // Insert or update subscription
    await db.execute({
      sql: `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            p256dh = VALUES(p256dh), 
            auth = VALUES(auth)`,
      args: [userId, endpoint, p256dh, auth]
    });

    return NextResponse.json({ success: true, message: "Subscription saved successfully" });
  } catch (error: any) {
    console.error("Save Push Subscription Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan subskripsi push", details: error.message }, { status: 500 });
  }
}
