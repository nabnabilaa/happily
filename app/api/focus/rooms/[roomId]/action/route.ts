import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/authSession';
import { triggerPusherEvent } from '@/lib/pusher';
import {
  can,
  closeRoom,
  electNewHost,
  findActiveSessionElsewhere,
  getParticipant,
  getParticipants,
  getRoom,
  graceSecsFor,
  interruptBudget,
  isActive,
  isBanned,
  isInSession,
  logRoomEvent,
  pendingJoinRequests,
  publicRoom,
  reconcileRoom,
  resumeFromInterrupt,
  settleRoom,
  transferHost,
  type FocusAction,
  type ParticipantRole,
} from '@/lib/focusRoom';

const HOST_OFFER_TTL_SECS = 60;
/** Boleh bergabung terlambat selama masih dalam jendela ini sejak sesi mulai. */
const LATE_JOIN_WINDOW_SECS = 5 * 60;
/** Atau selama sisa waktunya masih cukup untuk sesi yang bermakna. */
const LATE_JOIN_MIN_REMAINING_SECS = 10 * 60;

/**
 * Rem penebakan kode.
 *
 * `/rooms/resolve` sudah dibatasi lajunya, tapi JOIN adalah jalur kedua yang
 * memverifikasi kode — dan id ruangan ber-visibility `code` memang tampil di
 * lobby, jadi tanpa rem ini kode enam karakter bisa diberondong dari sana.
 * Hanya percobaan yang GAGAL yang dihitung: orang yang kodenya benar tidak
 * pernah menyentuh batas ini.
 */
const codeAttempts = new Map<string, { count: number; resetAt: number }>();
const CODE_WINDOW_MS = 60_000;
const CODE_MAX_FAILURES = 5;

function codeAttemptsExhausted(key: string): boolean {
  const entry = codeAttempts.get(key);
  return Boolean(entry && Date.now() <= entry.resetAt && entry.count >= CODE_MAX_FAILURES);
}

