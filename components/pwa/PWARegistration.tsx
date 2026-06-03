'use client';

import { useEffect } from 'react';
import { useHP } from '@/lib/HPContext';

// Helper to convert base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PWARegistration() {
  const { user } = useHP();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.warn("VAPID Public Key not found in client environment variables.");
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        console.log('SW registered successfully:', registration);
        
        const runSubscription = async () => {
          if (!user?.id || Notification.permission !== 'granted') return;
          try {
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
              await sendSubscriptionToServer(user.id, subscription);
            } else {
              const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
              });
              console.log('New push subscription created:', newSubscription);
              await sendSubscriptionToServer(user.id, newSubscription);
            }
          } catch (err) {
            console.error('Failed to subscribe user to push notifications:', err);
          }
        };

        // 1. Run immediately on load if already granted
        if (Notification.permission === 'granted') {
          runSubscription();
        }

        // 2. Listen to custom trigger event (e.g. from banner click)
        const handleTrigger = () => {
          console.log("Triggering push subscription due to user gesture event...");
          runSubscription();
        };

        window.addEventListener('hp_trigger_push_subscribe', handleTrigger);
        
        return () => {
          window.removeEventListener('hp_trigger_push_subscribe', handleTrigger);
        };
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  }, [user?.id]);

  const sendSubscriptionToServer = async (userId: string, subscription: PushSubscription) => {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON()
        })
      });
    } catch (e) {
      console.error('Failed to send subscription object to server:', e);
    }
  };

  return null;
}
