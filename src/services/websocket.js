// SERA WebSocket Client with auto-reconnect
// Connects directly to backend (no Vite proxy for WS – avoids HMR conflict)
const WS_URL = import.meta.env?.VITE_WS_URL || 'ws://localhost:3001/ws';

let ws = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 10000;
const handlers = {};

export function onMessage(type, callback) {
  if (!handlers[type]) handlers[type] = [];
  handlers[type].push(callback);
  return () => {
    handlers[type] = handlers[type].filter(cb => cb !== callback);
  };
}

function dispatch(type, payload) {
  const cbs = handlers[type] || [];
  for (const cb of cbs) {
    try {
      cb(payload);
    } catch (err) {
      console.error(`WS handler error (${type}):`, err);
    }
  }
  // Also dispatch to wildcard handlers
  const wildcards = handlers['*'] || [];
  for (const cb of wildcards) {
    try {
      cb({ type, payload });
    } catch (err) {
      console.error('WS wildcard handler error:', err);
    }
  }
}

export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('🔌 WebSocket connected to SERA backend');
      reconnectAttempts = 0;
      dispatch('connection', { connected: true });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        dispatch(msg.type, msg.payload);
      } catch (err) {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      dispatch('connection', { connected: false });
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      // Silently handle – onclose will fire
    };
  } catch (err) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function send(type, payload = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

export function isConnected() {
  return ws && ws.readyState === WebSocket.OPEN;
}
