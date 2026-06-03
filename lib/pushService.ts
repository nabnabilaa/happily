import webpush from 'web-push';
import { db } from './db';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:support@happily.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn("VAPID keys not configured. Web Push Notifications will not be functional.");
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string = '/'
) {
  if (!publicKey || !privateKey) {
    console.error("VAPID keys are missing. Cannot dispatch push notification.");
    return;
  }

  try {
    const res = await db.execute({
      sql: "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
      args: [userId]
    });

    const subscriptions = res.rows;
    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user: ${userId}`);
      return;
    }

    const payload = JSON.stringify({ title, body, url });

    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        // Stale or expired subscription (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Removing expired subscription: ${sub.id}`);
          await db.execute({
            sql: "DELETE FROM push_subscriptions WHERE id = ?",
            args: [sub.id]
          });
        } else {
          console.error(`Failed to send push to subscription ${sub.id}:`, err);
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error in sendPushNotification service:", error);
  }
}
