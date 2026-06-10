import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const body = await request.json();
    const { action, userId, userName, userAvatar, targetId, title, description, durationMins, mode } = body;
    
    const channelName = `presence-focus-${roomId}`;

    if (action === 'JOIN') {
      await db.execute(`
        INSERT INTO focus_room_participants (room_id, user_id, status, is_host)
        VALUES (?, ?, 'joined', 0)
        ON DUPLICATE KEY UPDATE status = 'joined'
      `, [roomId, userId]);
      
      await pusher.trigger(channelName, 'room-event', {
        type: 'JOIN',
        user: { id: userId, name: userName, avatar: userAvatar, isHost: false },
        timestamp: Date.now()
      });
    } 
    else if (action === 'START') {
      // Host updates room settings and starts
      await db.execute(`
        UPDATE focus_rooms 
        SET status = 'started', started_at = CURRENT_TIMESTAMP, 
            name = ?, description = ?, duration_mins = ?, mode = ?
        WHERE id = ? AND host_id = ?
      `, [title || 'Sesi Fokus', description || null, durationMins || 25, mode || 'hardcore', roomId, userId]);

      await pusher.trigger(channelName, 'room-event', {
        type: 'START',
        title, duration: durationMins, mode, timestamp: Date.now()
      });
      // Optionally trigger lobby update
      await pusher.trigger('presence-lobby', 'lobby-update', {});
    }
    else if (action === 'FAIL' || action === 'LEAVE') {
      await db.execute(`
        UPDATE focus_room_participants SET status = 'left' 
        WHERE room_id = ? AND user_id = ?
      `, [roomId, userId]);

      await pusher.trigger(channelName, 'room-event', {
        type: action, // 'FAIL' or 'LEAVE'
        userId, userName, timestamp: Date.now()
      });
    }
    else if (action === 'KICK') {
      await db.execute(`
        UPDATE focus_room_participants SET status = 'left' 
        WHERE room_id = ? AND user_id = ?
      `, [roomId, targetId]);

      await pusher.trigger(channelName, 'room-event', {
        type: 'KICK',
        kickedUserId: targetId, timestamp: Date.now()
      });
    }
    else if (action === 'TRANSFER_HOST') {
      await db.transaction(async (conn) => {
        // Demote current host
        await conn.execute(`UPDATE focus_room_participants SET is_host = 0 WHERE room_id = ? AND user_id = ?`, [roomId, userId]);
        // Promote new host
        await conn.execute(`UPDATE focus_room_participants SET is_host = 1 WHERE room_id = ? AND user_id = ?`, [roomId, targetId]);
        // Update room host
        await conn.execute(`UPDATE focus_rooms SET host_id = ? WHERE id = ?`, [targetId, roomId]);
      });

      await pusher.trigger(channelName, 'room-event', {
        type: 'TRANSFER_HOST',
        newHostId: targetId, timestamp: Date.now()
      });
    }
    else if (action === 'ABORT_URGENT') {
      await db.execute(`UPDATE focus_rooms SET status = 'aborted' WHERE id = ?`, [roomId]);
      
      await pusher.trigger(channelName, 'room-event', {
        type: 'ABORT_URGENT', timestamp: Date.now()
      });
      await pusher.trigger('presence-lobby', 'lobby-update', {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Focus room action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
