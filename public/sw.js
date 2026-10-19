// Elsewhere service worker: offline app shell + runtime caching of built assets.
const CACHE = 'elsewhere-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Network first for the page so updates arrive; fall back to the cached shell offline.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    );
    return;
  }
  // Hashed build assets: cache first, then network (and store).
  // ignoreVary: copies stored on the first visit (see 'message' below) were fetched without the page's Origin header.
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// The page sends the files it loaded before this worker took control (first visit) so they are available offline.
self.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || d.type !== 'cache' || !Array.isArray(d.urls)) return;
  const urls = d.urls.filter((u) => typeof u === 'string' && new URL(u, location.href).origin === location.origin);
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.match(u, { ignoreVary: true }).then((hit) => hit || c.add(u).catch(() => {}))))),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list[0];
      if (client) {
        client.focus();
        if (url) client.postMessage({ type: 'open', url });
        return;
      }
      return self.clients.openWindow('./#' + (url || '/discover'));
    }),
  );
});
