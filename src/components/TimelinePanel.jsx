import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Camera, MapPin, Navigation, AlertTriangle, Radio } from 'lucide-react';

const SEVERITY_STYLES = {
  danger: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', dot: '#ef4444', text: '#b91c1c' },
  warn:   { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', text: '#92400e' },
  info:   { bg: 'rgba(59,110,248,0.08)',  border: 'rgba(59,110,248,0.18)', dot: '#3b6ef8', text: '#1e40af' },
};

const TYPE_ICONS = {
  camera: Camera,
  sos:    Radio,
  zone:   MapPin,
  route:  Navigation,
};

function TimelineEntry({ entry, onSelect, index }) {
  const style = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.info;
  const Icon = TYPE_ICONS[entry.type] || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onClick={() => onSelect && onSelect(entry.zone)}
      style={{
        display: 'flex', gap: 9, alignItems: 'flex-start',
        padding: '8px 12px',
        cursor: entry.zone ? 'pointer' : 'default',
        background: style.bg,
        borderLeft: `2.5px solid ${style.dot}`,
        marginBottom: 4,
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        transition: 'opacity 0.2s',
      }}
      whileHover={entry.zone ? { opacity: 0.82, x: 2 } : {}}
    >
      {/* Icon */}
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: `${style.dot}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        <Icon size={11} color={style.dot} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--clr-text-primary)',
          lineHeight: 1.35,
          wordBreak: 'break-word',
        }}>
          {entry.message}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 3,
        }}>
          <Clock size={8} color="var(--clr-text-muted)" />
          <span style={{ fontSize: 9, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {entry.time}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, color: style.dot,
            background: `${style.dot}18`, padding: '0 4px',
            borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {entry.type}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function TimelinePanel({ timeline, onZoneSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 280,
        maxHeight: 360,
        zIndex: 600,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--grad-panel)',
        backdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--clr-border)',
        boxShadow: 'var(--shadow-panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px 9px',
        borderBottom: '1px solid var(--clr-border)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'linear-gradient(135deg, rgba(15,23,42,0.04), rgba(59,110,248,0.04))',
        flexShrink: 0,
      }}>
        <Clock size={13} color="var(--clr-primary)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-primary)', letterSpacing: '0.05em', flex:1 }}>
          BLACK BOX TIMELINE
        </span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#10c97c' }}
        />
      </div>

      {/* Entries - scrollable */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0 6px' }}>
        <AnimatePresence initial={false}>
          {timeline.map((entry, i) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              onSelect={onZoneSelect}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
