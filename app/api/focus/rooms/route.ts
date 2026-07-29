import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/authSession';
import { triggerPusherEvent } from '@/lib/pusher';
import {
  findActiveSessionElsewhere,
  generateUniqueJoinCode,
  getParticipants,
  interruptBudget,
  isActive,
  logRoomEvent,
  newRoomId,
  reapStaleRooms,
  type FocusMode,
  type JoinPolicy,
  type RoomVisibility,
} from '@/lib/focusRoom';

const MAX_DURATION_MINS = 300;
const MIN_DURATION_MINS = 5;

/**
 * Daftar ruangan untuk lobby.
 *
 * Yang TIDAK dikirim ke sini sama pentingnya dengan yang dikirim: `join_code`
 * tidak pernah ikut. Sebelumnya kode setiap ruangan dikirim ke semua klien yang
 * memuat dashboard, jadi gerbang "minta kode dari host" sepenuhnya kosmetik.
 */
export async function GET(request: Request) {
  try {
    const viewerId = getAuthUserId(request);

    // Ruangan yang sudah lewat waktunya dibereskan di sini juga, supaya tidak
    // ada job latar yang wajib hidup agar lobby tetap benar.
    await reapStaleRooms().catch((e) => console.warn('[focus] reap gagal:', e));

    const roomsResult = await db.execute(`
      SELECT fr.*, u.name AS host_name, u.avatar_image AS host_avatar
        FROM focus_rooms fr
        JOIN users u ON fr.host_id = u.id
       WHERE fr.status IN ('waiting', 'running')
         AND fr.visibility IN ('public', 'code')
       ORDER BY fr.created_at DESC
       LIMIT 60
    `);

    const rooms = [];
    for (const r of roomsResult.rows) {
      const participants = (await getParticipants(String(r.id))).filter(isActive);
      const nowMs = Date.now();
      const endsAtMs = r.ends_at ? new Date(r.ends_at).getTime() : null;

      rooms.push({
        id: String(r.id),
        name: r.name,
        description: r.description,
        mode: r.mode as FocusMode,
        status: r.status,
        visibility: r.visibility as RoomVisibility,
        joinPolicy: r.join_policy as JoinPolicy,
        durationMins: Number(r.duration_mins) || 25,
        maxParticipants: Number(r.max_participants) || 8,
        participantCount: participants.length,
        isFull: participants.length >= (Number(r.max_participants) || 8),
        // Jam selesai, bukan "sisa 23 menit" yang basi begitu selesai dirender.
        endsAt: endsAtMs ? new Date(endsAtMs).toISOString() : null,
        remainingSecs: endsAtMs ? Math.max(0, Math.round((endsAtMs - nowMs) / 1000)) : null,
        host: { id: String(r.host_id), name: r.host_name, avatar: r.host_avatar },
        participants: participants.map((p) => ({
          id: String(p.user_id),
          name: p.name,
          avatar: p.avatar,
          isHost: p.role === 'host',
          role: p.role,
          status: p.status,
        })),
        isParticipant: viewerId
          ? participants.some((p) => String(p.user_id) === String(viewerId))
          : false,
        requiresCode: r.visibility === 'code',
      });
    }

    return NextResponse.json({ rooms, serverNow: new Date().toISOString() });
  } catch (error: any) {
    console.error('Focus rooms GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const hostId = getAuthUserId(request);
    if (!hostId) {
      return NextResponse.json(
        { error: 'Sesi kamu sudah tidak berlaku. Silakan login ulang.' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const solo = Boolean(body.solo);

    // Judul wajib SEJAK PEMBUATAN. Sebelumnya ruangan dibuat dengan nama
    // placeholder ("Budi's Room") dan langsung tampil di lobby, sehingga orang
    // bergabung ke sesi tanpa tahu topiknya lalu terjebak menunggu.
    if (!solo && name.length < 3) {
      return NextResponse.json(
        { error: 'Judul sesi wajib diisi (minimal 3 karakter).' },
        { status: 400 },
      );
    }

    const mode: FocusMode = body.mode === 'zen' ? 'zen' : 'hardcore';
    const durationMins = Math.min(
      MAX_DURATION_MINS,
      Math.max(MIN_DURATION_MINS, Number(body.durationMins) || 25),
    );
    const maxParticipants = solo
      ? 1
      : Math.min(20, Math.max(2, Number(body.maxParticipants) || 8));

    const visibility: RoomVisibility = solo
      ? 'solo'
      : body.visibility === 'code'
        ? 'code'
        : body.visibility === 'invite'
          ? 'invite'
          : 'public';

    const joinPolicy: JoinPolicy =
      body.joinPolicy === 'always_open'
        ? 'always_open'
        : body.joinPolicy === 'locked'
          ? 'locked'
          : 'open_early';

    // Satu orang, satu sesi. Tanpa ini, membuka lima tab menghasilkan lima sesi
    // paralel yang semuanya dibayar.
    const busyIn = await findActiveSessionElsewhere(hostId);
    if (busyIn) {
      return NextResponse.json(
        { error: 'Kamu masih punya sesi fokus yang berjalan. Selesaikan dulu sesi itu.', roomId: busyIn },
        { status: 409 },
      );
    }

    const roomId = newRoomId();
    const joinCode = await generateUniqueJoinCode();

    await db.transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO focus_rooms
           (id, name, description, mode, duration_mins, status, host_id,
            visibility, join_code, join_policy, max_participants, host_last_seen, created_at)
         VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          roomId,
          solo ? name || 'Sesi Fokus Solo' : name,
          String(body.description ?? '').trim() || null,
          mode,
          durationMins,
          hostId,
          visibility,
          joinCode,
          joinPolicy,
          maxParticipants,
        ],
      );
      await conn.execute(
        `INSERT INTO focus_room_participants
           (room_id, user_id, status, is_host, role, joined_at, last_heartbeat, state_changed_at)
         VALUES (?, ?, 'joined', 1, 'host', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [roomId, hostId],
      );
    });

    await logRoomEvent(roomId, 'ROOM_CREATED', {
      actorId: hostId,
      payload: { mode, durationMins, visibility, maxParticipants },
    });

    // Ruangan baru harus langsung terlihat. Versi lama tidak memicu apa pun di
    // sini, jadi ruangan baru bisa tidak pernah muncul di lobby orang lain.
    if (!solo) {
      await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });
    }

    return NextResponse.json({
      success: true,
      roomId,
      joinCode,
      mode,
      durationMins,
      visibility,
      interruptBudget: interruptBudget(durationMins),
    });
  } catch (error: any) {
    console.error('Focus rooms POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
