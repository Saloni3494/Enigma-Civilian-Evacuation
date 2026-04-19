// WebSocket connection manager and broadcast system
import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`🔌 WebSocket client connected (${clients.size} total)`);

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      payload: {
        message: 'Connected to SERA real-time feed',
        timestamp: new Date().toISOString(),
        clientCount: clients.size,
      },
    }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`🔌 WebSocket client disconnected (${clients.size} remaining)`);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });

    // Handle incoming messages from clients
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(ws, msg);
      } catch (e) {
        // Ignore malformed messages
      }
    });
  });

  console.log('🔌 WebSocket server initialized on /ws');
  return wss;
}

function handleClientMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
      break;
    case 'subscribe':
      // Could implement channel subscriptions here
      break;
    default:
      break;
  }
}

// Broadcast to all connected clients
export function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  let sent = 0;
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sent++;
    }
  }
  return sent;
}

// Broadcast specific event types
export function broadcastZoneUpdate(zones) {
  return broadcast('zone_update', { zones });
}

export function broadcastAlert(alert) {
  return broadcast('alert', { alert });
}

export function broadcastPipelineProgress(step, active = true) {
  return broadcast('pipeline_progress', { active, step });
}

export function broadcastRouteUpdate(route) {
  return broadcast('route_update', { route });
}

export function broadcastEvent(event) {
  return broadcast('event', { event });
}

export function broadcastSyncStatus(status) {
  return broadcast('sync_status', status);
}

export function broadcastSOSActive(deviceId, location) {
  return broadcast('sos_active', { device_id: deviceId, location });
}

export function getClientCount() {
  return clients.size;
}
