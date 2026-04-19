// Alert Engine – triggers alerts and broadcasts them
import { getDB } from '../db/connection.js';
import { broadcastAlert } from '../websocket/wsManager.js';

const COLLECTION = 'alerts';
let alertCounter = 0;

export async function triggerAlert(message, severity = 'danger', source = 'system') {
  const db = getDB();
  const alert = {
    alert_id: `alert-${Date.now()}-${++alertCounter}`,
    msg: message,
    severity, // 'danger' | 'warn' | 'safe'
    source,
    timestamp: new Date(),
    read: false,
  };

  await db.collection(COLLECTION).insertOne(alert);

  // Broadcast to all connected WebSocket clients
  broadcastAlert(alert);

  console.log(`🚨 Alert [${severity}]: ${message}`);
  return alert;
}

export async function getAlerts(limit = 20) {
  const db = getDB();
  return db.collection(COLLECTION).find({}, { sort: { timestamp: -1 }, limit });
}

// Check zone transitions and trigger alerts
export async function checkZoneAlerts(zoneId, oldStatus, newStatus, zoneName) {
  if (oldStatus === newStatus) return;

  if (newStatus === 'UNSAFE') {
    await triggerAlert(
      `⚠️ ${zoneName} has become UNSAFE – Risk level critical`,
      'danger',
      'zone_monitor'
    );
  } else if (newStatus === 'MODERATE' && oldStatus === 'SAFE') {
    await triggerAlert(
      `🔶 ${zoneName} elevated to MODERATE risk`,
      'warn',
      'zone_monitor'
    );
  } else if (newStatus === 'SAFE' && oldStatus !== 'SAFE') {
    await triggerAlert(
      `✅ ${zoneName} restored to SAFE status`,
      'safe',
      'zone_monitor'
    );
  }
}

// Trigger SOS alert
export async function triggerSOSAlert(deviceId, location) {
  return triggerAlert(
    `🆘 SOS Broadcast active – Device ${deviceId} – mesh relay engaged`,
    'danger',
    'sos'
  );
}

// Trigger route blocked alert
export async function triggerRouteBlockedAlert(routeInfo) {
  return triggerAlert(
    `🚧 Route blocked – recalculating safe path`,
    'warn',
    'routing'
  );
}
