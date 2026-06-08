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
