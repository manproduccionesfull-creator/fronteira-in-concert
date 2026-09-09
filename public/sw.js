/* Service Worker — cache shell + content para offline */
const CACHE = 'fronteira-v48';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css?v=48',
  '/app.js?v=48',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/uploads/logo-fronteira-x.png',
  '/uploads/logo-allegro-icon.png',
  '/uploads/logo-fronteira-circular.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
      }
      return res;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (
    url.pathname === '/api/content' ||
    url.pathname === '/admin.html' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/app.js?v=48' ||
    url.pathname === '/styles.css?v=48' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
