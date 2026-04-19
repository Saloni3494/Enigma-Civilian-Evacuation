// Device model helpers
import { getDB } from '../db/connection.js';

const COLLECTION = 'devices';

export async function getDevice(deviceId) {
  const db = getDB();
  return db.collection(COLLECTION).findOne({ device_id: deviceId });
}

export async function getAllDevices() {
  const db = getDB();
  return db.collection(COLLECTION).find({});
}

export async function updateDevice(deviceId, data) {
  const db = getDB();
  return db.collection(COLLECTION).updateOne(
    { device_id: deviceId },
    {
      $set: {
        last_seen: new Date(),
        ...(data.last_location && { last_location: data.last_location }),
        ...(data.status && { status: data.status }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.label && { label: data.label }),
      },
    }
  );
}

export async function upsertDevice(deviceId, data) {
  const db = getDB();
  const existing = await getDevice(deviceId);
  if (existing) {
    return updateDevice(deviceId, data);
  }
  return db.collection(COLLECTION).insertOne({
    device_id: deviceId,
    label: data.label || deviceId,
    last_seen: new Date(),
    last_location: data.last_location || { type: 'Point', coordinates: [77.5946, 12.9716] },
    status: data.status || 'online',
    temperature: data.temperature || null,
  });
}
