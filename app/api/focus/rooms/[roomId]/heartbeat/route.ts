import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/authSession';
import { triggerPusherEvent } from '@/lib/pusher';
import {
  HEARTBEAT_INTERVAL_SECS,
  HEARTBEAT_STALE_SECS,
  getParticipant,
  getRoom,
  graceSecsFor,
  interruptBudget,
  logRoomEvent,
  publicRoom,
  reconcileRoom,
  resumeFromInterrupt,
} from '@/lib/focusRoom';

/**
 * Detak jantung sesi — mekanisme yang membalik seluruh insentif anti-cheat.
 *
 * Sistem lama hanya menghukum SAAT USER KEMBALI ke layar. Akibatnya menutup tab
 * dan pergi tidak pernah terdeteksi (poin tetap didapat), sementara menerima
 * telfon 35 detik lalu kembali jujur menghanguskan sesi. Sistem itu menghukum
 * kejujuran dan memberi hadiah pada penghindaran.
 *
 * Sekarang kebenarannya ada di sisi server: berhenti berdetak berarti berhenti
 * dihitung. Menutup tab adalah jalur dengan hasil TERBURUK (`abandoned`, nol
 * poin), sementara melapor menghasilkan `partial` dengan poin proporsional.
 *
 * Endpoint ini juga jadi cara mendeteksi host yang hilang, jadi satu mekanisme
 * mengerjakan dua hal.
 */
export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Sesi tidak berlaku' }, { status: 401 });
    }

    const room = await getRoom(roomId);
    if (!room) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

    const before = await getParticipant(roomId, userId);
    if (!before) return NextResponse.json({ error: 'Bukan peserta' }, { status: 403 });

    // Detak dicatat SEBELUM rekonsiliasi, supaya rekonsiliasi melihat bukti
    // terbaru dan tidak salah menandai orang yang baru saja berdetak.
    await db.execute(
      'UPDATE focus_room_participants SET last_heartbeat = UTC_TIMESTAMP() WHERE room_id = ? AND user_id = ?',
      [roomId, userId],
    );
    if (String(room.host_id) === String(userId)) {
      await db.execute('UPDATE focus_rooms SET host_last_seen = UTC_TIMESTAMP() WHERE id = ?', [roomId]);
    }

    // Interupsi yang TERDETEKSI (bukan yang dilaporkan sendiri) berakhir begitu
    // detak kembali — user tidak perlu menekan apa pun. Interupsi sukarela
    // sengaja dibiarkan berjalan sampai user menekan "Saya kembali", karena ia
    // memang sedang menyatakan dirinya menjauh.
    let resumed: { resumed: boolean; consumedAllowance: boolean; secs: number } | null = null;
    if (before.status === 'interrupted' && (before.interrupt_kind ?? 'detected') === 'detected') {
      resumed = await resumeFromInterrupt(room, before);
      if (resumed.resumed) {
        await logRoomEvent(roomId, 'INTERRUPT_END', {
          actorId: userId,
          payload: { secs: resumed.secs, consumedAllowance: resumed.consumedAllowance, auto: true },
        });
        await triggerPusherEvent(`presence-focus-${roomId}`, 'room-event', {
          type: 'STATE_CHANGED',
          reason: 'INTERRUPT_END',
          userId,
          timestamp: Date.now(),
        });
      }
    }

    const state = await reconcileRoom(roomId);
    if (!state) return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });

    const budget = interruptBudget(Number(state.room.duration_mins) || 25);

    return NextResponse.json({
      success: true,
      room: publicRoom(state.room, state.participants, userId),
      resumed: resumed?.resumed ?? false,
      consumedAllowance: resumed?.consumedAllowance ?? false,
      budget,
      graceSecs: graceSecsFor(state.room.mode, 'detected'),
      voluntaryGraceSecs: graceSecsFor(state.room.mode, 'voluntary'),
      heartbeatIntervalSecs: HEARTBEAT_INTERVAL_SECS,
      staleAfterSecs: HEARTBEAT_STALE_SECS,
    });
  } catch (error: any) {
    console.error('Focus heartbeat error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
