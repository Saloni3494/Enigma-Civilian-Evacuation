// POST /api/offline/sync – Accept batch of offline-queued events
import { Router } from 'express';
import { processOfflineSync, getSyncStatus } from '../services/offlineSync.js';

const router = Router();

router.post('/sync', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Missing events array' });
    }

    console.log(`📡 Offline sync: processing ${events.length} queued events...`);

    const result = await processOfflineSync(events);

    res.json({
      success: true,
      ...result,
      message: `Synced ${result.synced}/${result.total} events`,
    });
  } catch (err) {
    console.error('Offline sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET sync status
router.get('/status', async (req, res) => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
