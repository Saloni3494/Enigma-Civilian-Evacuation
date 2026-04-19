import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Radio, WifiOff, Brain, GitBranch, Zap, Download, CheckCircle } from 'lucide-react';
import { precacheDemoArea, onSwMessage } from '../services/offlineMap';

const DEMO_ACTIONS = [
  {
    id: 'hazard',
    label: 'Simulate Camera Hazard',
    icon: Camera,
    color: '#ef4444',
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.06))',
    border: 'rgba(239,68,68,0.30)',
    glow: 'rgba(239,68,68,0.25)',
  },
  {
    id: 'sos',
    label: 'Send SOS',
    icon: Radio,
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(180,120,0,0.06))',
    border: 'rgba(245,158,11,0.30)',
    glow: 'rgba(245,158,11,0.22)',
  },
  {
    id: 'offline',
    label: 'Toggle Offline Mode',
    icon: WifiOff,
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(109,40,217,0.06))',
    border: 'rgba(124,58,237,0.30)',
    glow: 'rgba(124,58,237,0.22)',
  },
  {
    id: 'prediction',
    label: 'Trigger Prediction',
    icon: Brain,
    color: '#3b6ef8',
    bg: 'linear-gradient(135deg, rgba(59,110,248,0.14), rgba(37,99,235,0.06))',
    border: 'rgba(59,110,248,0.30)',
    glow: 'rgba(59,110,248,0.22)',
  },
  {
    id: 'route',
    label: 'Block Route',
    icon: GitBranch,
    color: '#10c97c',
    bg: 'linear-gradient(135deg, rgba(16,201,124,0.14), rgba(5,150,105,0.06))',
    border: 'rgba(16,201,124,0.30)',
    glow: 'rgba(16,201,124,0.22)',
  },
];

function DemoButton({ action, onClick }) {
  const Icon = action.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.04, boxShadow: `0 0 20px ${action.glow}` }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: action.bg,
        border: `1px solid ${action.border}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{
        width: 26, height: 26,
        borderRadius: 'var(--radius-sm)',
        background: `${action.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={13} color={action.color} />
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--clr-text-primary)',
        letterSpacing: '0.01em',
        lineHeight: 1.3,
      }}>
        {action.label}
      </span>
      <motion.div
        style={{ marginLeft: 'auto', opacity: 0.5 }}
        whileHover={{ opacity: 1, x: 2 }}
      >
        <Zap size={10} color={action.color} />
      </motion.div>
    </motion.button>
  );
}

export default function DemoPanel({ onHazard, onSOS, onOffline, onPrediction, onRoute, isOffline }) {
  const [dlState, setDlState] = useState('idle'); // idle | downloading | done
  const [dlProgress, setDlProgress] = useState({ downloaded: 0, total: 0 });

  useEffect(() => {
    const unsub = onSwMessage((msg) => {
      if (msg.type === 'PRECACHE_PROGRESS') {
        setDlProgress({ downloaded: msg.downloaded, total: msg.total });
      }
      if (msg.type === 'PRECACHE_COMPLETE') {
        setDlState('done');
        setDlProgress({ downloaded: msg.downloaded, total: msg.total });
        setTimeout(() => setDlState('idle'), 4000);
      }
    });
    return unsub;
  }, []);

  const handleDownloadMap = useCallback(() => {
    if (dlState === 'downloading') return;
    setDlState('downloading');
    setDlProgress({ downloaded: 0, total: 0 });
    const count = precacheDemoArea();
    setDlProgress(prev => ({ ...prev, total: count }));
  }, [dlState]);

  const handlers = {
    hazard: onHazard,
    sos: onSOS,
    offline: onOffline,
    prediction: onPrediction,
    route: onRoute,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 220,
        zIndex: 600,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--grad-panel)',
        backdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--clr-border)',
        boxShadow: 'var(--shadow-panel)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px 9px',
        borderBottom: '1px solid var(--clr-border)',
        background: 'linear-gradient(135deg, rgba(59,110,248,0.06), rgba(124,58,237,0.04))',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Zap size={13} color="var(--clr-primary)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-primary)', letterSpacing: '0.05em' }}>
          DEMO CONTROL
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 8,
          fontWeight: 700,
          color: 'var(--clr-primary)',
          background: 'var(--clr-primary-light)',
          padding: '1px 5px',
          borderRadius: 'var(--radius-pill)',
          letterSpacing: '0.08em',
        }}>
          LIVE
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DEMO_ACTIONS.map(action => (
          <DemoButton
            key={action.id}
            action={action.id === 'offline'
              ? { ...action, label: isOffline ? 'Go Online' : 'Toggle Offline Mode' }
              : action
            }
            onClick={handlers[action.id]}
          />
        ))}

        {/* Download Map for Offline */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownloadMap}
          disabled={dlState === 'downloading'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: dlState === 'done'
              ? 'linear-gradient(135deg, rgba(16,201,124,0.14), rgba(5,150,105,0.06))'
              : 'linear-gradient(135deg, rgba(6,182,212,0.14), rgba(8,145,178,0.06))',
            border: dlState === 'done'
              ? '1px solid rgba(16,201,124,0.30)'
              : '1px solid rgba(6,182,212,0.30)',
            borderRadius: 'var(--radius-md)',
            cursor: dlState === 'downloading' ? 'wait' : 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            opacity: dlState === 'downloading' ? 0.8 : 1,
          }}
        >
          <div style={{
            width: 26, height: 26,
            borderRadius: 'var(--radius-sm)',
            background: dlState === 'done' ? 'rgba(16,201,124,0.12)' : 'rgba(6,182,212,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {dlState === 'done'
              ? <CheckCircle size={13} color="#10c97c" />
              : <Download size={13} color="#06b6d4" />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--clr-text-primary)',
              letterSpacing: '0.01em',
              display: 'block',
            }}>
              {dlState === 'idle' && 'Download Map Offline'}
              {dlState === 'downloading' && `Caching tiles...`}
              {dlState === 'done' && 'Map cached ✓'}
            </span>
            {dlState === 'downloading' && dlProgress.total > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{
                  height: 3,
                  borderRadius: 2,
                  background: 'rgba(6,182,212,0.15)',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(dlProgress.downloaded / dlProgress.total) * 100}%` }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ fontSize: 9, color: '#64748b', marginTop: 2, display: 'block' }}>
                  {dlProgress.downloaded}/{dlProgress.total} tiles
                </span>
              </div>
            )}
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}
