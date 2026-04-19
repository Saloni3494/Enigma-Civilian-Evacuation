import { useEffect, Suspense, lazy } from 'react';
import { initOfflineMap } from './services/offlineMap';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeraStore } from './useSeraStore';
import TopBar from './components/TopBar';
import AlertSystem from './components/AlertSystem';
import AIPipelinePanel from './components/AIPipelinePanel';
import TimelinePanel from './components/TimelinePanel';
import DemoPanel from './components/DemoPanel';
import SOSButton from './components/SOSButton';
import AuthScreen from './components/AuthScreen';
import VoiceAssistant from './components/VoiceAssistant';
import { Battery, BatteryCharging, Info, Navigation } from 'lucide-react';
import './index.css';

// Lazy-load map to avoid SSR issues
const LiveMap = lazy(() => import('./components/LiveMap'));

// Background gradient that shifts based on threat level
function BackgroundLayer({ zones }) {
  const hasDanger = zones.some(z => z.status === 'danger');
  const hasWarn = zones.some(z => z.status === 'warn') && !hasDanger;

  return (
    <motion.div
      animate={{
        background: hasDanger
          ? 'linear-gradient(135deg, #f0e8e8 0%, #f5ece0 50%, #e8f0ff 100%)'
          : hasWarn
            ? 'linear-gradient(135deg, #f5f0e0 0%, #f0f0ff 50%, #e8fff0 100%)'
            : 'linear-gradient(135deg, #e8f0ff 0%, #f0e8ff 50%, #e8fff4 100%)',
      }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
      style={{ position: 'absolute', inset: 0, zIndex: -1 }}
    />
  );
}

// Emergency Info Panel for civilians
function EmergencyInfoPanel({ zones }) {
  const dangerZones = zones.filter(z => z.status === 'danger');
  const warnZones = zones.filter(z => z.status === 'warn');

  if (dangerZones.length === 0 && warnZones.length === 0) return null;

  const instructions = [];
  if (dangerZones.length > 0) {
    instructions.push({ icon: '🚨', text: `Avoid ${dangerZones.map(z => z.name.split('–')[0].trim()).join(', ')}`, severity: 'danger' });
    instructions.push({ icon: '🏃', text: 'Move away from danger zones immediately', severity: 'danger' });
  }
  if (warnZones.length > 0) {
    instructions.push({ icon: '⚠️', text: `Exercise caution near ${warnZones.map(z => z.name.split('–')[0].trim()).join(', ')}`, severity: 'warn' });
  }
  instructions.push({ icon: '📍', text: 'Head to nearest shelter or hospital', severity: 'info' });
  instructions.push({ icon: '⬆️', text: 'If flooding: move to higher ground', severity: 'info' });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', bottom: 140, left: 16, zIndex: 650,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14,
        padding: '10px 14px', maxWidth: 260,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Info size={14} color="#ef4444" />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.06em' }}>EMERGENCY INSTRUCTIONS</span>
      </div>
      {instructions.map((ins, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>{ins.icon}</span>
          <span style={{ fontSize: 10, color: '#334155', lineHeight: 1.4, fontWeight: 500 }}>{ins.text}</span>
        </div>
      ))}
    </motion.div>
  );
}

// One-Tap Evacuation Button
function QuickEvacButton({ onTap }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={onTap}
      style={{
        position: 'absolute', bottom: 220, right: 16, zIndex: 650,
        background: 'linear-gradient(135deg, #3b6ef8, #7c3aed)',
        color: 'white', border: 'none', borderRadius: 16,
        padding: '10px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12,
        boxShadow: '0 4px 16px rgba(59,110,248,0.35)',
        letterSpacing: '0.03em',
      }}
    >
      <Navigation size={16} />
      Quick Evacuate
    </motion.button>
  );
}

