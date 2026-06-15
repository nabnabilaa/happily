import Pusher from 'pusher';

export const getPusherInstance = (): Pusher | null => {
  if (
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    return new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(`
      ================================================================
      [CRITICAL WARNING]
      Pusher credentials are missing in production environment.
      Real-time updates for Live Coworking and Sync will NOT work.
      Please set PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, 
      and NEXT_PUBLIC_PUSHER_CLUSTER in your production environment variables.
      ================================================================
    `);
  }

  return null;
};

// Singleton instance
export const pusher = getPusherInstance();

/**
 * Safely trigger a Pusher event with built-in try-catch.
 * If Pusher is not configured, logs a warning but does not throw.
 */
export const triggerPusherEvent = async (
  channels: string | string[],
  eventName: string,
  data: any
): Promise<void> => {
  if (!pusher) {
    console.warn(`[Pusher] trigger skipped (credentials missing): Event '${eventName}' on channel(s) ${channels}`);
    return;
  }

  try {
    await pusher.trigger(channels, eventName, data);
  } catch (error) {
    console.error(`[Pusher] Error triggering event '${eventName}' on channel(s) ${channels}:`, error);
  }
};
