import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { senderId, receiverId, senderName, receiverName, valueTag, message } = await request.json();

    if (!senderId || !receiverId || !message) {
      return NextResponse.json({ error: "senderId, receiverId, dan message wajib diisi" }, { status: 400 });
    }

    // Anti-abuse 1: Tidak bisa kirim ke diri sendiri
    if (senderId === receiverId) {
      return NextResponse.json({ error: "Tidak bisa mengirim apresiasi ke diri sendiri" }, { status: 400 });
    }

    // Anti-abuse 2: Max 3 apresiasi per hari
    const today = new Date().toISOString().slice(0, 10);
    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as c FROM kudos WHERE sender_id = ? AND DATE(created_at) = ?",
      args: [senderId, today]
    });
    const countToday = Number(countRes.rows[0]?.c) || 0;
    if (countToday >= 3) {
      return NextResponse.json({ error: "Maksimal 3 apresiasi per hari. Coba lagi besok!" }, { status: 429 });
    }

    // Anti-abuse 3: Cooldown 7 hari per penerima
    const recentRes = await db.execute({
      sql: "SELECT id FROM kudos WHERE sender_id = ? AND receiver_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)",
      args: [senderId, receiverId]
    });
    if (recentRes.rows.length > 0) {
      return NextResponse.json({ error: "Kamu sudah kirim apresiasi ke orang ini minggu ini" }, { status: 429 });
    }

    // Insert kudos
    const kudosId = "kd_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await db.execute({
      sql: "INSERT INTO kudos (id, sender_id, receiver_id, value_tag, message) VALUES (?, ?, ?, ?, ?)",
      args: [kudosId, senderId, receiverId, valueTag || null, message]
    });

    // Award XP to RECEIVER only using absolute URL fetch to trigger the central xp/award endpoint logic
    try {
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      
      await fetch(`${proto}://${host}/api/xp/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: receiverId,
          action: 'apresiasi_received'
        })
      });
    } catch (e) {
      console.warn("Failed to award apresiasi XP:", e);
    }

    // Create notification for receiver
    const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    try {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [notifId, receiverId, `🌱 ${senderName || 'Seseorang'} mengirim apresiasi`, message, 'success']
      });
    } catch (e) {
      console.warn("Failed to create notification:", e);
    }

    return NextResponse.json({ 
      success: true, 
      kudosId,
      message: "Apresiasi terkirim!",
      remaining: 3 - countToday - 1
    });
  } catch (error: any) {
    console.error("Kudos Error:", error);
    return NextResponse.json({ error: "Gagal mengirim apresiasi", details: error.message }, { status: 500 });
  }
}

// GET: Fetch kudos feed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') || '20';

    let sql = `SELECT k.*, 
               s.name as sender_name, s.avatar_image as sender_avatar,
               r.name as receiver_name, r.avatar_image as receiver_avatar
               FROM kudos k 
               JOIN users s ON k.sender_id = s.id 
               JOIN users r ON k.receiver_id = r.id 
               ORDER BY k.created_at DESC LIMIT ?`;
    let args: any[] = [Number(limit)];

    // If userId specified, get kudos involving that user
    if (userId) {
      sql = `SELECT k.*, 
             s.name as sender_name, s.avatar_image as sender_avatar,
             r.name as receiver_name, r.avatar_image as receiver_avatar
             FROM kudos k 
             JOIN users s ON k.sender_id = s.id 
             JOIN users r ON k.receiver_id = r.id 
             WHERE k.sender_id = ? OR k.receiver_id = ?
             ORDER BY k.created_at DESC LIMIT ?`;
      args = [userId, userId, Number(limit)];
    }

    const res = await db.execute({ sql, args });
    const feed = res.rows.map(r => ({
      id: r.id,
      from: r.sender_name,
      to: r.receiver_name,
      value: r.value_tag,
      msg: r.message,
      time: r.created_at,
      senderAvatar: r.sender_avatar,
      receiverAvatar: r.receiver_avatar,
    }));

    return NextResponse.json({ feed });
  } catch (error: any) {
    console.error("Kudos GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat feed", details: error.message }, { status: 500 });
  }
}

