const CACHE_PREFIX = 'msa-asistencia-';
const CACHE_NAME = `${CACHE_PREFIX}v19`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.css',
  '/css/base/variables.css',
  '/css/base/reset.css',
  '/css/base/layout.css',
  '/css/components/buttons.css',
  '/css/components/forms.css',
  '/css/components/tables.css',
  '/css/components/cards.css',
  '/css/components/dialogs.css',
  '/css/components/notifications.css',
  '/css/components/badges.css',
  '/css/views/auth.css',
  '/css/views/dashboard.css',
  '/css/views/attendance.css',
  '/css/views/organization.css',
  '/css/views/requests.css',
  '/css/views/reports.css',
  '/css/views/profile.css',
  '/css/views/users.css',
  '/css/views/audit.css',
  '/views/dashboard/dashboard.html',
  '/views/attendance/attendance.html',
  '/views/history/history.html',
  '/views/requests/requests.html',
  '/views/organization/organization.html',
  '/views/reports/reports.html',
  '/views/statistics/statistics.html',
  '/views/calendar/calendar.html',
  '/views/announcements/announcements.html',
  '/views/devices/devices.html',
  '/views/settings/settings.html',
  '/views/audit/audit.html',
  '/views/profile/profile.html',
  '/views/users/users.html',
  '/views/roles/roles.html',
  '/views/sessions/sessions.html',
  '/views/modals/user-dialog.html',
  '/views/modals/edit-user-dialog.html',
  '/views/modals/role-dialog.html',
  '/views/modals/organization-dialog.html',
  '/views/modals/employee-import-dialog.html',
  '/views/modals/announcement-dialog.html',
  '/views/modals/request-dialog.html',
  '/js/app.js',
  '/js/core/constants.js',
  '/js/core/state.js',
  '/js/core/utils.js',
  '/js/core/api.js',
  '/js/core/auth.js',
  '/js/core/router.js',
  '/js/core/view-loader.js',
  '/js/components/toast.js',
  '/js/components/clock.js',
  '/js/components/theme.js',
  '/js/modules/attendance/attendance.js',
  '/js/modules/attendance/geofence.js',
  '/js/modules/attendance/offline-sync.js',
  '/js/modules/dashboard/dashboard.js',
  '/js/modules/dashboard/metrics.js',
  '/js/modules/dashboard/charts.js',
  '/js/modules/dashboard/activity.js',
  '/js/modules/requests/requests.js',
  '/js/modules/organization/definitions.js',
  '/js/modules/organization/organization.js',
  '/js/modules/organization/employee-import.js',
  '/js/modules/users/users.js',
  '/js/modules/users/roles.js',
  '/js/modules/users/sessions.js',
  '/js/modules/devices/devices.js',
  '/js/modules/announcements/announcements.js',
  '/js/modules/reports/reports.js',
  '/js/modules/audit/audit.js',
  '/js/modules/notifications/notifications.js',
  '/js/modules/profile/profile.js',
  '/manifest.webmanifest',
  '/images/logo_msa.png',
  '/images/logo_msa_app.png',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js'
];
const NETWORK_FIRST_PATHS = new Set([
  '/',
  '/index.html',
  '/app.css',
  '/js/app.js',
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

// --- NOTIFICACIONES WEB PUSH API ---
self.addEventListener('push', (event) => {
  let data = {
    title: 'MSA Asistencia',
    body: 'Tiene una nueva notificación en el sistema.',
    url: '/',
    type: 'DEFAULT',
    tag: `msa-alert-${Date.now()}`
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/images/logo_msa_app.png',
    badge: '/images/logo_msa_app.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type
    },
    tag: data.tag || 'msa-general-alert',
    renotify: true,
    actions: [
      { action: 'open', title: 'Abrir sistema' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_CLICKED',
              url: targetUrl,
              data: event.notification.data
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

