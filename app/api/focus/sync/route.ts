import { NextResponse } from 'next/server';
import { triggerPusherEvent } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    // Trigger an event to the specific room that the QR was scanned
    // This allows the desktop client to receive the signal and start the session without relying on a Chrome extension
    const channelName = `presence-focus-${roomId}`;
    await triggerPusherEvent(channelName, 'room-event', {
      type: 'FB_QR_SCANNED',
      timestamp: Date.now()
    });

    return NextResponse.json({ success: true, message: 'Sync signal sent successfully' });
  } catch (error: any) {
    console.error('Focus sync API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
