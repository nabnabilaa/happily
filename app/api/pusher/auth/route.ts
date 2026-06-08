import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.text();
    const params = new URLSearchParams(data);
    
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');
    
    // In a real app we'd get this from session/JWT
    // Since we don't have built-in session cookie parsing here easily without context,
    // let's require userId from headers or body if possible.
    // Wait, pusher-js sends socket_id and channel_name via form url encoded text.
    // But we can pass custom parameters in auth params.
    
    const userId = params.get('user_id');
    
    if (!socketId || !channelName || !userId) {
      return NextResponse.json({ error: 'Missing socket_id, channel_name, or user_id' }, { status: 400 });
    }

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      useTLS: true,
    });

    const userRes = await db.execute({
      sql: 'SELECT id, name, avatar_image, department FROM users WHERE id = ?',
      args: [userId]
    });
    const user = userRes.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const presenceData = {
      user_id: String(user.id),
      user_info: {
        name: user.name,
        avatar: user.avatar_image,
        department: user.department
      }
    };

    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);

  } catch (error: any) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
