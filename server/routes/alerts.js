// GET /api/alerts – Return latest alerts
import { Router } from 'express';
import { getAlerts } from '../services/alertEngine.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const alerts = await getAlerts(parseInt(limit));
    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Alerts fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