function recordCodeFailure(key: string): void {
  const now = Date.now();
  const entry = codeAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    codeAttempts.set(key, { count: 1, resetAt: now + CODE_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (codeAttempts.size > 5000) codeAttempts.clear();
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function broadcast(roomId: string, type: string, payload: Record<string, any> = {}) {
  await triggerPusherEvent(`presence-focus-${roomId}`, 'room-event', {
    type,
    ...payload,
    timestamp: Date.now(),
  });
}

/**
 * Semua aksi ruang fokus lewat sini.
 *
 * Perbedaan mendasar dari versi sebelumnya: identitas pemanggil diambil dari
 * cookie sesi, TIDAK PERNAH dari body. Dulu `userId` dan `targetId` dipercaya
 * apa adanya, sehingga satu `fetch` dari console browser cukup untuk menendang
 * siapa pun, merebut posisi host, atau membubarkan ruangan orang lain.
 */
export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const actorId = getAuthUserId(request);
    if (!actorId) {
      return NextResponse.json(
        { error: 'Sesi kamu sudah tidak berlaku. Silakan login ulang.' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '') as FocusAction;
    const targetId = body.targetId ? String(body.targetId) : null;

    const room = await getRoom(roomId);
    if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

    // ── JOIN ditangani sebelum pemeriksaan keanggotaan ──────────────────────
    if (action === 'JOIN') {
      return await handleJoin(roomId, actorId, String(body.joinCode ?? ''));
    }

    const actor = await getParticipant(roomId, actorId);
    if (!actor || !isActive(actor)) {
      return forbidden('Kamu bukan peserta ruangan ini.');
    }

    const role = (actor.role ?? 'member') as ParticipantRole;
    if (!can(role, action)) {
      return forbidden('Wewenangmu tidak cukup untuk melakukan ini.');
    }

    switch (action) {
      case 'START':
        return await handleStart(roomId, actorId, body);
      case 'SET_ROOM':
        return await handleSetRoom(roomId, actorId, body);
      case 'KICK':
        return await handleKick(roomId, actorId, targetId, false, body.reason);
      case 'BAN':
        return await handleKick(roomId, actorId, targetId, true, body.reason);
      case 'PROMOTE_COMOD':
      case 'DEMOTE_COMOD':
        return await handleComod(roomId, actorId, targetId, action === 'PROMOTE_COMOD');
      case 'OFFER_HOST':
        return await handleOfferHost(roomId, actorId, targetId);
      case 'ACCEPT_HOST':
        return await handleRespondHost(roomId, actorId, true);
      case 'DECLINE_HOST':
        return await handleRespondHost(roomId, actorId, false);
      case 'EXCUSE':
        return await handleExcuse(roomId, actorId, targetId);
      case 'END_FOR_ALL':
        return await handleEndForAll(roomId, actorId);
      case 'OPEN_TO_PUBLIC':
        return await handleOpenToPublic(roomId, actorId);
      case 'APPROVE_JOIN':
      case 'REJECT_JOIN':
        return await handleJoinRequest(roomId, actorId, targetId, action === 'APPROVE_JOIN');
      case 'LEAVE':
        return await handleLeave(roomId, actorId);
      case 'INTERRUPT_START':
        return await handleInterruptStart(roomId, actorId);
      case 'INTERRUPT_END':
        return await handleInterruptEnd(roomId, actorId);
      default:
        return badRequest('Aksi tidak dikenal.');
    }
  } catch (error: any) {
    console.error('Focus room action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── JOIN ────────────────────────────────────────────────────────────────────

/**
 * Memasukkan seseorang ke ruangan.
 *
 * Dipakai dua jalur — JOIN biasa dan persetujuan host atas antrean `invite` —
 * supaya keduanya tidak bisa menyimpang. `joined_session_at` sengaja
 * di-COALESCE: orang yang keluar lalu masuk lagi tidak boleh mengulang
 * hitungan waktunya dari nol.
 */
async function admitParticipant(roomId: string, userId: string, asFocusing: boolean) {
  const stamp = asFocusing ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
  await db.execute(
    `INSERT INTO focus_room_participants
       (room_id, user_id, status, is_host, role, joined_at, joined_session_at,
        state_changed_at, last_heartbeat)
     VALUES (?, ?, ?, 0, 'member', UTC_TIMESTAMP(), ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       joined_session_at = COALESCE(focus_room_participants.joined_session_at, VALUES(joined_session_at)),
       state_changed_at = VALUES(state_changed_at),
       last_heartbeat = UTC_TIMESTAMP(),
       outcome = NULL`,
    [roomId, userId, asFocusing ? 'focusing' : 'joined', stamp, stamp],
  );
}

async function handleJoin(roomId: string, userId: string, joinCode: string) {
  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

  if (room.status === 'finished' || room.status === 'aborted') {
    return badRequest('Sesi ini sudah berakhir.');
  }
  if (room.visibility === 'solo') {
    return forbidden('Ini sesi pribadi.');
  }
  if (await isBanned(roomId, userId)) {
    return forbidden('Kamu tidak bisa bergabung ke ruangan ini.');
  }

  const existing = await getParticipant(roomId, userId);
  const rejoining = Boolean(existing && isActive(existing));

  // Kode diverifikasi DI SERVER. Sebelumnya perbandingannya dilakukan di
  // browser terhadap kode yang sudah dikirim ke browser itu juga.
  if (!rejoining && room.visibility === 'code') {
    const limiterKey = `${userId}:${roomId}`;
    if (codeAttemptsExhausted(limiterKey)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan kode. Coba lagi sebentar lagi.' },
        { status: 429 },
      );
    }
    const supplied = String(joinCode || '').trim().toUpperCase();
    if (!supplied || supplied !== String(room.join_code ?? '').toUpperCase()) {
      recordCodeFailure(limiterKey);
      return forbidden('Kode ruangan tidak cocok.');
    }
    codeAttempts.delete(limiterKey);
  }
  // Ruangan `invite` tidak menolak orang, ia mengantrekan mereka. Menolak mentah
  // membuat tingkat visibilitas ini tidak bisa dipakai sama sekali: tidak ada
  // jalan dari "di luar" ke "di dalam" selain host menambahkan seseorang, dan
  // mekanisme itu tidak pernah ada.
  if (!rejoining && room.visibility === 'invite') {
    await logRoomEvent(roomId, 'JOIN_REQUEST', { actorId: userId, targetId: userId });
    await broadcast(roomId, 'JOIN_REQUEST', { userId });
    return NextResponse.json(
      { success: true, pending: true, message: 'Permintaanmu dikirim ke host. Tunggu sebentar ya.' },
      { status: 202 },
    );
  }

  const participants = await getParticipants(roomId);
  const active = participants.filter(isActive);

  if (!rejoining && active.length >= (Number(room.max_participants) || 8)) {
    return badRequest('Ruangan sudah penuh.');
  }

  if (!rejoining) {
    const busyIn = await findActiveSessionElsewhere(userId, roomId);
    if (busyIn) {
      return NextResponse.json(
        { error: 'Kamu masih punya sesi fokus lain yang berjalan.' },
        { status: 409 },
      );
    }
  }

  // Bergabung di tengah sesi diizinkan — inti fitur ini adalah mengumpulkan
  // orang, dan mengunci pintu satu menit setelah mulai bertentangan dengan itu.
  let joinAsFocusing = false;
  if (room.status === 'running') {
    const startedMs = room.started_at ? new Date(room.started_at).getTime() : Date.now();
    const endsMs = room.ends_at ? new Date(room.ends_at).getTime() : Date.now();
    const sinceStart = (Date.now() - startedMs) / 1000;
    const remaining = (endsMs - Date.now()) / 1000;

    if (room.join_policy === 'locked') {
      return badRequest('Ruangan ini menutup pintu setelah sesi dimulai.');
    }
    if (
      room.join_policy === 'open_early' &&
      sinceStart > LATE_JOIN_WINDOW_SECS &&
      remaining < LATE_JOIN_MIN_REMAINING_SECS
    ) {
      return badRequest('Sesi ini sudah terlalu jauh berjalan untuk diikuti.');
    }
    if (remaining <= 0) return badRequest('Sesi ini sudah berakhir.');
    joinAsFocusing = true;
  }

  await admitParticipant(roomId, userId, joinAsFocusing);

  await logRoomEvent(roomId, 'JOIN', { actorId: userId, payload: { late: joinAsFocusing } });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'JOIN', userId });
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state ? publicRoom(state.room, state.participants, userId) : null,
  });
}

// ── START ───────────────────────────────────────────────────────────────────

async function handleStart(roomId: string, actorId: string, body: any) {
  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
  if (room.status === 'running') return badRequest('Sesi sudah berjalan.');
  if (room.status !== 'waiting') return badRequest('Sesi ini sudah berakhir.');

  const durationMins = Math.min(
    300,
    Math.max(5, Number(body.durationMins) || Number(room.duration_mins) || 25),
  );
  const mode = body.mode === 'zen' ? 'zen' : body.mode === 'hardcore' ? 'hardcore' : room.mode;
  const name = String(body.title ?? room.name ?? '').trim() || room.name;

  // `ends_at` dihitung sekali di server dan menjadi satu-satunya sumber
  // kebenaran waktu. Semua klien menurunkan hitungan mundurnya dari sini.
  await db.execute(
    `UPDATE focus_rooms
        SET status = 'running',
            started_at = UTC_TIMESTAMP(),
            ends_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE),
            host_last_seen = UTC_TIMESTAMP(),
            name = ?, description = ?, duration_mins = ?, mode = ?
      WHERE id = ? AND status = 'waiting'`,
    [durationMins, name, String(body.description ?? room.description ?? '').trim() || null, durationMins, mode, roomId],
  );

  // Semua yang sudah menunggu langsung masuk hitungan fokus.
  await db.execute(
    `UPDATE focus_room_participants
        SET status = 'focusing',
            joined_session_at = UTC_TIMESTAMP(),
            state_changed_at = UTC_TIMESTAMP(),
            last_heartbeat = UTC_TIMESTAMP()
      WHERE room_id = ? AND status = 'joined'`,
    [roomId],
  );

  await logRoomEvent(roomId, 'START', { actorId, payload: { durationMins, mode } });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'START' });
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Pengaturan ruangan (sebelum mulai) ──────────────────────────────────────

