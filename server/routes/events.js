// POST /api/event/ingest – Accept events from satellite, camera, manual sources
import { Router } from 'express';
import { createEvent, getEvents } from '../models/Event.js';
import { runOrchestration } from '../services/orchestrator.js';
import { broadcastEvent } from '../websocket/wsManager.js';

const router = Router();

// Ingest a new event (satellite detection, camera detection, manual hazard)
router.post('/ingest', async (req, res) => {
  try {
    const {
      type = 'hazard',
      source = 'manual',
      device_id,
      location,
      confidence = 0.8,
      description = '',
      severity = 'warn',
    } = req.body;

    // Validate
    if (!location || !location.coordinates) {
      return res.status(400).json({
        error: 'Missing location. Must include { type: "Point", coordinates: [lng, lat] }',
      });
    }

    // Create event
    const event = await createEvent({
      type,
      source,
      device_id,
      location,
      confidence,
      description,
      severity,
      synced: true,
    });

    // Broadcast to WebSocket clients as timeline entry
    broadcastEvent({
      id: Date.now(),
      type: source === 'camera' ? 'camera' : type === 'SOS' ? 'sos' : 'zone',
      time: new Date().toTimeString().slice(0, 8),
      message: description || `${type} detected via ${source}`,
      zone: null,
      severity,
    });

    // Trigger orchestration pipeline (async – don't block response)
    runOrchestration(event).catch(err => {
      console.error('Orchestration error:', err.message);
    });

    res.status(201).json({
      success: true,
      event,
      message: 'Event ingested, orchestration pipeline triggered',
    });
  } catch (err) {
    console.error('Event ingest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get events with optional filters
router.get('/', async (req, res) => {
  try {
    const { limit = 50, since, type } = req.query;
    const events = await getEvents({
      limit: parseInt(limit),
      since,
      type,
    });
    res.json({ events, count: events.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