// Civilian mode simplified overlay
function CivilianOverlay({ zones, sosActive, onSOS, isOffline, meshBroadcast, lowPowerMode, onTogglePower }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        zIndex: 600,
        height: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 20px 20px',
        pointerEvents: 'none',
      }}
    >
      {/* Low Power Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onTogglePower}
        style={{
          position: 'absolute', bottom: 20, left: 20,
          width: 44, height: 44, borderRadius: '50%',
          background: lowPowerMode ? 'rgba(16, 201, 124, 0.15)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: lowPowerMode ? '1px solid rgba(16, 201, 124, 0.5)' : '1px solid rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: lowPowerMode ? '#10c97c' : '#64748b',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          pointerEvents: 'auto',
        }}
        title={lowPowerMode ? 'Low Power Mode ON' : 'Toggle Low Power Mode'}
      >
        {lowPowerMode ? <Battery size={20} /> : <BatteryCharging size={20} />}
      </motion.button>

      <SOSButton
        onSOS={onSOS}
        sosActive={sosActive}
        meshBroadcast={meshBroadcast}
        isOffline={isOffline}
      />
    </motion.div>
  );
}

export default function App() {
  const store = useSeraStore();

  // Register tile-caching service worker for offline map support
  useEffect(() => {
    initOfflineMap();
  }, []);

  // Auth gate
  if (!store.user) {
    return <AuthScreen onLogin={store.login} />;
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Animated background (disabled in low power mode) */}
      {!store.lowPowerMode && <BackgroundLayer zones={store.zones} />}

      {/* FULLSCREEN MAP */}
      <Suspense fallback={
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8f0ff' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--clr-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      }>
        <LiveMap
          zones={store.zones}
          facilities={store.facilities}
          sosActive={store.sosActive}
          routeBlocked={store.routeBlocked}
          showPrediction={store.showPrediction}
          onZoneSelect={store.setSelectedZone}
          onSubmitFeedback={store.submitFeedback}
          userRecommendations={store.userRecommendations}
          trackedPhone={store.trackedPhone}
          hardwareDevices={store.hardwareDevices}
        />
      </Suspense>

      {/* ===== ALWAYS VISIBLE ===== */}
      <TopBar
        user={store.user}
        logout={store.logout}
        mode={store.mode}
        setMode={store.setMode}
        zones={store.zones}
        isOffline={store.isOffline}
        backendConnected={store.backendConnected}
        trackedPhone={store.trackedPhone}
        setTrackedPhone={store.setTrackedPhone}
      />

      <AlertSystem alerts={store.alerts} />
      <VoiceAssistant store={store} />



      {/* ===== ADMIN MODE PANELS ===== */}
      <AnimatePresence>
        {store.mode === 'admin' && (
          <>
            {/* AI Pipeline – bottom left above demo */}
            <AIPipelinePanel aiPipeline={store.aiPipeline} />

            {/* Timeline – bottom right */}
            <TimelinePanel
              timeline={store.timeline}
              onZoneSelect={store.setSelectedZone}
            />

            {/* Demo panel – bottom left */}
            <DemoPanel
              onHazard={store.simulateCameraHazard}
              onSOS={store.triggerSOS}
              onOffline={store.toggleOffline}
              onPrediction={store.triggerPrediction}
              onRoute={store.blockRoute}
              isOffline={store.isOffline}
            />

            {/* Admin SOS button (standalone, centre-bottom) */}
            <SOSButton
              onSOS={store.triggerSOS}
              sosActive={store.sosActive}
              meshBroadcast={store.meshBroadcast}
              isOffline={store.isOffline}
            />
          </>
        )}
      </AnimatePresence>

      {/* ===== CIVILIAN MODE ===== */}
      <AnimatePresence>
        {store.mode === 'civilian' && (
          <>
            <CivilianOverlay
              zones={store.zones}
              sosActive={store.sosActive}
              onSOS={store.triggerSOS}
              isOffline={store.isOffline}
              meshBroadcast={store.meshBroadcast}
              lowPowerMode={store.lowPowerMode}
              onTogglePower={() => store.setLowPowerMode(!store.lowPowerMode)}
            />

            {/* Emergency Info Panel */}
            <EmergencyInfoPanel zones={store.zones} />

            {/* Quick Evacuate Button */}
            <QuickEvacButton onTap={() => {
              // Auto-search nearest safe zone
              const safeZone = store.zones.find(z => z.status === 'safe');
              if (safeZone) {
                // Trigger alert to navigate
                store.submitFeedback && store.submitFeedback({
                  type: 'evacuation',
                  destination: safeZone.name,
                  timestamp: new Date().toISOString(),
                });
              }
            }} />
          </>
        )}
      </AnimatePresence>

      {/* Offline mode mesh network (shows to bottom-right of SOS in admin too) */}
      <AnimatePresence>
        {store.isOffline && store.mode === 'civilian' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 80, right: 16, zIndex: 650,
              background: 'var(--grad-panel)',
              backdropFilter: 'var(--blur-glass)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '8px 14px',
              boxShadow: '0 0 20px rgba(245,158,11,0.15)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--clr-warn)', letterSpacing: '0.06em' }}>
              📡 Offline Mesh Active
            </div>
            <div style={{ fontSize: 9, color: 'var(--clr-text-muted)', marginTop: 2 }}>
              5 mesh nodes • relay enabled
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: store.mode === 'admin' ? 308 : 16,
        zIndex: 500,
        pointerEvents: 'none',
        fontSize: 8,
        fontFamily: 'var(--font-mono)',
        color: 'rgba(148,163,184,0.6)',
        letterSpacing: '0.08em',
      }}>
        SERA v1.0 · BREAKING ENIGMA 2026
      </div>
    </div>
  );
}
