// Offline Queue model helpers
import { getDB } from '../db/connection.js';

const COLLECTION = 'offline_queue';

export async function enqueue(payload) {
  const db = getDB();
  return db.collection(COLLECTION).insertOne({
    payload,
    timestamp: new Date(),
    synced: false,
  });
}

export async function getUnsynced() {
  const db = getDB();
  return db.collection(COLLECTION).find({ synced: false }, { sort: { timestamp: 1 } });
}

export async function markSynced(ids) {
  const db = getDB();
  for (const id of ids) {
    await db.collection(COLLECTION).updateOne(
      { _id: id },
      { $set: { synced: true } }
    );
  }
}

export async function getSyncStatus() {
  const db = getDB();
  const unsynced = await db.collection(COLLECTION).find({ synced: false });
  const total = await db.collection(COLLECTION).countDocuments({});
  return {
    pending: unsynced.length,
    total,
    synced: total - unsynced.length,
  };
}
