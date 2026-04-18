// useSeraStore.js – Central state for SERA Dashboard
import { useState, useCallback } from 'react';

export const ZONES = [
  { id: 'zone-a', name: 'Sector 4 – Downtown', lat: 12.9716, lng: 77.5946, status: 'safe', population: 4200 },
  { id: 'zone-b', name: 'Sector 7 – Market', lat: 12.9781, lng: 77.6088, status: 'warn', population: 2800 },
  { id: 'zone-c', name: 'Sector 12 – Industrial', lat: 12.9634, lng: 77.6007, status: 'danger', population: 1500 },
  { id: 'zone-d', name: 'Sector 2 – Residential', lat: 12.9850, lng: 77.5900, status: 'safe', population: 6100 },
  { id: 'zone-e', name: 'Sector 9 – Convention', lat: 12.9700, lng: 77.6150, status: 'safe', population: 3300 },
];

export const MESH_DEVICES = [
  { id: 'dev-1', lat: 12.9716, lng: 77.5946, label: 'Node-A1', online: true },
  { id: 'dev-2', lat: 12.9781, lng: 77.6088, label: 'Node-B2', online: true },
  { id: 'dev-3', lat: 12.9634, lng: 77.6007, label: 'Node-C3', online: false },
  { id: 'dev-4', lat: 12.9850, lng: 77.5900, label: 'Node-D4', online: true },
  { id: 'dev-5', lat: 12.9700, lng: 77.6150, label: 'Node-E5', online: true },
];

const INITIAL_TIMELINE = [
  { id: 1, type: 'camera', time: '19:02:11', message: 'Fire detected – Sector 12 Industrial', zone: 'zone-c', severity: 'danger' },
  { id: 2, type: 'zone',   time: '19:01:34', message: 'Zone updated: Sector 7 → Warning', zone: 'zone-b', severity: 'warn' },
  { id: 3, type: 'sos',    time: '18:59:02', message: 'SOS triggered – Sector 7, Device Node-B2', zone: 'zone-b', severity: 'warn' },
  { id: 4, type: 'route',  time: '18:57:45', message: 'Safe route calculated – Sector 12 → 4', zone: 'zone-c', severity: 'info' },
  { id: 5, type: 'camera', time: '18:55:20', message: 'Hazard identified – structural damage', zone: 'zone-c', severity: 'danger' },
];

export function useSeraStore() {
  const [mode, setMode] = useState('admin'); // 'civilian' | 'admin'
  const [zones, setZones] = useState(ZONES);
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

  const addAlert = useCallback((msg, severity = 'danger') => {
    const id = Date.now();
    setAlerts(prev => [{ id, msg, severity }, ...prev.slice(0, 4)]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  }, []);

  const addTimeline = useCallback((entry) => {
    setTimeline(prev => [{ id: Date.now(), time: new Date().toTimeString().slice(0,8), ...entry }, ...prev.slice(0, 19)]);
  }, []);

  const runAiPipeline = useCallback(() => {
    setAiPipeline({ active: true, step: 0 });
    [0,1,2,3,4].forEach(i => {
      setTimeout(() => setAiPipeline({ active: true, step: i }), i * 900);
    });
    setTimeout(() => setAiPipeline({ active: false, step: -1 }), 5000);
  }, []);

  // DEMO ACTIONS
  const simulateCameraHazard = useCallback(() => {
    setCameraHazard(true);
    setZones(prev => prev.map(z => z.id === 'zone-b' ? { ...z, status: 'danger' } : z));
    addAlert('🔥 Fire detected via camera – Sector 7 escalated to DANGER', 'danger');
    addTimeline({ type: 'camera', message: 'Fire detected – Sector 7 Market', zone: 'zone-b', severity: 'danger' });
    runAiPipeline();
    setTimeout(() => setCameraHazard(false), 8000);
  }, [addAlert, addTimeline, runAiPipeline]);

  const triggerSOS = useCallback(() => {
    setSosActive(true);
    setMeshBroadcast(true);
    addAlert('🆘 SOS Broadcast active – mesh relay engaged', 'danger');
    addTimeline({ type: 'sos', message: 'SOS activated – broadcasting via mesh network', zone: 'zone-b', severity: 'danger' });
    setTimeout(() => { setSosActive(false); setMeshBroadcast(false); }, 6000);
  }, [addAlert, addTimeline]);

  const toggleOffline = useCallback(() => {
    setIsOffline(prev => {
      const next = !prev;
      addAlert(next ? '📡 Offline Mode Active – mesh routing enabled' : '🌐 Online Mode Restored', next ? 'warn' : 'safe');
      addTimeline({ type: 'zone', message: next ? 'Offline mode activated – mesh network relay' : 'Online mode restored', severity: next ? 'warn' : 'info' });
      return next;
    });
  }, [addAlert, addTimeline]);

  const triggerPrediction = useCallback(() => {
    setShowPrediction(true);
    addAlert('🔮 AI Prediction: High risk zone expanding – Sector 9', 'warn');
    addTimeline({ type: 'camera', message: 'Prediction zone activated – Sector 9 at risk', zone: 'zone-e', severity: 'warn' });
    runAiPipeline();
    setTimeout(() => setShowPrediction(false), 10000);
  }, [addAlert, addTimeline, runAiPipeline]);

  const blockRoute = useCallback(() => {
    setRouteBlocked(true);
    addAlert('🚧 Route blocked – recalculating safe path', 'warn');
    addTimeline({ type: 'route', message: 'Primary route blocked – new path computed', severity: 'warn' });
    setTimeout(() => setRouteBlocked(false), 8000);
  }, [addAlert, addTimeline]);

  return {
    mode, setMode,
    zones, setZones,
    timeline,
    alerts,
    isOffline,
    sosActive,
    selectedZone, setSelectedZone,
    routeBlocked,
    showPrediction,
    aiPipeline,
    cameraHazard,
    meshBroadcast,
    simulateCameraHazard,
    triggerSOS,
    toggleOffline,
    triggerPrediction,
    blockRoute,
  };
}
