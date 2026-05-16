/* ═══════════════════════════════════════
   MadPlan — Service Worker
   PWA offline cache + background sync
   ═══════════════════════════════════════ */

const CACHE_NAME = 'madplan-v1';
const STATIC_CACHE = 'madplan-static-v1';
const API_CACHE = 'madplan-api-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;700&display=swap',
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

  // App shell (HTML, CSS, JS, icons) → Cache first, then network
  if (
    url.origin === self.location.origin ||
    STATIC_FILES.includes(event.request.url)
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // Return cached, but revalidate in background
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(STATIC_CACHE).then(cache => cache.put(event.request, networkResponse.clone()));
            }
            return networkResponse;
          }).catch(() => {/* offline, cached version served */});
          return cached;
        }

        // Not in cache → fetch and cache
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback — return index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
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
