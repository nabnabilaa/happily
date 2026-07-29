import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/authSession';
import { pendingJoinRequests, publicRoom, reconcileRoom } from '@/lib/focusRoom';

/**
 * Keadaan lengkap sebuah ruangan.
 *
 * Ini yang dipanggil klien saat masuk dan saat pulih dari refresh — sebelumnya
 * tidak ada, sehingga tamu tidak pernah melihat daftar peserta sama sekali dan
 * me-refresh browser berarti keluar dari sesi.
 */
export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const viewerId = getAuthUserId(request);

    // Membaca sekaligus memajukan pembukuan: tidak ada job latar yang wajib
    // hidup agar angka yang dilihat user benar.
    const state = await reconcileRoom(roomId);
    if (!state) {
      return NextResponse.json({ error: 'Ruangan tidak ditemukan' }, { status: 404 });
    }

    // Antrean hanya diambil kalau memang ada gunanya: ruangan `invite` saja.
    const pending =
      state.room.visibility === 'invite' ? await pendingJoinRequests(roomId) : [];

    return NextResponse.json({
      room: publicRoom(state.room, state.participants, viewerId ?? undefined, pending),
    });
  } catch (error: any) {
    console.error('Focus room details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
