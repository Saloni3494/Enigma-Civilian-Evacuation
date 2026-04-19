// POST /api/device/sos – Handle SOS from mesh devices
import { Router } from 'express';
import { createEvent } from '../models/Event.js';
import { upsertDevice } from '../models/Device.js';
import { triggerSOSAlert } from '../services/alertEngine.js';
import { runOrchestration } from '../services/orchestrator.js';
import { broadcastSOSActive, broadcastEvent } from '../websocket/wsManager.js';

const router = Router();

router.post('/sos', async (req, res) => {
  try {
    const { device_id, location, label } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'Missing device_id' });
    }

    const loc = location || { type: 'Point', coordinates: [77.6088, 12.9781] };

    // Update device status
    await upsertDevice(device_id, {
      last_location: loc,
      status: 'sos',
      label: label || device_id,
    });

    // Create SOS event
    const event = await createEvent({
      type: 'SOS',
      source: 'device',
      device_id,
      location: loc,
      confidence: 1.0,
      description: `SOS activated – Device ${label || device_id} – broadcasting via mesh network`,
      severity: 'danger',
    });

    // Trigger SOS alert
    await triggerSOSAlert(device_id, loc);

    // Broadcast SOS activation
    broadcastSOSActive(device_id, loc);
    broadcastEvent({
      id: Date.now(),
      type: 'sos',
      time: new Date().toTimeString().slice(0, 8),
      message: `SOS activated – Device ${label || device_id} – broadcasting via mesh network`,
      zone: null,
      severity: 'danger',
    });

    // Trigger orchestration (async)
    runOrchestration(event).catch(err => {
      console.error('SOS orchestration error:', err.message);
    });

    res.status(201).json({
      success: true,
      event,
      message: 'SOS received, alerts triggered, orchestration started',
    });
  } catch (err) {
    console.error('SOS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all devices
router.get('/', async (req, res) => {
  try {
    const { getAllDevices } = await import('../models/Device.js');
    const cursor = await getAllDevices();
    const devices = Array.isArray(cursor) ? cursor : await cursor.toArray();
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/device/buzzer — UI triggers the ESP32 hardware buzzer
router.post('/buzzer', async (req, res) => {
  // 1. Broadcast SOS alert to ALL connected web dashboard clients IMMEDIATELY
  const { broadcast, broadcastEvent: bcastEvt } = await import('../websocket/wsManager.js');
  
  broadcast('alert', {
    alert: {
      alert_id: `sos-ui-${Date.now()}`,
      msg: '🆘 SOS Alert — Emergency broadcast sent to all devices and SERA hardware',
      severity: 'danger',
    }
  });

  bcastEvt({
    id: Date.now(),
    type: 'sos',
    time: new Date().toTimeString().slice(0, 8),
    message: '🆘 SOS triggered from dashboard — buzzer activated on SERA Tag',
    zone: null,
    severity: 'danger',
  });

  // 2. Respond to the UI immediately so it doesn't hang
  res.json({
    success: true,
    message: 'Alert sent to all clients. Attempting to trigger ESP32 buzzer in background...',
  });

  // 3. Try to reach the ESP32 in the background
  const ESP32_URL = 'http://192.168.4.1';
  try {
    const response = await fetch(`${ESP32_URL}/buzzer`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      console.log('🔔 ESP32 buzzer triggered successfully from UI SOS');
    }
  } catch (e) {
    console.warn('⚠️  Could not reach ESP32 for buzzer (Laptop not connected to SERA_TAG_001 WiFi)');
  }
});

// Helper for Point in Polygon check
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

// POST /api/device/data - Handle real-time hardware telemetry
router.post('/data', async (req, res) => {
  try {
    const { device_id, lat, lon, temperature, sos, timestamp } = req.body;
    
    if (!device_id || lat == null || lon == null) {
      return res.status(400).json({ error: 'Missing required hardware payload data' });
    }

    const loc = { type: 'Point', coordinates: [lon, lat] }; // Note: MongoDB uses [lon, lat]
    
    // Check if inside any unsafe (danger) zone
    const { getAllZones } = await import('../models/Zone.js');
    const zones = await getAllZones();
    const unsafeZones = await zones.toArray();
    let insideUnsafe = false;
    
    for (const z of unsafeZones) {
      if (z.status === 'UNSAFE' && z.polygon && z.polygon.length > 0) {
        // polygon is array of [lat, lon]
        if (pointInPolygon([lat, lon], z.polygon)) {
          insideUnsafe = true;
          break;
        }
      }
    }

    const isDistress = sos === true;
    const finalStatus = isDistress ? 'sos' : (insideUnsafe ? 'danger' : 'online');

    await upsertDevice(device_id, {
      last_location: loc,
      temperature,
      status: finalStatus,
    });

    if (isDistress) {
      // Trigger SOS workflow
      const event = await createEvent({
        type: 'SOS',
        source: 'hardware_device',
        device_id,
        location: loc,
        confidence: 1.0,
        description: `Hardware SOS triggered - ${device_id}`,
        severity: 'danger',
      });
      await triggerSOSAlert(device_id, loc);
      broadcastSOSActive(device_id, loc);
      runOrchestration(event).catch(() => {});
    }

    // Broadcast device update to map UI
    const { broadcast } = await import('../websocket/wsManager.js');
    broadcast('DEVICE_UPDATE', {
      device: {
        device_id,
        lat,
        lng: lon,
        temperature,
        status: finalStatus,
        sos: isDistress,
        timestamp: timestamp || Date.now()
      }
    });

    // Determine if hardware buzzer should trigger
    const shouldBuzz = isDistress || insideUnsafe;

    res.json({
      success: true,
      buzzer: shouldBuzz
    });

  } catch (err) {
    console.error('Device telemetry error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
