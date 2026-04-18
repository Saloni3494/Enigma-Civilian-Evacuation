import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, AlertTriangle, Flame, Maximize2, Minimize2 } from 'lucide-react';

/* Bounding box annotations for AI detections */
const DETECTIONS = [
  { id: 1, label: 'Fire', x: 18, y: 22, w: 28, h: 32, color: '#ef4444', confidence: 0.94 },
  { id: 2, label: 'Smoke', x: 55, y: 12, w: 20, h: 25, color: '#f59e0b', confidence: 0.87 },
  { id: 3, label: 'Hazard', x: 70, y: 55, w: 18, h: 22, color: '#ef4444', confidence: 0.91 },
];

function BoundingBox({ det, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: `${det.x}%`,
            top: `${det.y}%`,
            width: `${det.w}%`,
            height: `${det.h}%`,
            border: `2px solid ${det.color}`,
            borderRadius: 4,
            boxShadow: `0 0 10px ${det.color}60`,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            top: -20,
            left: 0,
            background: det.color,
            color: 'white',
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 3,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
          }}>
            {det.label} {(det.confidence * 100).toFixed(0)}%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CameraFeedPanel({ cameraHazard }) {
  const [expanded, setExpanded] = useState(false);
  const [scanPos, setScanPos] = useState(0);
  const [showDetections, setShowDetections] = useState(false);
  const videoRef = useRef(null);
  const animFrame = useRef(null);
  const scanRef = useRef(0);

  // Animate scan line
  useEffect(() => {
    const animate = () => {
      scanRef.current = (scanRef.current + 0.4) % 100;
      setScanPos(scanRef.current);
      animFrame.current = requestAnimationFrame(animate);
    };
    animFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame.current);
  }, []);

  // Show detections when hazard is triggered
  useEffect(() => {
    if (cameraHazard) {
      setTimeout(() => setShowDetections(true), 800);
      setTimeout(() => setShowDetections(false), 8000);
    }
  }, [cameraHazard]);

  // Try to access webcam
  useEffect(() => {
    if (videoRef.current) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(() => {}); // fallback to canvas
    }
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: 80,
        right: 16,
        width: expanded ? 360 : 240,
        zIndex: 600,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: cameraHazard
          ? '0 0 30px rgba(239,68,68,0.45), 0 8px 32px rgba(0,0,0,0.15)'
          : 'var(--shadow-panel)',
        border: `1px solid ${cameraHazard ? 'rgba(239,68,68,0.5)' : 'var(--clr-border)'}`,
        background: 'rgba(15,24,40,0.92)',
        backdropFilter: 'var(--blur-glass)',
        transition: 'width 0.3s ease, box-shadow 0.4s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }}
        />
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 600, flex: 1, letterSpacing: '0.06em' }}>
          LIVE CAMERA FEED (AI POWERED)
        </span>
        {cameraHazard && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Flame size={11} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: 9, fontWeight: 700 }}>HAZARD</span>
          </motion.div>
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display:'flex' }}
        >
          {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* Video area */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0f172a', overflow: 'hidden' }}>
        {/* Actual webcam or dark bg fallback */}
        <video
          ref={videoRef}
          autoPlay muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
        />

        {/* Simulated camera scene overlay (when no webcam) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(30,40,60,0.8) 0%, rgba(60,20,20,0.6) 100%)',
          mixBlendMode: 'multiply',
        }} />

        {/* Scan line */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: `${scanPos}%`,
          height: 1.5,
          background: 'linear-gradient(90deg, transparent, rgba(59,110,248,0.7), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Grid overlay for realism */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(59,110,248,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,110,248,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          pointerEvents: 'none',
        }} />

        {/* AI Bounding Boxes */}
        {DETECTIONS.map(det => (
          <BoundingBox key={det.id} det={det} visible={showDetections} />
        ))}

        {/* Corner brackets */}
        {['tl','tr','bl','br'].map(corner => (
          <div key={corner} style={{
            position:'absolute',
            ...(corner.includes('t') ? { top:8 } : { bottom:8 }),
            ...(corner.includes('l') ? { left:8 } : { right:8 }),
            width:14, height:14,
            borderTop: corner.includes('t') ? '2px solid rgba(59,110,248,0.7)' : 'none',
            borderBottom: corner.includes('b') ? '2px solid rgba(59,110,248,0.7)' : 'none',
            borderLeft: corner.includes('l') ? '2px solid rgba(59,110,248,0.7)' : 'none',
            borderRight: corner.includes('r') ? '2px solid rgba(59,110,248,0.7)' : 'none',
          }} />
        ))}

        {/* Detection labels */}
        <AnimatePresence>
          {showDetections && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                bottom: 8, left: 8, right: 8,
                display: 'flex', flexDirection: 'column', gap: 3,
              }}
            >
              {['🔥 Fire detected', '💨 Smoke hazard identified'].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.3 }}
                  style={{
                    background: 'rgba(239,68,68,0.85)',
                    color: 'white',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    letterSpacing: '0.05em',
                    width: 'fit-content',
                  }}
                >
                  {t}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'rgba(255,255,255,0.65)',
          background: 'rgba(0,0,0,0.4)',
          padding: '1px 5px',
          borderRadius: 3,
        }}>
          {new Date().toTimeString().slice(0,8)} REC
        </div>
      </div>

      {/* CCTV label row */}
      <div style={{
        padding: '6px 12px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <Video size={10} color="rgba(255,255,255,0.5)" />
          <span style={{ color:'rgba(255,255,255,0.5)', fontSize:9, fontFamily:'var(--font-mono)' }}>
            CCTV-07 · Sector 7
          </span>
        </div>
        <span style={{
          background:'rgba(16,201,124,0.2)',
          color:'#10c97c',
          fontSize:8,
          fontWeight:700,
          padding:'1px 6px',
          borderRadius:3,
          letterSpacing:'0.06em',
        }}>
          ACTIVE
        </span>
      </div>
    </motion.div>
  );
}
