const CACHE_NAME = 'flow-productivity-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/icon.png',
  '/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Individually add to avoid one failure breaking all
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(async () => {
      const match = await caches.match(event.request);
      if (match) return match;
      return new Response("Network error", { status: 503, statusText: "Service Unavailable" });
    })
  );
});

// Web Push Notification Handler
self.addEventListener('push', (event) => {
  let data = { title: '🐝 Flowbee', body: 'Kamu punya notifikasi baru', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'Buka' }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
