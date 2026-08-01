const CACHE_PREFIX = 'msa-asistencia-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/manifest.webmanifest',
  '/images/logo_msa.jpeg',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js'
];
const NETWORK_FIRST_PATHS = new Set([
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/manifest.webmanifest'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkWithCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({
              message: 'Sin conexión. La operación se sincronizará cuando vuelva la red.'
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' }
            }
          )
      )
    );
    return;
  }

  if (request.mode === 'navigate' || NETWORK_FIRST_PATHS.has(url.pathname)) {
    event.respondWith(
      networkWithCache(request).catch(() =>
        request.mode === 'navigate' ? caches.match('/index.html') : caches.match(request)
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = networkWithCache(request).catch(() => cached);
      return cached || network;
    })
  );
});
