// GET /api/zones – Return all zones with status, polygons, risk scores + facilities
import { Router } from 'express';
import { getAllZones, toFrontendZone } from '../models/Zone.js';
import { getPredictions } from '../models/Prediction.js';
import { getDB } from '../db/connection.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const zones = await getAllZones();
    const frontendZones = zones.map(z => toFrontendZone(z));

    // Attach latest prediction per zone
    const predictions = await getPredictions();
    const predMap = {};
    for (const p of predictions) {
      if (!predMap[p.zone_id]) predMap[p.zone_id] = p;
    }

    const enrichedZones = frontendZones.map(z => ({
      ...z,
      prediction: predMap[z.id] || null,
    }));

    // Fetch critical infrastructure facilities
    const db = getDB();
    const facilities = await db.collection('facilities').find({});

    res.json({
      zones: enrichedZones,
      facilities,
      count: enrichedZones.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Zones fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
