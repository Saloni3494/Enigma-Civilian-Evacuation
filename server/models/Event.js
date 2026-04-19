// Event model helpers
import { getDB } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION = 'events';

export const EventTypes = ['SOS', 'fire', 'hazard', 'camera_detection', 'structural', 'flood', 'explosion'];
export const EventSources = ['camera', 'satellite', 'device', 'manual'];

export async function createEvent(data) {
  const db = getDB();
  const event = {
    event_id: data.event_id || `evt-${uuidv4().slice(0, 8)}`,
    type: data.type || 'hazard',
    source: data.source || 'manual',
    device_id: data.device_id || null,
    location: data.location || { type: 'Point', coordinates: [77.5946, 12.9716] },
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    confidence: data.confidence ?? 0.8,
    synced: data.synced ?? true,
    description: data.description || '',
    severity: data.severity || 'warn',
  };
  await db.collection(COLLECTION).insertOne(event);
  return event;
}

export async function getEvents(options = {}) {
  const db = getDB();
  const { limit = 50, since, type } = options;
  const query = {};
  if (since) query.timestamp = { $gte: new Date(since) };
  if (type) query.type = type;
  return db.collection(COLLECTION).find(query, { sort: { timestamp: -1 }, limit });
}

export async function getRecentEvents(minutes = 30) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return getEvents({ since: since.toISOString() });
}
