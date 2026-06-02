import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hpEventEmitter } from "@/lib/events";

// Chat tables are now centrally managed in app/api/migrate-schema/route.ts as message_channels & messages.

export async function POST(req: Request) {
  try {
    const { userId, userName } = await req.json();

    if (!userId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Predictable DM channel ID
    const channelId = `hr-dm-${userId}`;

    // Get an HR user to act as sender/creator from database
    const hrUserRes = await db.execute(`SELECT id, name FROM users WHERE role = 'hr' ORDER BY id LIMIT 1`);
    const hrUser = hrUserRes.rows[0] || { id: 'user_hr', name: 'Maya Sari (HR)' };
    
    // Check if channel exists in message_channels, if not create it
    const existing = await db.execute(`SELECT id FROM message_channels WHERE id = ?`, [channelId]);
    const channelExists = existing.rows.length > 0;
    
    if (!channelExists) {
      // Create message_channel
      await db.execute(
        `INSERT INTO message_channels (id, name, type, created_by) VALUES (?, ?, ?, ?)`,
        [channelId, `HR & ${userName}`, 'dm', hrUser.id]
      );

      // Add members to message_channel_members
      try {
        await db.execute(
          `INSERT IGNORE INTO message_channel_members (channel_id, user_id) VALUES (?, ?)`,
          [channelId, hrUser.id]
        );
        await db.execute(
          `INSERT IGNORE INTO message_channel_members (channel_id, user_id) VALUES (?, ?)`,
          [channelId, userId]
        );
      } catch (memErr) {
        console.error("Failed to insert channel members:", memErr);
      }
    }

    // Send the automated message into messages
    const msgId = "msg_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const text = `Hai ${userName}, kami dari HR Department melihat akhir-akhir ini beban kerjamu cukup berat dan indikator kesejahteraanmu menurun. Jangan lupa istirahat ya. Balas pesan ini jika kamu ingin menjadwalkan ngobrol santai dengan kami. Kami di sini untuk mendukungmu! 💙`;
    
    await db.execute(
      `INSERT INTO messages (id, channel_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'text')`,
      [msgId, channelId, hrUser.id, text]
    );

    // Emit event to notify user via SSE
    hpEventEmitter.emit('db_update', { 
      type: 'new_message', 
      targetUserId: userId,
      channelId,
      messageId: msgId,
      title: 'Pesan Baru dari HR',
      text: 'HR Department mengirimkan pesan untukmu.'
    });

    return NextResponse.json({ success: true, channelId, messageId: msgId });
  } catch (error: any) {
    console.error("Auto Alert Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
