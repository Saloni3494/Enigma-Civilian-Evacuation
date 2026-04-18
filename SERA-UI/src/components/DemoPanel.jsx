import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Radio, WifiOff, Brain, GitBranch, Zap } from 'lucide-react';

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
      </div>
    </motion.div>
  );
}
