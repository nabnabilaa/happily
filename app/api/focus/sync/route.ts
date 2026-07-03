import { NextResponse } from 'next/server';
import { triggerPusherEvent } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    // Trigger on both channels:
    // - presence-focus-{roomId}: used by multiplayer rooms
    // - focus-solo-{roomId}: used by solo hardcore sessions
    // The desktop FocusModal subscribes to whichever is relevant.
    await Promise.allSettled([
      triggerPusherEvent(`presence-focus-${roomId}`, 'room-event', {
        type: 'FB_QR_SCANNED',
        timestamp: Date.now()
      }),
      triggerPusherEvent(`focus-solo-${roomId}`, 'room-event', {
        type: 'FB_QR_SCANNED',
        timestamp: Date.now()
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Sync signal sent successfully' });
  } catch (error: any) {
    console.error('Focus sync API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
