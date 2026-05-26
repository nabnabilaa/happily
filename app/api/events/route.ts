import { NextResponse } from 'next/server';
import { hpEventEmitter } from '@/lib/events';

// Force dynamic so it doesn't cache and works with streaming
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(`data: {"type":"ping"}\n\n`));

      const sendEvent = (data: any) => {
        try {
          if (data.targetUserId && data.targetUserId !== userId) {
            return; // Skip if this event is targeted to a different user
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          console.error("SSE stream error", err);
          cleanup();
        }
      };

      hpEventEmitter.on('db_update', sendEvent);

      // Keep connection alive with pings every 30s
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: {"type":"ping"}\n\n`));
        } catch (err) {
          cleanup();
        }
      }, 30000);

      const cleanup = () => {
        clearInterval(interval);
        hpEventEmitter.off('db_update', sendEvent);
        try { controller.close(); } catch (e) {}
      };

      request.signal.addEventListener('abort', cleanup);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
