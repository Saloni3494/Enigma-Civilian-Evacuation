// Zone model helpers
import { getDB } from '../db/connection.js';

const COLLECTION = 'zones';

export const ZoneStatuses = ['SAFE', 'MODERATE', 'UNSAFE'];

// Map backend status to frontend status
export function toFrontendStatus(status) {
  const map = { SAFE: 'safe', MODERATE: 'warn', UNSAFE: 'danger' };
  return map[status] || 'safe';
}

// Map frontend status to backend status
export function toBackendStatus(status) {
  const map = { safe: 'SAFE', warn: 'MODERATE', danger: 'UNSAFE' };
  return map[status] || 'SAFE';
}

export async function getAllZones() {
  const db = getDB();
  return db.collection(COLLECTION).find({});
}

export async function getZone(zoneId) {
  const db = getDB();
  return db.collection(COLLECTION).findOne({ zone_id: zoneId });
}

export async function updateZoneStatus(zoneId, status, riskScore) {
  const db = getDB();
  return db.collection(COLLECTION).updateOne(
    { zone_id: zoneId },
    { $set: { status, risk_score: riskScore, last_updated: new Date() } }
  );
}

// Convert zone to frontend format
export function toFrontendZone(zone) {
  return {
    id: zone.zone_id,
    name: zone.name,
    lat: zone.center.lat,
    lng: zone.center.lng,
    status: toFrontendStatus(zone.status),
    population: zone.population || 0,
    risk_score: zone.risk_score || 0,
    polygon: zone.polygon,
    last_updated: zone.last_updated,
  };
}
