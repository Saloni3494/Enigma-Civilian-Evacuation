// Offline Sync Manager
import { getDB } from '../db/connection.js';
import { createEvent } from '../models/Event.js';
import { broadcastSyncStatus } from '../websocket/wsManager.js';

export async function processOfflineSync(events) {
  const db = getDB();
  const results = {
    total: events.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const eventData of events) {
    try {
      // Create the event in the database
      await createEvent({
        ...eventData,
        synced: true,
        timestamp: eventData.timestamp || new Date(),
      });
      results.synced++;

      // Mark corresponding offline queue entry as synced
      if (eventData._queue_id) {
        await db.collection('offline_queue').updateOne(
          { _id: eventData._queue_id },
          { $set: { synced: true } }
        );
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ event_id: eventData.event_id, error: err.message });
    }
  }

  // Broadcast sync status
  const syncStatus = {
    pending: 0,
    just_synced: results.synced,
    failed: results.failed,
    timestamp: new Date().toISOString(),
  };
  broadcastSyncStatus(syncStatus);

  return results;
}

export async function getSyncStatus() {
  const db = getDB();
  const unsynced = await db.collection('offline_queue').find({ synced: false });
  const total = await db.collection('offline_queue').countDocuments({});
  return {
    pending: unsynced.length,
    total,
    synced: total - unsynced.length,
    timestamp: new Date().toISOString(),
  };
}
