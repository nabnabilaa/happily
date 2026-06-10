import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const roomsResult = await db.execute(`
      SELECT fr.id, fr.name, fr.description, fr.mode, fr.duration_mins, fr.status, fr.host_id, fr.started_at,
             u.name as host_name, u.avatar_image as host_avatar
      FROM focus_rooms fr
      JOIN users u ON fr.host_id = u.id
      WHERE fr.status IN ('waiting', 'started')
      ORDER BY fr.created_at DESC
    `);

    // Fetch participants for these rooms
    const roomIds = roomsResult.rows.map(r => r.id);
    let participantsMap: Record<string, any[]> = {};
    
    if (roomIds.length > 0) {
      const placeholders = roomIds.map(() => '?').join(',');
      const partsResult = await db.execute(`
        SELECT fp.room_id, fp.user_id, fp.status, fp.is_host, u.name, u.avatar_image as avatar
        FROM focus_room_participants fp
        JOIN users u ON fp.user_id = u.id
        WHERE fp.room_id IN (${placeholders}) AND fp.status != 'left'
      `, roomIds);

      partsResult.rows.forEach(p => {
        if (!participantsMap[p.room_id]) participantsMap[p.room_id] = [];
        participantsMap[p.room_id].push({
          id: p.user_id,
          name: p.name,
          avatar: p.avatar,
          isHost: p.is_host === 1,
          status: p.status
        });
      });
    }

    const activeRooms = roomsResult.rows.map(r => {
      // Calculate remaining minutes if started
      let remainingMins = r.duration_mins;
      if (r.started_at && r.status === 'started') {
        const elapsedSecs = Math.floor((Date.now() - new Date(r.started_at).getTime()) / 1000);
        remainingMins = Math.max(1, Math.ceil((r.duration_mins * 60 - elapsedSecs) / 60));
      }

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        mode: r.mode,
        durationMins: r.duration_mins,
        remainingMins,
        status: r.status,
        host: { id: r.host_id, name: r.host_name, avatar: r.host_avatar },
        code: r.id, // using id as code for simplicity
        participants: participantsMap[r.id] || []
      };
    });

    return NextResponse.json({ rooms: activeRooms });
  } catch (error: any) {
    console.error('Focus rooms GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, mode, durationMins, hostId } = await request.json();

    if (!name || !hostId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a short code for the room ID
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();

    await db.transaction(async (conn) => {
      await conn.execute(`
        INSERT INTO focus_rooms (id, name, mode, duration_mins, status, host_id)
        VALUES (?, ?, ?, ?, 'waiting', ?)
      `, [roomId, name, mode || 'hardcore', durationMins || 25, hostId]);

      await conn.execute(`
        INSERT INTO focus_room_participants (room_id, user_id, status, is_host)
        VALUES (?, ?, 'joined', 1)
      `, [roomId, hostId]);
    });

    // Note: To notify lobby clients, we could use Pusher here.
    // However, it's optional, since they can fetch periodically or we can trigger it.
    // For now, rely on fetch.

    return NextResponse.json({ roomId, success: true });
  } catch (error: any) {
    console.error('Focus rooms POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
