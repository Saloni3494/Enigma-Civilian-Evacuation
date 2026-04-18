import { useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeraStore } from './useSeraStore';
import TopBar from './components/TopBar';
import AlertSystem from './components/AlertSystem';
import AIPipelinePanel from './components/AIPipelinePanel';
import TimelinePanel from './components/TimelinePanel';
import DemoPanel from './components/DemoPanel';
import SOSButton from './components/SOSButton';
import CameraFeedPanel from './components/CameraFeedPanel';

// Lazy-load map to avoid SSR issues
const LiveMap = lazy(() => import('./components/LiveMap'));

// Background gradient that shifts based on threat level
function BackgroundLayer({ zones }) {
  const hasDanger = zones.some(z => z.status === 'danger');
  const hasWarn   = zones.some(z => z.status === 'warn') && !hasDanger;

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

// Civilian mode simplified overlay
function CivilianOverlay({ zones, sosActive, onSOS, isOffline, meshBroadcast }) {
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
        background: 'linear-gradient(to top, rgba(255,255,255,0.95) 60%, transparent)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 20px 20px',
      }}
    >
      {/* Nearest safe zone */}
      <div style={{
        flex: 1,
        background: 'var(--clr-safe-light)',
        border: '1px solid var(--clr-safe-glow)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{ width: 10, height: 10, borderRadius:'50%', background:'var(--clr-safe)', boxShadow:'0 0 10px var(--clr-safe-glow)' }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color:'var(--clr-safe)' }}>NEAREST SAFE ZONE</div>
          <div style={{ fontSize: 12, fontWeight: 600, color:'var(--clr-text-primary)' }}>Sector 4 – Downtown</div>
        </div>
        <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--clr-primary)' }}>0.4 km →</div>
      </div>

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

  return (
    <div style={{ position:'relative', width:'100vw', height:'100vh', overflow:'hidden' }}>
      
      {/* Animated background */}
      <BackgroundLayer zones={store.zones} />

      {/* FULLSCREEN MAP */}
      <Suspense fallback={
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#e8f0ff' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease:'linear' }}
            style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--clr-primary)', borderTopColor:'transparent' }}
          />
        </div>
      }>
        <LiveMap
          zones={store.zones}
          sosActive={store.sosActive}
          routeBlocked={store.routeBlocked}
          showPrediction={store.showPrediction}
          onZoneSelect={store.setSelectedZone}
        />
      </Suspense>

      {/* ===== ALWAYS VISIBLE ===== */}
      <TopBar
        mode={store.mode}
        setMode={store.setMode}
        zones={store.zones}
        isOffline={store.isOffline}
      />

      <AlertSystem alerts={store.alerts} />

      {/* Camera feed panel (top-right) */}
      <CameraFeedPanel cameraHazard={store.cameraHazard} />

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
          <CivilianOverlay
            zones={store.zones}
            sosActive={store.sosActive}
            onSOS={store.triggerSOS}
            isOffline={store.isOffline}
            meshBroadcast={store.meshBroadcast}
          />
        )}
      </AnimatePresence>

      {/* Offline mode mesh network (shows to bottom-right of SOS in admin too) */}
      <AnimatePresence>
        {store.isOffline && store.mode === 'civilian' && (
          <motion.div
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }}
            style={{
              position:'absolute',
              top:80,
              right:16,
              zIndex:650,
              background:'var(--grad-panel)',
              backdropFilter:'var(--blur-glass)',
              border:'1px solid rgba(245,158,11,0.3)',
              borderRadius:'var(--radius-lg)',
              padding:'8px 14px',
              boxShadow:'0 0 20px rgba(245,158,11,0.15)',
            }}
          >
            <div style={{ fontSize:10, fontWeight:700, color:'var(--clr-warn)', letterSpacing:'0.06em' }}>
              📡 Offline Mesh Active
            </div>
            <div style={{ fontSize:9, color:'var(--clr-text-muted)', marginTop:2 }}>
              5 mesh nodes • relay enabled
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark */}
      <div style={{
        position:'absolute',
        bottom:8,
        right: store.mode === 'admin' ? 308 : 16,
        zIndex:500,
        pointerEvents:'none',
        fontSize:8,
        fontFamily:'var(--font-mono)',
        color:'rgba(148,163,184,0.6)',
        letterSpacing:'0.08em',
      }}>
        SERA v1.0 · BREAKING ENIGMA 2026
      </div>
    </div>
  );
}
