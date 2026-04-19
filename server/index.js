// SERA Backend – Main Entry Point
// Express server + WebSocket + MongoDB
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import config from './config.js';
import { connectDB, isUsingMemory } from './db/connection.js';
import { seedDatabase } from './db/seed.js';
import { initWebSocket, getClientCount } from './websocket/wsManager.js';

// Route imports
import eventsRouter from './routes/events.js';
import devicesRouter from './routes/devices.js';
import offlineRouter from './routes/offline.js';
import zonesRouter from './routes/zones.js';
import routingRouter from './routes/routing.js';
import alertsRouter from './routes/alerts.js';
import heatmapRouter from './routes/heatmap.js';
import authRouter from './routes/auth.js';

const app = express();

// ========= MIDDLEWARE =========
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`${req.method} ${req.path} → ${res.statusCode} (${elapsed}ms)`);
    }
  });
  next();
});

// ========= API ROUTES =========
app.use('/api/event', eventsRouter);
app.use('/api/device', devicesRouter);
app.use('/api/offline', offlineRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/route', routingRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/heatmap', heatmapRouter);
app.use('/api/auth', authRouter);

// ========= HEALTH CHECK =========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SERA Backend',
    version: '1.0.0',
    storage: isUsingMemory() ? 'in-memory' : 'mongodb',
    websocket_clients: getClientCount(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ========= API DOCUMENTATION =========
app.get('/api', (req, res) => {
  res.json({
    name: 'SERA – Civilian Safety Zone Monitor API',
    version: '1.0.0',
    endpoints: {
      'GET  /api/health': 'System health check',
      'POST /api/event/ingest': 'Ingest satellite/camera/manual events',
      'GET  /api/event': 'List events (query: limit, since, type)',
      'POST /api/device/sos': 'Trigger SOS from mesh device',
      'GET  /api/device': 'List mesh devices',
      'POST /api/offline/sync': 'Sync offline-queued events',
      'GET  /api/offline/status': 'Get sync status',
      'GET  /api/zones': 'Get all safety zones',
      'POST /api/route/safe': 'Calculate safest route (A*)',
      'GET  /api/route': 'List recent routes',
      'GET  /api/alerts': 'Get latest alerts',
      'GET  /api/heatmap': 'Get event density heatmap',
      'WS   /ws': 'Real-time WebSocket feed',
    },
    websocket_events: [
      'connected', 'zone_update', 'alert', 'pipeline_progress',
      'route_update', 'event', 'sync_status', 'sos_active',
    ],
  });
});

// ========= ERROR HANDLER =========
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ========= START SERVER =========
async function start() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SERA – Civilian Safety Zone Monitor       ║');
  console.log('║   Backend Server v1.0.0                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Connect to database
  await connectDB();

  // Seed database with demo data
  await seedDatabase();

  // Create HTTP server
  const server = createServer(app);

  // Initialize WebSocket
  initWebSocket(server);

  // Start listening
  server.listen(config.PORT, () => {
    console.log('');
    console.log(`🚀 SERA Backend running on http://localhost:${config.PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${config.PORT}/ws`);
    console.log(`📋 API docs at http://localhost:${config.PORT}/api`);
    console.log(`💾 Storage: ${isUsingMemory() ? 'In-Memory (offline mode)' : 'MongoDB'}`);
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    server.close();
    const { closeDB } = await import('./db/connection.js');
    await closeDB();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start SERA backend:', err);
  process.exit(1);
});
