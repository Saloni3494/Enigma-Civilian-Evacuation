// POST /api/route/safe – Calculate safest route using A*
import { Router } from 'express';
import { getDB } from '../db/connection.js';
import { findSafePath } from '../services/orchestrator.js';
import { createRoute } from '../models/Route.js';
import { broadcastRouteUpdate } from '../websocket/wsManager.js';

const router = Router();

router.post('/safe', async (req, res) => {
  try {
    const { start, destination } = req.body;

    if (!start || !destination) {
      return res.status(400).json({
        error: 'Missing start or destination. Format: { lat, lng }',
      });
    }

    // Get current zone statuses
    const db = getDB();
    const zones = await db.collection('zones').find({});
    const zoneStatuses = {};
    for (const zone of zones) {
      zoneStatuses[zone.zone_id] = zone.status;
    }

    // Run A* pathfinding
    const pathResult = findSafePath(start, destination, zoneStatuses);

    if (!pathResult) {
      return res.status(404).json({
        error: 'No safe path found between the given coordinates',
        start,
        destination,
      });
    }

    // Store route
    const route = await createRoute({
      start,
      end: destination,
      path: pathResult.path,
      safety_score: pathResult.safety_score,
      distance: pathResult.distance,
    });

    // Broadcast route update
    broadcastRouteUpdate(route);

    res.json({
      success: true,
      route,
      message: `Safe route found with safety score ${pathResult.safety_score}`,
    });
  } catch (err) {
    console.error('Routing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET recent routes
router.get('/', async (req, res) => {
  try {
    const { getRoutes } = await import('../models/Route.js');
    const routes = await getRoutes(10);
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
