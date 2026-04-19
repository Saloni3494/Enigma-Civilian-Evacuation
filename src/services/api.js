// SERA REST API Client
// In dev, Vite proxy routes /api → localhost:3001/api
// In production, set VITE_API_URL environment variable
const BASE_URL = import.meta.env?.VITE_API_URL || '/api';

async function request(method, path, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      console.warn(`API ${method} ${path} failed:`, data);
      return null;
    }
    return data;
  } catch (err) {
    console.warn(`API ${method} ${path} unreachable:`, err.message);
    return null;
  }
}

// ===== Event APIs =====
export async function ingestEvent(eventData) {
  return request('POST', '/event/ingest', eventData);
}

export async function getEvents(options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit);
  if (options.since) params.set('since', options.since);
  if (options.type) params.set('type', options.type);
  const qs = params.toString();
  return request('GET', `/event${qs ? '?' + qs : ''}`);
}

// ===== Device / SOS APIs =====
export async function sendSOS(deviceId, location, label) {
  return request('POST', '/device/sos', {
    device_id: deviceId,
    location,
    label,
  });
}

export async function getDevices() {
  return request('GET', '/device');
}

// ===== Offline Sync =====
export async function syncOfflineEvents(events) {
  return request('POST', '/offline/sync', { events });
}

export async function getSyncStatus() {
  return request('GET', '/offline/status');
}

// ===== Zones =====
export async function getZones() {
  return request('GET', '/zones');
}

// ===== Safe Routing =====
export async function getSafeRoute(start, destination) {
  return request('POST', '/route/safe', { start, destination });
}

export async function getRoutes() {
  return request('GET', '/route');
}

// ===== Alerts =====
export async function getAlerts(limit = 20) {
  return request('GET', `/alerts?limit=${limit}`);
}

// ===== Heatmap =====
export async function getHeatmap(since = 60) {
  return request('GET', `/heatmap?since=${since}`);
}

// ===== Health =====
export async function checkHealth() {
  return request('GET', '/health');
}

// ===== Authentication =====
export async function loginUser(email, password) {
  return request('POST', '/auth/login', { email, password });
}

export async function registerUser(name, email, password, phone) {
  return request('POST', '/auth/register', { name, email, password, phone });
}

export async function updateLocation(email, location) {
  return request('PUT', '/auth/location', { email, location });
}

export async function getPhoneLocation(phone) {
  return request('GET', `/auth/location/${encodeURIComponent(phone)}`);
}

// ===== Offline Queue (localStorage) =====
const OFFLINE_QUEUE_KEY = 'sera_offline_queue';

export function queueOfflineEvent(event) {
  const queue = getOfflineQueue();
  queue.push({ ...event, _queued_at: Date.now() });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0 };

  const result = await syncOfflineEvents(queue);
  if (result?.success) {
    clearOfflineQueue();
  }
  return result;
}
