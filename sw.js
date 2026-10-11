/* ═══════════════════════════════════════
   MadPlan — Service Worker
   PWA offline cache + background sync
   ═══════════════════════════════════════ */

const CACHE_NAME = 'madplan-v5';
const STATIC_CACHE = 'madplan-static-v5';
const API_CACHE = 'madplan-api-v4';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/recipes.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  ];

// ─── INSTALL ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  console.log('[SW] Installing MadPlan service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        // Cache each file individually so one failure doesn't break all
        return Promise.allSettled(
          STATIC_FILES.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Could not cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH STRATEGY ───────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and Chrome extensions
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Anthropic API calls → Network only (never cache sensitive API calls)
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts → Cache first, fallback to network
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // PHP-endpoints (login, proxy, historik) → altid direkte til netværket
  if (url.origin === self.location.origin && url.pathname.endsWith('.php')) return;

  // App shell (HTML, CSS, JS, ikoner) → NETWORK FIRST.
  // Nye deploys vises med det samme; cachen bruges kun når man er offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html', { ignoreSearch: true });
          }
          return Response.error();
        })
      )
    );
    return;
  }

  // Everything else → network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'sync-plans') {
    console.log('[SW] Background sync: plans');
  }
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'MadPlan', {
    body: data.body || 'Din madplan er klar!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'madplan-notification',
    data: { url: data.url || '/' },
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
