import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, AlertOctagon, Info } from 'lucide-react';

const SEVERITY_CONFIG = {
  danger: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.08))',
    border: 'rgba(239,68,68,0.40)',
    icon: AlertOctagon,
    iconColor: '#ef4444',
    textColor: '#991b1b',
    shake: true,
  },
  warn: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(180,120,0,0.08))',
    border: 'rgba(245,158,11,0.40)',
    icon: AlertTriangle,
    iconColor: '#f59e0b',
    textColor: '#92400e',
    shake: false,
  },
  safe: {
    bg: 'linear-gradient(135deg, rgba(16,201,124,0.12), rgba(5,150,105,0.06))',
    border: 'rgba(16,201,124,0.35)',
    icon: Info,
    iconColor: '#10c97c',
    textColor: '#065f46',
    shake: false,
  },
};

function AlertItem({ alert }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warn;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.93 }}
      animate={cfg.shake
        ? { opacity: 1, x: [80, -6, 6, -4, 4, 0], scale: 1 }
        : { opacity: 1, x: 0, scale: 1 }
      }
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.22 } }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        backdropFilter: 'var(--blur-glass)',
        boxShadow: `0 4px 20px ${cfg.border.replace('0.40', '0.15')}`,
        marginBottom: 6,
        maxWidth: 320,
      }}
    >
      <motion.div
        animate={cfg.shake ? { rotate: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <Icon size={16} color={cfg.iconColor} />
      </motion.div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12,
          fontWeight: 600,
          color: cfg.textColor,
          lineHeight: 1.4,
          margin: 0,
        }}>
          {alert.msg}
        </p>
      </div>

      {/* Urgency bar that shrinks over 5 seconds */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0, left: 0,
          height: 2,
          borderRadius: '0 0 0 var(--radius-md)',
          background: cfg.iconColor,
          transformOrigin: 'left',
        }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  );
}

export default function AlertSystem({ alerts }) {
  return (
    <div style={{
      position: 'absolute',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 800,
      width: 350,
      maxWidth: '90vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="popLayout">
        {alerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </AnimatePresence>
    </div>
  );
}
