// Service Worker for offline map tile caching
// Intercepts OpenStreetMap tile requests and serves from cache when available

const TILE_CACHE = 'sera-map-tiles-v1';
const TILE_PATTERN = /tile\.openstreetmap\.org/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Fetch: cache-first for map tiles, passthrough for everything else
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!TILE_PATTERN.test(url)) return;

  event.respondWith(
    caches.open(TILE_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        // Offline + not cached = blank tile
        return new Response(
          `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
            <rect width="256" height="256" fill="#1e293b"/>
            <text x="128" y="128" text-anchor="middle" fill="#475569" font-size="11" font-family="sans-serif">Offline</text>
          </svg>`,
          { headers: { 'Content-Type': 'image/svg+xml' } }
        );
      }
    })
  );
});
