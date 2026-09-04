self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sf-lms-') && key !== 'sf-lms-v2')
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isLocalDevServer =
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
    ['5173', '5176', '5177'].includes(url.port);
  const isViteRequest =
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/');
  if (
    url.pathname.startsWith('/api') ||
    url.port === '8787' ||
    isLocalDevServer ||
    isViteRequest
  ) {
    return;
  }
  event.respondWith(
    caches.open('sf-lms-v2').then(async (cache) => {
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
