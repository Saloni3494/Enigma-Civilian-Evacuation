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
    const devices = await getAllDevices();
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
