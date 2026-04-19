// Route model helpers
import { getDB } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION = 'routes';

export async function createRoute(data) {
  const db = getDB();
  const route = {
    route_id: data.route_id || `route-${uuidv4().slice(0, 8)}`,
    start: data.start,
    end: data.end,
    path: data.path || [],
    safety_score: data.safety_score ?? 0,
    distance: data.distance || 0,
    created_at: new Date(),
  };
  await db.collection(COLLECTION).insertOne(route);
  return route;
}

export async function getRoutes(limit = 10) {
  const db = getDB();
  return db.collection(COLLECTION).find({}, { sort: { created_at: -1 }, limit });
}
