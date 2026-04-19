// Prediction model helpers
import { getDB } from '../db/connection.js';

const COLLECTION = 'predictions';

export async function createPrediction(data) {
  const db = getDB();
  const prediction = {
    zone_id: data.zone_id,
    risk_level: data.risk_level || 'LOW',
    confidence: data.confidence ?? 0.5,
    timestamp: new Date(),
    details: data.details || null,
  };
  await db.collection(COLLECTION).insertOne(prediction);
  return prediction;
}

export async function getPredictions(zoneId = null) {
  const db = getDB();
  const query = zoneId ? { zone_id: zoneId } : {};
  return db.collection(COLLECTION).find(query, { sort: { timestamp: -1 }, limit: 20 });
}

export async function getLatestPrediction(zoneId) {
  const db = getDB();
  const results = await db.collection(COLLECTION).find(
    { zone_id: zoneId },
    { sort: { timestamp: -1 }, limit: 1 }
  );
  return results[0] || null;
}