async function handleSetRoom(roomId: string, actorId: string, body: any) {
  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
  if (room.status !== 'waiting') {
    return badRequest('Pengaturan hanya bisa diubah sebelum sesi dimulai.');
  }

  const fields: string[] = [];
  const args: any[] = [];

  if (typeof body.title === 'string' && body.title.trim().length >= 3) {
    fields.push('name = ?');
    args.push(body.title.trim());
  }
  if (typeof body.description === 'string') {
    fields.push('description = ?');
    args.push(body.description.trim() || null);
  }
  if (body.mode === 'zen' || body.mode === 'hardcore') {
    fields.push('mode = ?');
    args.push(body.mode);
  }
  if (Number(body.durationMins)) {
    fields.push('duration_mins = ?');
    args.push(Math.min(300, Math.max(5, Number(body.durationMins))));
  }
  if (body.visibility === 'public' || body.visibility === 'code' || body.visibility === 'invite') {
    fields.push('visibility = ?');
    args.push(body.visibility);
  }
  if (body.joinPolicy === 'open_early' || body.joinPolicy === 'always_open' || body.joinPolicy === 'locked') {
    fields.push('join_policy = ?');
    args.push(body.joinPolicy);
  }
  if (Number(body.maxParticipants)) {
    fields.push('max_participants = ?');
    args.push(Math.min(20, Math.max(2, Number(body.maxParticipants))));
  }

  if (fields.length === 0) return badRequest('Tidak ada yang diubah.');

  args.push(roomId);
  await db.execute(`UPDATE focus_rooms SET ${fields.join(', ')} WHERE id = ?`, args);

  await logRoomEvent(roomId, 'SET_ROOM', { actorId, payload: body });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'SET_ROOM' });
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Kick / Ban ──────────────────────────────────────────────────────────────

