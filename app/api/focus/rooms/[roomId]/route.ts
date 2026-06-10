import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;

    const roomRes = await db.execute(`
      SELECT fr.id, fr.name, fr.mode, fr.duration_mins, fr.status, fr.host_id, fr.started_at,
             u.name as host_name, u.avatar_image as host_avatar
      FROM focus_rooms fr
      JOIN users u ON fr.host_id = u.id
      WHERE fr.id = ?
    `, [roomId]);

    if (roomRes.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const r = roomRes.rows[0];

    const partsRes = await db.execute(`
      SELECT fp.user_id, fp.status, fp.is_host, u.name, u.avatar_image as avatar
      FROM focus_room_participants fp
      JOIN users u ON fp.user_id = u.id
      WHERE fp.room_id = ? AND fp.status != 'left'
    `, [roomId]);

    const participants = partsRes.rows.map(p => ({
      id: p.user_id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host === 1,
      status: p.status
    }));

    return NextResponse.json({
      room: {
        id: r.id,
        name: r.name,
        mode: r.mode,
        durationMins: r.duration_mins,
        status: r.status,
        hostId: r.host_id,
        startedAt: r.started_at,
        participants
      }
    });
  } catch (error: any) {
    console.error('Focus room details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
