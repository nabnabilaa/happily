import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

export async function POST(request: Request) {
  try {
    const { senderId, title, message, type = 'announcement' } = await request.json();

    if (!senderId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Identify team of sender
    const userRes = await db.execute({
      sql: "SELECT role, team_id FROM users WHERE id = ?",
      args: [senderId]
    });
    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    const senderRole = userRes.rows[0].role;
    const teamId = userRes.rows[0].team_id;
    let targetUsers = [];

    if (senderRole === 'hr' || senderRole === 'admin') {
      // Broadcast to ALL users
      const allRes = await db.execute({ sql: "SELECT id FROM users" });
      targetUsers = allRes.rows;
    } else {
      // Broadcast to team members only
      const teamRes = await db.execute({
        sql: "SELECT id FROM users WHERE team_id = ?",
        args: [teamId]
      });
      targetUsers = teamRes.rows;
    }

    // Dispatch notifications
    for (const u of targetUsers) {
      // Don't notify self
      if (u.id === senderId) continue;
      
      await dispatchNotification(u.id as string, type, {
        title: title,
        message: message
      });
    }

    return NextResponse.json({ success: true, broadcastCount: targetUsers.length - 1 });
  } catch (error: any) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