async function handleKick(
  roomId: string,
  actorId: string,
  targetId: string | null,
  ban: boolean,
  reason?: string,
) {
  if (!targetId) return badRequest('Target tidak disebutkan.');
  if (String(targetId) === String(actorId)) return badRequest('Gunakan "Keluar" untuk keluar sendiri.');

  const target = await getParticipant(roomId, targetId);
  if (!target || !isActive(target)) return badRequest('Orang itu tidak ada di ruangan.');
  if (target.role === 'host') return forbidden('Host tidak bisa dikeluarkan.');

  // Pembukuan dimajukan dulu supaya menit yang sudah dijalani tidak hilang;
  // yang dikeluarkan tetap kehilangan poin sesi ini, tapi catatannya jujur.
  await reconcileRoom(roomId);

  await db.execute(
    `UPDATE focus_room_participants
        SET status = 'removed', outcome = 'removed', outcome_note = ?
      WHERE room_id = ? AND user_id = ?`,
    [reason ? String(reason).slice(0, 250) : 'Dikeluarkan oleh host', roomId, targetId],
  );

  if (ban) {
    await db.execute(
      `INSERT INTO focus_room_bans (room_id, user_id, banned_by, reason, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [roomId, targetId, actorId, reason ? String(reason).slice(0, 250) : null],
    );
  }

  // Setiap penggunaan kekuasaan tercatat. Host yang mengeluarkan delapan orang
  // dalam seminggu akan terlihat — itulah gunanya jejak ini.
  await logRoomEvent(roomId, ban ? 'BAN' : 'KICK', { actorId, targetId, payload: { reason } });
  await broadcast(roomId, 'REMOVED', { targetId, ban });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'KICK' });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Co-moderator ────────────────────────────────────────────────────────────

async function handleComod(
  roomId: string,
  actorId: string,
  targetId: string | null,
  promote: boolean,
) {
  if (!targetId) return badRequest('Target tidak disebutkan.');
  const target = await getParticipant(roomId, targetId);
  if (!target || !isActive(target)) return badRequest('Orang itu tidak ada di ruangan.');
  if (target.role === 'host') return badRequest('Dia sudah host.');

  await db.execute(
    'UPDATE focus_room_participants SET role = ? WHERE room_id = ? AND user_id = ?',
    [promote ? 'comod' : 'member', roomId, targetId],
  );

  await logRoomEvent(roomId, promote ? 'PROMOTE_COMOD' : 'DEMOTE_COMOD', { actorId, targetId });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'ROLE' });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Serah-terima host, dengan persetujuan ───────────────────────────────────

/**
 * Peran host tidak boleh dilemparkan begitu saja ke orang yang sedang deep-work.
 * Versi lama memilih `otherParticipants[0]` tanpa pilihan dan tanpa konfirmasi.
 */
async function handleOfferHost(roomId: string, actorId: string, targetId: string | null) {
  if (!targetId) return badRequest('Pilih dulu siapa yang akan menerima peran host.');
  const target = await getParticipant(roomId, targetId);
  if (!target || !isActive(target)) return badRequest('Orang itu tidak ada di ruangan.');

  await logRoomEvent(roomId, 'HOST_OFFER', {
    actorId,
    targetId,
    payload: { expiresAt: Date.now() + HOST_OFFER_TTL_SECS * 1000 },
  });
  await broadcast(roomId, 'HOST_OFFER', { fromId: actorId, targetId, ttlSecs: HOST_OFFER_TTL_SECS });

  return NextResponse.json({ success: true, pending: true });
}

async function latestHostOffer(roomId: string) {
  const res = await db.execute(
    `SELECT * FROM focus_room_events
      WHERE room_id = ?
        AND event_type IN ('HOST_OFFER','HOST_OFFER_ACCEPTED','HOST_OFFER_DECLINED')
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    [roomId],
  );
  const row = res.rows[0];
  if (!row || row.event_type !== 'HOST_OFFER') return null;

  let payload: any = {};
  try {
    payload = row.payload ? JSON.parse(String(row.payload)) : {};
  } catch { /* payload rusak dianggap kedaluwarsa */ }

  if (!payload.expiresAt || Date.now() > Number(payload.expiresAt)) return null;
  return row;
}

async function handleRespondHost(roomId: string, actorId: string, accept: boolean) {
  const offer = await latestHostOffer(roomId);
  if (!offer) return badRequest('Tidak ada tawaran host yang masih berlaku.');
  if (String(offer.target_id) !== String(actorId)) {
    return forbidden('Tawaran ini bukan untukmu.');
  }

  if (!accept) {
    await logRoomEvent(roomId, 'HOST_OFFER_DECLINED', { actorId, targetId: actorId });
    await broadcast(roomId, 'HOST_OFFER_DECLINED', { byId: actorId });
    return NextResponse.json({ success: true, accepted: false });
  }

  await transferHost(roomId, String(offer.actor_id), actorId);
  await logRoomEvent(roomId, 'HOST_OFFER_ACCEPTED', { actorId, targetId: actorId });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'HOST_TRANSFERRED', newHostId: actorId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    accepted: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Dispensasi ──────────────────────────────────────────────────────────────

/**
 * Host hanya bisa MENAIKKAN hasil orang lain, tidak pernah menurunkan.
 *
 * Ini keputusan desain yang disengaja: poin bisa ditukar sesuatu yang bernilai,
 * dan memberi rekan sejawat kekuasaan mencabutnya menciptakan dinamika kekuasaan
 * informal di kantor. Kekuasaan yang hanya bisa berbuat baik tidak bisa
 * disalahgunakan. Yang tidak fokus sudah otomatis dapat lebih sedikit lewat
 * poin proporsional — tidak perlu ada yang menghukum siapa pun.
 */
async function handleExcuse(roomId: string, actorId: string, targetId: string | null) {
  if (!targetId) return badRequest('Target tidak disebutkan.');
  const target = await getParticipant(roomId, targetId);
  if (!target) return badRequest('Orang itu tidak ada di ruangan.');
  if (target.outcome === 'removed') return badRequest('Dia sudah dikeluarkan.');

  await db.execute(
    `UPDATE focus_room_participants
        SET outcome = 'excused', outcome_note = 'Dispensasi dari host'
      WHERE room_id = ? AND user_id = ?`,
    [roomId, targetId],
  );

  await logRoomEvent(roomId, 'EXCUSE', { actorId, targetId });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'EXCUSE', targetId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Mengakhiri ──────────────────────────────────────────────────────────────

async function handleEndForAll(roomId: string, actorId: string) {
  await reconcileRoom(roomId);
  await logRoomEvent(roomId, 'END_FOR_ALL', { actorId });
  // Menutup ruangan ikut menyelesaikan pembukuan semua orang: peserta tetap
  // dibayar untuk menit yang sudah mereka jalani. Versi lama menandai semua
  // peserta "Sesi dibatalkan" dan memberi nol — menghukum orang yang tidak
  // melakukan kesalahan apa pun.
  await closeRoom(roomId, 'ended_by_host');
  await broadcast(roomId, 'ROOM_CLOSED', { reason: 'ended_by_host' });
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const room = await getRoom(roomId);
  const participants = await getParticipants(roomId);
  return NextResponse.json({
    success: true,
    room: room ? publicRoom(room, participants, actorId) : null,
  });
}

// ── Membuka sesi sendiri untuk umum ─────────────────────────────────────────

/**
 * "Saya mulai sendiri, tapi kalau ada yang mau ikut, boleh."
 *
 * Sebelumnya memulai sesi solo berarti terkunci sendirian sampai selesai. Ini
 * satu klik yang mengubahnya jadi ruangan terbuka tanpa menghentikan timer —
 * `ends_at` dan seluruh pembukuan tidak disentuh sama sekali.
 */
async function handleOpenToPublic(roomId: string, actorId: string) {
  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
  if (room.visibility !== 'solo') return badRequest('Ruangan ini memang sudah bisa dimasuki orang lain.');
  if (room.status !== 'waiting' && room.status !== 'running') {
    return badRequest('Sesi ini sudah berakhir.');
  }

  await db.execute(
    `UPDATE focus_rooms
        SET visibility = 'public', join_policy = 'always_open', max_participants = ?
      WHERE id = ?`,
    [8, roomId],
  );

  await logRoomEvent(roomId, 'OPEN_TO_PUBLIC', { actorId });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'OPEN_TO_PUBLIC' });
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state
      ? publicRoom(state.room, state.participants, actorId, await pendingJoinRequests(roomId))
      : null,
  });
}

