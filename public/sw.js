self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api') || url.port === '8787') return;
  event.respondWith(
    caches.open('sf-lms-v1').then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok && url.origin === self.location.origin) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    }),
  );
});
