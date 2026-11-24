// Nammooru Bus PWA Service Worker (v1.0.0)
const SHELL_CACHE = 'nb-shell-v1';
const TILES_CACHE = 'nb-tiles-v1';
const MAX_CACHED_TILES = 60;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/brand/logo-mark.png',
  '/brand/logo-banner.png',
  '/qr-download.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('PWA: Some shell assets failed to precache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE && key !== TILES_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. NEVER intercept APK downloads, version.json, releases.json or files in /downloads/
  if (
    url.pathname.startsWith('/downloads/') ||
    url.pathname.endsWith('.apk') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/releases.json')
  ) {
    return;
  }

  // 2. Ignore non-GET, chrome-extension, or Supabase realtime/auth endpoints
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('supabase.co')) return;

  // 3. Map Tile Caching (OSM / Carto tiles)
  if (url.hostname.includes('tile.openstreetmap') || url.hostname.includes('tile.openstreetmap.fr') || url.pathname.includes('/tile/')) {
    event.respondWith(
      caches.open(TILES_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            // Trim tile cache to MAX_CACHED_TILES
            cache.keys().then((keys) => {
              if (keys.length > MAX_CACHED_TILES) {
                cache.delete(keys[0]);
              }
            });
          }
          return networkResponse;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. App Shell & Static Assets: Stale-While-Revalidate with Clean Offline Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(SHELL_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Offline Fallback for Navigation Requests
        if (request.mode === 'navigate') {
          const shell = await caches.match('/index.html');
          if (shell) return shell;
        }
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