// ── Antrean permintaan masuk (ruangan `invite`) ─────────────────────────────

async function handleJoinRequest(
  roomId: string,
  actorId: string,
  targetId: string | null,
  approve: boolean,
) {
  if (!targetId) return badRequest('Target tidak disebutkan.');

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

  if (!approve) {
    await logRoomEvent(roomId, 'JOIN_REJECTED', { actorId, targetId });
    await broadcast(roomId, 'JOIN_REJECTED', { targetId });
    const state = await reconcileRoom(roomId);
    return NextResponse.json({
      success: true,
      room: state
        ? publicRoom(state.room, state.participants, actorId, await pendingJoinRequests(roomId))
        : null,
    });
  }

  if (await isBanned(roomId, targetId)) return forbidden('Orang ini dilarang masuk ruangan.');

  const active = (await getParticipants(roomId)).filter(isActive);
  if (active.length >= (Number(room.max_participants) || 8)) return badRequest('Ruangan sudah penuh.');

  const busyIn = await findActiveSessionElsewhere(targetId, roomId);
  if (busyIn) return badRequest('Orang ini sedang menjalani sesi fokus lain.');

  await admitParticipant(roomId, targetId, room.status === 'running');
  await logRoomEvent(roomId, 'JOIN_APPROVED', { actorId, targetId });
  await broadcast(roomId, 'JOIN_APPROVED', { targetId });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'JOIN_APPROVED', userId: targetId });
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    room: state
      ? publicRoom(state.room, state.participants, actorId, await pendingJoinRequests(roomId))
      : null,
  });
}

