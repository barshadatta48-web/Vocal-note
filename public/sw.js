const CACHE_NAME = 'vocal-note-pwa-v7';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] install event: caching app shell resources...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          APP_SHELL.map((url) =>
            fetch(url).then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            }).catch((err) => console.warn('[SW] Non-critical cache skip:', url, err))
          )
        );
      })
      .then(() => {
        console.log('[SW] App shell caching phase completed.');
        return self.skipWaiting();
      })
      .catch((err) => console.error('[SW] Install error:', err))
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate event: cleaning up old caches...');
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Pruning stale cache:', key);
          return caches.delete(key);
        })
      ))
      .then(() => {
        console.log('[SW] Active and controlling clients.');
        return self.clients.claim();
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING signal.');
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Isolate service worker: do not intercept external APIs or backend routes
  if (url.origin !== self.location.origin) return;
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_')) return;

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (isNavigation) {
            return caches.match('/index.html') || caches.match('/');
          }
          return Response.error();
        });
      })
  );
});
