// Heatmap Engine – aggregates event density by location
import { getDB } from '../db/connection.js';

// Grid-based clustering for heatmap data
const GRID_SIZE = 0.003; // ~300m grid cells

function gridKey(lat, lng) {
  const gridLat = Math.round(lat / GRID_SIZE) * GRID_SIZE;
  const gridLng = Math.round(lng / GRID_SIZE) * GRID_SIZE;
  return `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
}

export async function generateHeatmap(options = {}) {
  const db = getDB();
  const { since = 60 } = options; // minutes
  const sinceDate = new Date(Date.now() - since * 60 * 1000);

  const events = await db.collection('events').find(
    { timestamp: { $gte: sinceDate } },
    { sort: { timestamp: -1 } }
  );

  // Aggregate into grid cells
  const grid = {};
  for (const event of events) {
    if (!event.location?.coordinates) continue;
    const [lng, lat] = event.location.coordinates;
    const key = gridKey(lat, lng);

    if (!grid[key]) {
      grid[key] = {
        lat: Math.round(lat / GRID_SIZE) * GRID_SIZE,
        lng: Math.round(lng / GRID_SIZE) * GRID_SIZE,
        count: 0,
        severity_sum: 0,
        events: [],
        types: new Set(),
      };
    }
    grid[key].count++;
    grid[key].types.add(event.type);

    const severityWeight = event.severity === 'danger' ? 3 : event.severity === 'warn' ? 2 : 1;
    grid[key].severity_sum += severityWeight;
    grid[key].events.push({
      event_id: event.event_id,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
    });
  }

  // Convert to array and compute intensity
  const clusters = Object.values(grid).map(cell => ({
    lat: cell.lat,
    lng: cell.lng,
    count: cell.count,
    intensity: Math.min(1, cell.severity_sum / 10), // Normalized 0-1
    severity: cell.severity_sum > 6 ? 'danger' : cell.severity_sum > 3 ? 'warn' : 'safe',
    types: [...cell.types],
    event_count: cell.events.length,
  }));

  return {
    clusters,
    total_events: events.length,
    grid_size_km: GRID_SIZE * 111, // rough km
    since: sinceDate.toISOString(),
    generated_at: new Date().toISOString(),
  };
}
