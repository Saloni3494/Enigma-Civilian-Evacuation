// Offline Map Service
// Uses Cache API directly from main thread for reliable tile pre-caching
// Service Worker handles fetch interception for serving cached tiles

const TILE_CACHE = 'sera-map-tiles-v1';
const listeners = new Set();

// Register the tile-caching service worker
export async function initOfflineMap() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported – offline map unavailable');
    return false;
  }

  try {
    await navigator.serviceWorker.register('/sw-tiles.js');
    console.log('🗺️ Offline map service worker registered');
    return true;
  } catch (err) {
    console.error('SW registration failed:', err);
    return false;
  }
}

// Subscribe to download progress events
export function onSwMessage(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify(msg) {
  for (const cb of listeners) {
    try { cb(msg); } catch (e) { /* ignore */ }
  }
}

// Generate tile URLs for a bounding box at specific zoom levels
function getTileUrls(bounds, zoomLevels) {
  const urls = [];
  for (const zoom of zoomLevels) {
    const minTile = latLngToTile(bounds.south, bounds.west, zoom);
    const maxTile = latLngToTile(bounds.north, bounds.east, zoom);

    const xMin = Math.min(minTile.x, maxTile.x);
    const xMax = Math.max(minTile.x, maxTile.x);
    const yMin = Math.min(minTile.y, maxTile.y);
    const yMax = Math.max(minTile.y, maxTile.y);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const s = ['a', 'b', 'c'][Math.abs(x + y) % 3];
        urls.push(`https://${s}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Pre-cache tiles using Cache API directly (no SW messaging needed)
async function downloadTiles(tileUrls) {
  if (!('caches' in window)) {
    console.warn('Cache API not available');
    return;
  }

  const cache = await caches.open(TILE_CACHE);
  let downloaded = 0;
  const total = tileUrls.length;

  // Download in batches of 6 to avoid overwhelming the browser
  const BATCH_SIZE = 6;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = tileUrls.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          // Skip if already cached
          const existing = await cache.match(url);
          if (existing) {
            downloaded++;
            return;
          }

          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            await cache.put(url, response);
          }
          downloaded++;
        } catch (err) {
          downloaded++;
          // Skip failed tiles
        }
      })
    );

    // Notify progress
    notify({
      type: 'PRECACHE_PROGRESS',
      downloaded,
      total,
    });
  }

  notify({
    type: 'PRECACHE_COMPLETE',
    downloaded,
    total,
  });
}

// Pre-cache tiles for the Bangalore demo area (zoom 12-16)
export function precacheDemoArea() {
  const bounds = {
    north: 12.9950,
    south: 12.9550,
    east:  77.6250,
    west:  77.5800,
  };

  const tileUrls = getTileUrls(bounds, [12, 13, 14, 15, 16]);
  downloadTiles(tileUrls); // fire and forget – progress via listeners
  return tileUrls.length;
}

// Pre-cache around a GPS coordinate
export function precacheAroundLocation(lat, lng, radiusKm = 5) {
  const degOffset = radiusKm / 111;
  const bounds = {
    north: lat + degOffset,
    south: lat - degOffset,
    east:  lng + degOffset,
    west:  lng - degOffset,
  };

  const tileUrls = getTileUrls(bounds, [13, 14, 15, 16]);
  downloadTiles(tileUrls);
  return tileUrls.length;
}

// Get cached tile count
export async function getCacheSize() {
  if (!('caches' in window)) return 0;
  try {
    const cache = await caches.open(TILE_CACHE);
    const keys = await cache.keys();
    return keys.length;
  } catch (err) {
    return 0;
  }
}

// Clear all cached tiles
export async function clearTileCache() {
  if (!('caches' in window)) return;
  await caches.delete(TILE_CACHE);
  notify({ type: 'CACHE_CLEARED' });
}
