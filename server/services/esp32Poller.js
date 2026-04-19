// ESP32 Hardware Poller
// Polls the ESP32's built-in web server for sensor data every 2 seconds.
// The ESP32 runs as a WiFi hotspot — connect your laptop to its network.
//
// Usage:
//   1. Connect your laptop WiFi to "SERA_TAG_001" (password: sera1234)
//   2. Start the backend: node server/index.js
//   3. This poller automatically fetches data from http://192.168.4.1/data

import { upsertDevice } from '../models/Device.js';
import { createEvent } from '../models/Event.js';
import { triggerSOSAlert } from './alertEngine.js';
import { runOrchestration } from './orchestrator.js';
import { broadcast, broadcastSOSActive, broadcastEvent } from '../websocket/wsManager.js';

// ESP32 Access Point IP (this is always the same in AP mode)
const ESP32_URL = 'http://192.168.4.1';
const POLL_INTERVAL = 2000; // 2 seconds

let pollTimer = null;
let lastSosState = false;

// Point-in-polygon check (ray casting algorithm)
function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

async function pollESP32() {
  try {
    // Fetch sensor data from ESP32's built-in web server
    const response = await fetch(`${ESP32_URL}/data`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const { device_id, lat, lon, temperature, sos, timestamp } = data;

    if (!device_id || lat == null || lon == null) {
      console.warn('[ESP32 Poller] Invalid data received:', data);
      return;
    }

    const loc = { type: 'Point', coordinates: [lon, lat] };

    // Check if inside any unsafe zone
    let insideUnsafe = false;
    try {
      const { getAllZones } = await import('../models/Zone.js');
      const zones = await getAllZones();
      const allZones = await zones.toArray();

      for (const z of allZones) {
        if (z.status === 'UNSAFE' && z.polygon && z.polygon.length > 0) {
          if (pointInPolygon([lat, lon], z.polygon)) {
            insideUnsafe = true;
            break;
          }
        }
      }
    } catch (e) {
      // Zone check failed — continue without it
    }

    const isDistress = sos === true;
    const finalStatus = isDistress ? 'sos' : (insideUnsafe ? 'danger' : 'online');

    // Save to database
    await upsertDevice(device_id, {
      last_location: loc,
      temperature,
      status: finalStatus,
    });

    // Handle SOS (only trigger once per press, not every poll)
    if (isDistress && !lastSosState) {
      console.log(`🚨 [ESP32 Poller] SOS received from ${device_id}!`);
      const event = await createEvent({
        type: 'SOS',
        source: 'hardware_device',
        device_id,
        location: loc,
        confidence: 1.0,
        description: `Hardware SOS triggered — ${device_id}`,
        severity: 'danger',
      });
      await triggerSOSAlert(device_id, loc);
      broadcastSOSActive(device_id, loc);
      
      // Send the event directly to the UI timeline for all connected devices
      broadcastEvent({
        id: Date.now(),
        type: 'sos',
        time: new Date().toTimeString().slice(0, 8),
        message: `🆘 SOS Hardware Button Pressed! — Device ${device_id} is in distress`,
        zone: null,
        severity: 'danger',
      });

      runOrchestration(event).catch(() => {});
    }
    lastSosState = isDistress;

    // Broadcast device update to all connected web dashboards
    broadcast('DEVICE_UPDATE', {
      device: {
        device_id,
        lat,
        lng: lon,
        temperature,
        status: finalStatus,
        sos: isDistress,
        timestamp: timestamp || Date.now(),
      }
    });

    // If device is in danger zone, trigger the buzzer on the ESP32
    if (insideUnsafe && !isDistress) {
      try {
        await fetch(`${ESP32_URL}/buzzer`, {
          method: 'POST',
          signal: AbortSignal.timeout(2000),
        });
        console.log(`🔔 [ESP32 Poller] Buzzer triggered on ${device_id} (danger zone)`);
      } catch (e) {
        // Buzzer trigger failed — not critical
      }
    }

  } catch (err) {
    // Don't spam logs — ESP32 might just not be reachable yet
    if (err.name !== 'TimeoutError' && err.code !== 'ECONNREFUSED' && err.cause?.code !== 'ECONNREFUSED') {
      console.warn(`[ESP32 Poller] Error: ${err.message}`);
    }
  }
}

export function startESP32Poller() {
  if (pollTimer) return; // Already running

  console.log('📡 ESP32 Poller started');
  console.log(`   Polling: ${ESP32_URL}/data every ${POLL_INTERVAL / 1000}s`);
  console.log('   Make sure your laptop is connected to the ESP32 hotspot!');

  // Poll immediately, then every POLL_INTERVAL
  pollESP32();
  pollTimer = setInterval(pollESP32, POLL_INTERVAL);
}

export function stopESP32Poller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('📡 ESP32 Poller stopped');
  }
}
