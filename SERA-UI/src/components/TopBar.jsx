import { motion, AnimatePresence } from 'framer-motion';
import { Shield, MapPin, Users, AlertCircle, WifiOff, Wifi, User, Settings, Activity } from 'lucide-react';

const ZONE_STATUS_LABEL = {
  safe:   { label: 'SAFE',   color: 'var(--clr-safe)',   bg: 'var(--clr-safe-light)' },
  warn:   { label: 'WARN',   color: 'var(--clr-warn)',   bg: 'var(--clr-warn-light)' },
  danger: { label: 'DANGER', color: 'var(--clr-danger)', bg: 'var(--clr-danger-light)' },
};

function ZoneBadge({ zone }) {
  const s = ZONE_STATUS_LABEL[zone.status];
  return (
    <motion.div
      layout
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        borderRadius: 'var(--radius-sm)',
        background: s.bg,
        borderLeft: `3px solid ${s.color}`,
        marginBottom: 4,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
        style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }}
      />
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--clr-text-primary)', flex: 1, lineHeight: 1.2 }}>
        {zone.name}
      </span>
      <span style={{
        fontSize: 8, fontWeight: 800, color: s.color,
        letterSpacing: '0.08em',
      }}>
        {s.label}
      </span>
    </motion.div>
  );
}

export default function TopBar({ mode, setMode, zones, isOffline }) {
  const dangerCount = zones.filter(z => z.status === 'danger').length;
  const warnCount   = zones.filter(z => z.status === 'warn').length;
  const safeCount   = zones.filter(z => z.status === 'safe').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'absolute',
        top: 12,
        left: 16,
        right: 16,
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Logo / Branding */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--grad-panel)',
          backdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 16px',
          boxShadow: 'var(--shadow-panel)',
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b6ef8, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(59,110,248,0.45)',
          }}
        >
          <Shield size={16} color="white" />
        </motion.div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--clr-text-primary)', letterSpacing: '0.05em', lineHeight: 1 }}>
            SERA
          </div>
          <div style={{ fontSize: 8, color: 'var(--clr-text-muted)', letterSpacing: '0.08em', marginTop: 1 }}>
            SAFETY ZONE MONITOR
          </div>
        </div>
      </motion.div>

      {/* Zone Status Summary */}
      <div style={{
        background: 'var(--grad-panel)',
        backdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--clr-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '8px 14px',
        boxShadow: 'var(--shadow-panel)',
        display: 'flex', gap: 16, alignItems: 'center',
      }}>
        {[
          { label: 'SAFE',   count: safeCount,   color: 'var(--clr-safe)' },
          { label: 'WARN',   count: warnCount,   color: 'var(--clr-warn)' },
          { label: 'DANGER', count: dangerCount, color: 'var(--clr-danger)' },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius:'50%', background: s.color }}
            />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.count}
              </div>
              <div style={{ fontSize: 7, color: 'var(--clr-text-muted)', fontWeight: 700, letterSpacing:'0.08em' }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}

        <div style={{ width: 1, height: 28, background: 'var(--clr-border)' }} />

        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <Users size={12} color="var(--clr-text-secondary)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--clr-text-primary)', lineHeight:1 }}>
              17.9K
            </div>
            <div style={{ fontSize: 7, color: 'var(--clr-text-muted)', fontWeight: 700, letterSpacing:'0.06em' }}>
              MONITORED
            </div>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(180,120,0,0.06))',
              border: '1px solid rgba(245,158,11,0.40)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 14px',
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 0 20px rgba(245,158,11,0.20)',
            }}
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <WifiOff size={12} color="var(--clr-warn)" />
            </motion.div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--clr-warn)', letterSpacing: '0.07em' }}>
              OFFLINE MODE ACTIVE
            </span>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: 9, color: 'rgba(245,158,11,0.7)', fontFamily: 'var(--font-mono)' }}
            >
              MESH RELAY ON
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live indicator */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {/* Clock */}
        <div style={{
          background: 'var(--grad-panel)',
          backdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 14px',
          boxShadow: 'var(--shadow-panel)',
          display:'flex', flexDirection:'column', alignItems:'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily:'var(--font-mono)', color:'var(--clr-text-primary)', lineHeight:1 }}>
            {new Date().toTimeString().slice(0, 5)}
          </div>
          <div style={{ fontSize: 7, color:'var(--clr-text-muted)', fontWeight:700, letterSpacing:'0.08em', marginTop:1 }}>
            LOCAL TIME
          </div>
        </div>

        {/* Mode switcher */}
        <div style={{
          background: 'var(--grad-panel)',
          backdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '6px',
          boxShadow: 'var(--shadow-panel)',
          display:'flex', gap:4,
        }}>
          {[
            { id:'civilian', icon: User, label:'Civilian' },
            { id:'admin',    icon: Settings, label:'Admin' },
          ].map(m => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <motion.button
                key={m.id}
                onClick={() => setMode(m.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'5px 10px',
                  borderRadius:'var(--radius-sm)',
                  background: active ? 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))' : 'transparent',
                  border:'none', cursor:'pointer',
                  color: active ? 'white' : 'var(--clr-text-muted)',
                  fontFamily:'var(--font-sans)',
                  fontWeight: 600, fontSize:10,
                  transition:'all 0.2s ease',
                  boxShadow: active ? '0 0 14px rgba(59,110,248,0.35)' : 'none',
                  letterSpacing:'0.04em',
                }}
              >
                <Icon size={11} />
                {m.label}
              </motion.button>
            );
          })}
        </div>

        {/* Live dot */}
        <div style={{
          background: 'var(--grad-panel)',
          backdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 12px',
          boxShadow: 'var(--shadow-panel)',
          display:'flex', alignItems:'center', gap:7,
        }}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity:[1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width:8, height:8, borderRadius:'50%', background:'#10c97c', boxShadow:'0 0 10px rgba(16,201,124,0.6)' }}
          />
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:'var(--clr-safe)', letterSpacing:'0.08em' }}>LIVE</div>
            <div style={{ fontSize:7, color:'var(--clr-text-muted)', letterSpacing:'0.06em' }}>REAL-TIME</div>
          </div>
          <Activity size={12} color="var(--clr-safe)" />
        </div>
      </div>
    </motion.div>
  );
}