async function handleLeave(roomId: string, actorId: string) {
  await reconcileRoom(roomId);

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

  const me = await getParticipant(roomId, actorId);
  const wasHost = me?.role === 'host';

  await db.execute(
    `UPDATE focus_room_participants SET status = 'left', state_changed_at = UTC_TIMESTAMP()
      WHERE room_id = ? AND user_id = ?`,
    [roomId, actorId],
  );
  await logRoomEvent(roomId, 'LEAVE', { actorId });

  // Kepergian host memicu suksesi, bukan pembubaran. Ruangan hanya ditutup
  // kalau memang tidak ada lagi yang tersisa.
  if (wasHost) {
    const heir = await electNewHost(roomId, actorId);
    if (heir) {
      await transferHost(roomId, actorId, String(heir.user_id));
      await logRoomEvent(roomId, 'HOST_SUCCEEDED', {
        targetId: String(heir.user_id),
        payload: { reason: 'host_left' },
      });
      await broadcast(roomId, 'STATE_CHANGED', {
        reason: 'HOST_SUCCEEDED',
        newHostId: String(heir.user_id),
      });
    } else {
      await closeRoom(roomId, 'host_gone');
      await broadcast(roomId, 'ROOM_CLOSED', { reason: 'host_gone' });
    }
  } else {
    await broadcast(roomId, 'STATE_CHANGED', { reason: 'LEAVE', userId: actorId });
  }

  // Peserta yang keluar tetap diselesaikan: menit yang sudah dijalani dibayar
  // proporsional begitu ruangan selesai.
  const after = await getRoom(roomId);
  if (after && (after.status === 'finished' || after.status === 'aborted')) {
    await settleRoom(roomId);
  }
  await triggerPusherEvent('presence-lobby', 'lobby-update', { roomId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    left: true,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

// ── Interupsi ───────────────────────────────────────────────────────────────

/**
 * "Saya harus menjauh sebentar" — tombol yang sebelumnya tidak ada.
 *
 * Melapor secara sadar memberi zona bebas 1.5× lebih panjang daripada
 * menghilang begitu saja. Kita memang ingin menghargai kejujuran: sistem tidak
 * bisa membedakan telfon penting dari kelalaian, jadi yang dihargai adalah
 * perilaku melapornya.
 */
async function handleInterruptStart(roomId: string, actorId: string) {
  const room = await getRoom(roomId);
  if (!room || room.status !== 'running') return badRequest('Sesi tidak sedang berjalan.');

  await reconcileRoom(roomId);
  const me = await getParticipant(roomId, actorId);
  if (!me || !isInSession(me)) return badRequest('Kamu tidak sedang dalam sesi.');
  if (me.status === 'interrupted') {
    return NextResponse.json({ success: true, alreadyInterrupted: true });
  }

  await db.execute(
    `UPDATE focus_room_participants
        SET status = 'interrupted',
            interrupt_kind = 'voluntary',
            interrupted_at = UTC_TIMESTAMP(),
            state_changed_at = UTC_TIMESTAMP()
      WHERE room_id = ? AND user_id = ?`,
    [roomId, actorId],
  );

  await logRoomEvent(roomId, 'INTERRUPT_START', { actorId, payload: { kind: 'voluntary' } });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'INTERRUPT_START', userId: actorId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    graceSecs: graceSecsFor(room.mode, 'voluntary'),
    budget: interruptBudget(Number(room.duration_mins) || 25),
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}

async function handleInterruptEnd(roomId: string, actorId: string) {
  const room = await getRoom(roomId);
  if (!room || room.status !== 'running') return badRequest('Sesi tidak sedang berjalan.');

  await reconcileRoom(roomId);
  const me = await getParticipant(roomId, actorId);
  if (!me) return badRequest('Kamu tidak ada di ruangan.');

  // Rekonsiliasi mungkin sudah menyelesaikan sesi orang ini karena anggarannya
  // habis. Kalau begitu, kembalinya tidak membatalkan keputusan itu.
  if (me.status !== 'interrupted') {
    const state = await reconcileRoom(roomId);
    return NextResponse.json({
      success: true,
      resumed: false,
      room: state ? publicRoom(state.room, state.participants, actorId) : null,
    });
  }

  const { consumedAllowance, secs } = await resumeFromInterrupt(room, me);

  await logRoomEvent(roomId, 'INTERRUPT_END', {
    actorId,
    payload: { secs, consumedAllowance },
  });
  await broadcast(roomId, 'STATE_CHANGED', { reason: 'INTERRUPT_END', userId: actorId });

  const state = await reconcileRoom(roomId);
  return NextResponse.json({
    success: true,
    resumed: true,
    consumedAllowance,
    room: state ? publicRoom(state.room, state.participants, actorId) : null,
  });
}
