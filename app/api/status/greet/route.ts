import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerRealtimeUpdate } from "@/lib/realtime";

export async function POST(request: Request) {
  try {
    const { senderId, senderName, receiverId, type } = await request.json();

    if (!senderId || !receiverId) {
      return NextResponse.json({ error: "senderId and receiverId are required" }, { status: 400 });
    }

    if (senderId === receiverId) {
      return NextResponse.json({ error: "Cannot greet yourself" }, { status: 400 });
    }

    // ── Batas kesopanan ──────────────────────────────────────────────
    // Senggol sengaja TIDAK berpoin: biayanya cuma satu tap tanpa pesan, jadi
    // nilai berapa pun akan diperah — dan begitu 👋 punya harga, orang mengirim
    // 👋 demi harganya dan penerima berhenti menganggapnya tulus. Apresiasi
    // (yang menuntut pesan tertulis) yang mengisi peran itu.
    //
    // Yang tetap dibutuhkan adalah rem terhadap spam notifikasi: tanpa ini satu
    // orang bisa membanjiri rekannya tanpa batas. Bukan aturan ekonomi, tapi
    // aturan sopan santun.
    const [dailyRes, pairRes] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) AS c FROM senggol_log
               WHERE sender_id = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)`,
        args: [senderId],
      }),
      db.execute({
        sql: `SELECT COUNT(*) AS c FROM senggol_log
               WHERE sender_id = ? AND receiver_id = ?
                 AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)`,
        args: [senderId, receiverId],
      }),
    ]);

    if ((Number(dailyRes.rows[0]?.c) || 0) >= 10) {
      return NextResponse.json(
        { error: "Kamu sudah banyak menyenggol hari ini. Coba lagi besok ya!" },
        { status: 429 },
      );
    }

    if ((Number(pairRes.rows[0]?.c) || 0) >= 1) {
      return NextResponse.json(
        { error: "Kamu sudah menyenggol orang ini hari ini." },
        { status: 429 },
      );
    }

    await db.execute({
      sql: "INSERT INTO senggol_log (sender_id, receiver_id, type) VALUES (?, ?, ?)",
      args: [senderId, receiverId, type || 'greet'],
    });

    let title = "Sapaan Baru 👋";
    let message = `${senderName || 'Seseorang'} menyapamu!`;
    let notifType = "info";

    if (type === "coffee") {
      title = "Ajak Ngopi ☕";
      message = `${senderName || 'Seseorang'} mengajakmu ngopi bareng!`;
      notifType = "warning"; // Use warning color for coffee to make it stand out a bit
    }

    const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    await db.execute({
      sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
      args: [notifId, receiverId, title, message, notifType]
    });

    // Trigger realtime update to the receiver
    await triggerRealtimeUpdate(receiverId, {
      type: "new_message",
      title: title,
      text: message,
    });

    return NextResponse.json({ success: true, message: "Greet sent successfully" });
  } catch (error: any) {
    console.error("Greet Error:", error);
    return NextResponse.json({ error: "Failed to send greet", details: error.message }, { status: 500 });
  }
}
