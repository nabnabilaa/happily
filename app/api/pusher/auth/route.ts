import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/authSession';
import { PUSHER_CLUSTER } from '@/lib/realtimeConfig';

/**
 * Otorisasi channel Pusher.
 *
 * Sebelumnya identitas diambil dari parameter `user_id` yang dikirim klien,
 * sehingga siapa pun bisa berlangganan channel presence sebagai orang lain dan
 * ikut mendengar seluruh kejadian ruangan mereka. Sekarang identitas berasal
 * dari cookie sesi, dan parameter dari klien diabaikan sepenuhnya.
 */
export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = new URLSearchParams(await request.text());
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });

    const userRes = await db.execute({
      sql: 'SELECT id, name, avatar_image, department FROM users WHERE id = ?',
      args: [userId],
    });
    const user = userRes.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName, {
      user_id: String(user.id),
      user_info: {
        name: user.name,
        avatar: user.avatar_image,
        department: user.department,
      },
    });
    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
