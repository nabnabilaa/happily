import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/authSession';

/**
 * Sesi fokus yang sedang dijalani pemanggil, kalau ada.
 *
 * Dibutuhkan karena keberlangsungan sesi tidak boleh bergantung pada satu
 * komponen React tetap ter-mount. `FocusModal` dirender secara kondisional di
 * `app/page.tsx`, jadi menutupnya meng-unmount `useFocusSession` dan
 * menghentikan detak jantung — sesi Zen yang dijanjikan "boleh buka aplikasi
 * lain" diam-diam membusuk jadi `partial` hanya karena user menutup layarnya.
 *
 * Endpoint ini juga yang membuat sesi pulih sendiri setelah browser di-refresh:
 * penjaga detak di level aplikasi menemukan ruangannya lagi tanpa user perlu
 * membuka modal apa pun.
 */
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ room: null });

    const res = await db.execute(
      `SELECT fr.id, fr.name, fr.mode, fr.status, fr.visibility, fr.ends_at, fp.status AS my_status
         FROM focus_room_participants fp
         JOIN focus_rooms fr ON fr.id = fp.room_id
        WHERE fp.user_id = ?
          AND fp.status IN ('joined','focusing','interrupted')
          AND fr.status IN ('waiting','running')
        ORDER BY fr.status = 'running' DESC, fr.created_at DESC
        LIMIT 1`,
      [userId],
    );

    const r = res.rows[0];
    if (!r) return NextResponse.json({ room: null });

    return NextResponse.json({
      room: {
        id: String(r.id),
        name: r.name,
        mode: r.mode,
        status: r.status,
        visibility: r.visibility,
        endsAt: r.ends_at ? new Date(r.ends_at as any).toISOString() : null,
        myStatus: r.my_status,
      },
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Focus active session error:', error);
    return NextResponse.json({ room: null });
  }
}
