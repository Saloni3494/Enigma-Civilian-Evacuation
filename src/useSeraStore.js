// useSeraStore.js – Central state for SERA Dashboard
// Integrates with backend APIs + WebSocket while preserving demo fallback
import { useState, useCallback, useEffect, useRef } from 'react';
import * as api from './services/api.js';
import * as ws from './services/websocket.js';

export const ZONES = [
  { id: 'zone-a', name: 'Sector 4 – Shivajinagar', lat: 18.4641, lng: 73.8626, status: 'safe', population: 4200 },
  { id: 'zone-b', name: 'Sector 7 – Deccan', lat: 18.4661, lng: 73.8676, status: 'warn', population: 2800 },
  { id: 'zone-c', name: 'Sector 12 – Hadapsar', lat: 18.4550, lng: 73.8750, status: 'danger', population: 1500 },
  { id: 'zone-d', name: 'Sector 2 – Koregaon Park', lat: 18.4700, lng: 73.8550, status: 'safe', population: 6100 },
  { id: 'zone-e', name: 'Sector 9 – Kothrud', lat: 18.4650, lng: 73.8800, status: 'safe', population: 3300 },
];

export const MESH_DEVICES = [
  { id: 'dev-1', lat: 18.4641, lng: 73.8626, label: 'Node-A1', online: true },
  { id: 'dev-2', lat: 18.4661, lng: 73.8676, label: 'Node-B2', online: true },
  { id: 'dev-3', lat: 18.4550, lng: 73.8750, label: 'Node-C3', online: false },
  { id: 'dev-4', lat: 18.4700, lng: 73.8550, label: 'Node-D4', online: true },
  { id: 'dev-5', lat: 18.4650, lng: 73.8800, label: 'Node-E5', online: true },
];

const INITIAL_TIMELINE = [
  { id: 1, type: 'camera', time: '19:02:11', message: 'Fire detected – Sector 12 Industrial', zone: 'zone-c', severity: 'danger' },
  { id: 2, type: 'zone', time: '19:01:34', message: 'Zone updated: Sector 7 → Warning', zone: 'zone-b', severity: 'warn' },
  { id: 3, type: 'sos', time: '18:59:02', message: 'SOS triggered – Sector 7, Device Node-B2', zone: 'zone-b', severity: 'warn' },
  { id: 4, type: 'route', time: '18:57:45', message: 'Safe route calculated – Sector 12 → 4', zone: 'zone-c', severity: 'info' },
  { id: 5, type: 'camera', time: '18:55:20', message: 'Hazard identified – structural damage', zone: 'zone-c', severity: 'danger' },
];

let _alertCounter = 0;

