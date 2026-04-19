// GET /api/heatmap – Return event density heatmap data
import { Router } from 'express';
import { generateHeatmap } from '../services/heatmapEngine.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { since = 60 } = req.query; // minutes
    const heatmap = await generateHeatmap({ since: parseInt(since) });
    res.json(heatmap);
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
