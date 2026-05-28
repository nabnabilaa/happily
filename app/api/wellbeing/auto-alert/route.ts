import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hpEventEmitter } from "@/lib/events";

// Auto-initialize the table if it doesn't exist
try {
  // Clean up any malformed legacy tables with TEXT primary keys
  db.execute(`DROP TABLE IF EXISTS chat_messages`);
  db.execute(`DROP TABLE IF EXISTS chat_channels`);

  db.execute(`
    CREATE TABLE IF NOT EXISTS chat_channels (
      id VARCHAR(255) PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(255) PRIMARY KEY,
      channel_id VARCHAR(255) NOT NULL,
      sender_id VARCHAR(255) NOT NULL,
      sender_name TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(channel_id) REFERENCES chat_channels(id)
    )
  `);
} catch (e) {
  console.error("Failed to initialize chat tables", e);
}

export async function POST(req: Request) {
  try {
    const { userId, userName } = await req.json();

    if (!userId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate a predictable channel ID for HR-Employee direct message
    const channelId = `hr-dm-${userId}`;
    
    // Check if channel exists, if not create it
    const existing = await db.execute(`SELECT id FROM chat_channels WHERE id = ?`, [channelId]);
    const channelExists = existing.rows.length > 0;
    
    if (!channelExists) {
      await db.execute(
        `INSERT INTO chat_channels (id, name, type) VALUES (?, ?, ?)`,
        [channelId, `HR & ${userName}`, 'dm']
      );
    }

    // Send the automated message
    const msgId = `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const text = `Hai ${userName}, kami dari HR Department melihat akhir-akhir ini beban kerjamu cukup berat dan indikator kesejahteraanmu menurun. Jangan lupa istirahat ya. Balas pesan ini jika kamu ingin menjadwalkan ngobrol santai dengan kami. Kami di sini untuk mendukungmu! 💙`;
    
    await db.execute(
      `INSERT INTO chat_messages (id, channel_id, sender_id, sender_name, text) VALUES (?, ?, ?, ?, ?)`,
      [msgId, channelId, 'hr-system', 'HR Department', text]
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