export function useSeraStore() {
  const [mode, setMode] = useState('admin'); // 'civilian' | 'admin'
  const [zones, setZones] = useState(ZONES);
  const [facilities, setFacilities] = useState([]);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE);
  const [alerts, setAlerts] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [routeBlocked, setRouteBlocked] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [aiPipeline, setAiPipeline] = useState({ active: false, step: -1 });
  const [cameraHazard, setCameraHazard] = useState(false);
  const [meshBroadcast, setMeshBroadcast] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, synced: 0 });
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sera_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }); // { name, role, id, email, phone }
  const [userRecommendations, setUserRecommendations] = useState([]);
  const [trackedPhone, setTrackedPhone] = useState('');
  const [hardwareDevices, setHardwareDevices] = useState({});

  const backendRef = useRef(false);

  // ===== BACKEND INTEGRATION =====

  // Connect to WebSocket and set up handlers
  useEffect(() => {
    // Check backend health
    api.checkHealth().then(health => {
      if (health?.status === 'ok') {
        setBackendConnected(true);
        backendRef.current = true;
        console.log('✅ SERA backend connected:', health.storage);
        // Fetch initial zones from backend
        api.getZones().then(data => {
          if (data?.zones) {
            setZones(data.zones);
          }
          if (data?.facilities) {
            setFacilities(data.facilities);
          }
        });
        // Fetch hardware devices from backend and show on map
        fetch('/api/device')
          .then(r => r.json())
          .then(data => {
            if (data?.devices) {
              const devMap = {};
              for (const d of data.devices) {
                if (d.device_id && d.last_location?.coordinates) {
                  devMap[d.device_id] = {
                    device_id: d.device_id,
                    lat: d.last_location.coordinates[1],
                    lng: d.last_location.coordinates[0],
                    temperature: d.temperature || null,
                    status: d.status || 'online',
                    sos: d.status === 'sos',
                    timestamp: Date.now(),
                  };
                }
              }
              setHardwareDevices(devMap);
            }
          })
          .catch(() => {});
      }
    });

    // Connect WebSocket
    ws.connect();

    // WebSocket event handlers
    const unsubs = [
      ws.onMessage('connection', ({ connected }) => {
        setBackendConnected(connected);
        backendRef.current = connected;
        if (connected) {
          // Sync offline queue when reconnected
          api.flushOfflineQueue().then(result => {
            if (result?.synced > 0) {
              console.log(`📡 Synced ${result.synced} offline events`);
            }
          });
        }
      }),

      ws.onMessage('zone_update', ({ zones: updatedZones }) => {
        if (updatedZones) {
          setZones(updatedZones);
        }
      }),

      // Backend pushes alerts via WebSocket – this is the SINGLE source of alerts when backend is live
      ws.onMessage('alert', ({ alert }) => {
        if (alert) {
          const id = alert.alert_id || Date.now();
          setAlerts(prev => [{ id, msg: alert.msg, severity: alert.severity }, ...prev.slice(0, 4)]);
          setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);

          // Trigger Native OS Notification or Fallback Simulation
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("⚠️ SERA Emergency Alert", {
                body: alert.msg,
                icon: "/vite.svg"
              });
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                  new Notification("⚠️ SERA Emergency Alert", {
                    body: alert.msg,
                    icon: "/vite.svg"
                  });
                } else {
                  triggerSmsFallback(alert.msg);
                }
              });
            } else {
              triggerSmsFallback(alert.msg);
            }
          } else {
            triggerSmsFallback(alert.msg);
          }

          function triggerSmsFallback(msg) {
            // If on a mobile device, this will open the actual SMS app offline
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
              window.location.href = `sms:?body=${encodeURIComponent("⚠️ SERA Emergency: " + msg)}`;
            } else {
              window.alert(`📱 [OFFLINE SMS SIMULATION]\n\n⚠️ SERA Emergency Alert\n${msg}`);
            }
          }
        }
      }),

      ws.onMessage('pipeline_progress', ({ active, step }) => {
        setAiPipeline({ active, step });
      }),

      // Backend pushes timeline events via WebSocket – SINGLE source when backend is live
      ws.onMessage('event', ({ event }) => {
        if (event) {
          setTimeline(prev => [{
            id: event.id || Date.now(),
            type: event.type,
            time: event.time || new Date().toTimeString().slice(0, 8),
            message: event.message,
            zone: event.zone,
            severity: event.severity,
          }, ...prev.slice(0, 19)]);
        }
      }),

      ws.onMessage('route_update', ({ route }) => {
        if (route) {
          console.log('🗺️ Route update:', route.safety_score);
        }
      }),

      ws.onMessage('sos_active', ({ device_id }) => {
        setSosActive(true);
        if (ws.isConnected) setMeshBroadcast(true);
        setTimeout(() => { setSosActive(false); setMeshBroadcast(false); }, 6000);
      }),

      ws.onMessage('DEVICE_UPDATE', ({ device }) => {
        if (device && device.device_id) {
          setHardwareDevices(prev => ({
            ...prev,
            [device.device_id]: device
          }));
        }
      }),

      ws.onMessage('sync_status', (status) => {
        setSyncStatus(status);
      }),
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
      ws.disconnect();
    };
  }, []);

  // ===== ALERT + TIMELINE HELPERS (local-only, used when backend is offline) =====

  const addAlert = useCallback((msg, severity = 'danger') => {
    const id = `${Date.now()}-${++_alertCounter}`;
    setAlerts(prev => [{ id, msg, severity }, ...prev.slice(0, 4)]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  }, []);

  const addTimeline = useCallback((entry) => {
    setTimeline(prev => [{ id: Date.now(), time: new Date().toTimeString().slice(0, 8), ...entry }, ...prev.slice(0, 19)]);
  }, []);

  const runAiPipeline = useCallback(() => {
    setAiPipeline({ active: true, step: 0 });
    [0, 1, 2, 3, 4].forEach(i => {
      setTimeout(() => setAiPipeline({ active: true, step: i }), i * 900);
    });
    setTimeout(() => setAiPipeline({ active: false, step: -1 }), 5000);
  }, []);

  // ===== DEMO ACTIONS (with backend integration) =====
  // When backend is connected: only send API call, backend pushes all updates via WebSocket
  // When backend is disconnected: use local state mutations as fallback

  const simulateCameraHazard = useCallback(async () => {
    setCameraHazard(true);

    if (backendRef.current) {
      // Backend handles everything: event creation, orchestration, zone updates, alerts, timeline
      // All pushed back via WebSocket – no local mutations needed
      await api.ingestEvent({
        type: 'camera_detection',
        source: 'camera',
        location: { type: 'Point', coordinates: [77.6088, 12.9781] },
        confidence: 0.94,
        description: '🔥 Fire detected via camera – Sector 7 escalated to DANGER',
        severity: 'danger',
      });
    } else {
      // Fallback: local demo behavior
      setZones(prev => prev.map(z => z.id === 'zone-b' ? { ...z, status: 'danger' } : z));
      addAlert('🔥 Fire detected via camera – Sector 7 escalated to DANGER', 'danger');
      addTimeline({ type: 'camera', message: 'Fire detected – Sector 7 Market', zone: 'zone-b', severity: 'danger' });
      runAiPipeline();
    }

    setTimeout(() => setCameraHazard(false), 8000);
  }, [addAlert, addTimeline, runAiPipeline]);

  const triggerSOS = useCallback(async () => {
    setSosActive(true);
    setMeshBroadcast(true);

    if (backendRef.current) {
      // Backend handles: SOS event, alerts, orchestration – all via WebSocket
      await api.sendSOS('ESP32_TAG_001', { type: 'Point', coordinates: [73.867642, 18.464140] }, 'SERA-TAG');

      // Trigger the physical buzzer on the ESP32 hardware
      try {
        await fetch('/api/device/buzzer', { method: 'POST' });
      } catch (e) { /* ESP32 may not be connected */ }
    } else {
      addAlert('🆘 SOS Broadcast active – mesh relay engaged', 'danger');
      addTimeline({ type: 'sos', message: 'SOS activated – broadcasting via mesh network', zone: 'zone-b', severity: 'danger' });

      // If offline, queue the event for later sync
      if (isOffline) {
        api.queueOfflineEvent({
          type: 'SOS',
          source: 'device',
          device_id: 'ESP32_TAG_001',
          location: { type: 'Point', coordinates: [73.867642, 18.464140] },
          confidence: 1.0,
          description: 'SOS activated – broadcasting via mesh network',
          severity: 'danger',
        });
      }
    }

    setTimeout(() => { setSosActive(false); setMeshBroadcast(false); }, 6000);
  }, [addAlert, addTimeline, isOffline]);

  const toggleOffline = useCallback(() => {
    setIsOffline(prev => {
      const next = !prev;
      if (backendRef.current && !next) {
        // Going online – flush offline queue
        api.flushOfflineQueue().then(result => {
          if (result?.synced > 0) {
            addAlert(`📡 Synced ${result.synced} offline events`, 'safe');
          }
        });
      }
      // Offline toggle is a client-side action – always add local alert/timeline
      addAlert(next ? '📡 Offline Mode Active – mesh routing enabled' : '🌐 Online Mode Restored', next ? 'warn' : 'safe');
      addTimeline({ type: 'zone', message: next ? 'Offline mode activated – mesh network relay' : 'Online mode restored', severity: next ? 'warn' : 'info' });
      return next;
    });
  }, [addAlert, addTimeline]);

  const triggerPrediction = useCallback(async () => {
    setShowPrediction(true);

    if (backendRef.current) {
      // Backend handles orchestration + pushes updates via WebSocket
      await api.ingestEvent({
        type: 'hazard',
        source: 'satellite',
        location: { type: 'Point', coordinates: [77.6150, 12.9700] },
        confidence: 0.75,
        description: '🔮 AI Prediction: High risk zone expanding – Sector 9',
        severity: 'warn',
      });
    } else {
      addAlert('🔮 AI Prediction: High risk zone expanding – Sector 9', 'warn');
      addTimeline({ type: 'camera', message: 'Prediction zone activated – Sector 9 at risk', zone: 'zone-e', severity: 'warn' });
      runAiPipeline();
    }

    setTimeout(() => setShowPrediction(false), 10000);
  }, [addAlert, addTimeline, runAiPipeline]);

  const blockRoute = useCallback(async () => {
    setRouteBlocked(true);

    if (backendRef.current) {
      // Request a new safe route from backend
      const result = await api.getSafeRoute(
        { lat: 12.9634, lng: 77.6007 }, // Industrial (unsafe)
        { lat: 12.9716, lng: 77.5946 }, // Downtown (safe)
      );
      if (result?.route) {
        // Only add the recalculated route info – no duplicate "blocked" entry
        addAlert('🚧 Route blocked – recalculating safe path', 'warn');
        addTimeline({ type: 'route', message: `Safe route recalculated – safety score: ${result.route.safety_score}`, severity: 'warn' });
      } else {
        addAlert('🚧 Route blocked – recalculating safe path', 'warn');
        addTimeline({ type: 'route', message: 'Primary route blocked – new path computed', severity: 'warn' });
      }
    } else {
      addAlert('🚧 Route blocked – recalculating safe path', 'warn');
      addTimeline({ type: 'route', message: 'Primary route blocked – new path computed', severity: 'warn' });
    }

    setTimeout(() => setRouteBlocked(false), 8000);
  }, [addAlert, addTimeline]);

  const login = useCallback((userData) => {
    setUser(userData);
    setMode(userData.role);
    localStorage.setItem('sera_user', JSON.stringify(userData));
    addAlert(`Welcome back, ${userData.name}`, 'safe');
  }, [addAlert]);

  const logout = useCallback(() => {
    setUser(null);
    setMode('civilian');
    localStorage.removeItem('sera_user');
  }, []);

  const submitFeedback = useCallback((feedback) => {
    setUserRecommendations(prev => [...prev, feedback]);
    addAlert('Feedback submitted successfully', 'safe');
  }, [addAlert]);

  return {
    mode, setMode,
    zones, setZones,
    facilities,
    timeline,
    alerts,
    isOffline, setIsOffline,
    lowPowerMode, setLowPowerMode,
    sosActive,
    selectedZone, setSelectedZone,
    routeBlocked,
    showPrediction,
    aiPipeline,
    cameraHazard,
    meshBroadcast,
    backendConnected,
    syncStatus,
    simulateCameraHazard,
    triggerSOS,
    toggleOffline,
    triggerPrediction,
    blockRoute,
    user,
    login,
    logout,
    userRecommendations,
    submitFeedback,
    trackedPhone, setTrackedPhone,
    hardwareDevices,
  };
}
