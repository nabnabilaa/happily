import Pusher from 'pusher';
import { hpEventEmitter } from './events';

let pusherInstance: Pusher | null = null;

// Initialize Pusher only if all environment variables are present
if (
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER
) {
  try {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
    console.log("[Realtime] Pusher client initialized successfully on server side.");
  } catch (e) {
    console.error("[Realtime] Failed to initialize Pusher server instance:", e);
  }
} else {
  console.log("[Realtime] Pusher environment variables missing. Real-time updates will fallback to local SSE.");
}

/**
 * Triggers a real-time event for a specific user.
 * Sends event via local EventEmitter (for SSE connection fallback) and Pusher (for serverless production Vercel).
 */
export async function triggerRealtimeUpdate(
  userId: string,
  data: { type: string; [key: string]: any } = { type: 'refresh' }
) {
  const timestamp = Date.now();
  const eventPayload = {
    ...data,
    targetUserId: userId,
    timestamp,
  };

  // 1. Emit to local EventEmitter (Local development SSE fallback)
  try {
    hpEventEmitter.emit('db_update', eventPayload);
  } catch (e) {
    console.error("[Realtime] Failed to emit local db_update event:", e);
  }

  // 2. Trigger event via Pusher (Serverless/production mode)
  if (pusherInstance) {
    try {
      // Channel name pattern: user-{userId}
      const channelName = `user-${userId}`;
      await pusherInstance.trigger(channelName, 'db_update', eventPayload);
      console.log(`[Realtime] Pusher event triggered on channel '${channelName}' for event '${data.type}'`);
    } catch (err) {
      console.error(`[Realtime] Pusher trigger failed for user ${userId}:`, err);
    }
  }
}
