import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Wifi, WifiOff } from 'lucide-react';

const MESH_NODES = [
  { id: 1, x: 25,  y: 35, label: 'A1', online: true },
  { id: 2, x: 60,  y: 25, label: 'B2', online: true },
  { id: 3, x: 75,  y: 65, label: 'C3', online: false },
  { id: 4, x: 40,  y: 72, label: 'D4', online: true },
  { id: 5, x: 15,  y: 60, label: 'E5', online: true },
];

const MESH_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [1, 3],
];

function DataPacket({ x1, y1, x2, y2, delay }) {
  return (
    <motion.circle
      r={3}
      fill="#3b6ef8"
      initial={{ cx: x1 + '%', cy: y1 + '%', opacity: 0 }}
      animate={{
        cx: [x1 + '%', x2 + '%'],
        cy: [y1 + '%', y2 + '%'],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1.8,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export default function SOSButton({ onSOS, sosActive, meshBroadcast, isOffline }) {
  const [pressing, setPressing] = useState(false);

  return (
    <>
      {/* Mesh network overlay when offline */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: 100,
              right: 16,
              width: 200,
              height: 150,
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
              padding: '7px 12px',
              borderBottom: '1px solid var(--clr-border)',
              display:'flex', gap:6, alignItems:'center',
              background:'rgba(245,158,11,0.07)',
            }}>
              <Wifi size={11} color="#f59e0b" />
              <span style={{ fontSize:10, fontWeight:700, color:'var(--clr-warn)', letterSpacing:'0.05em' }}>
                MESH NETWORK
              </span>
            </div>

            {/* SVG mesh */}
            <svg
              viewBox="0 0 100 100"
              style={{ width:'100%', height:'calc(100% - 34px)', padding:8 }}
            >
              {/* Links */}
              {MESH_LINKS.map(([a, b], i) => {
                const na = MESH_NODES[a], nb = MESH_NODES[b];
                const bothOnline = na.online && nb.online;
                return (
                  <line
                    key={i}
                    x1={na.x + '%'} y1={na.y + '%'}
                    x2={nb.x + '%'} y2={nb.y + '%'}
                    stroke={bothOnline ? 'rgba(59,110,248,0.35)' : 'rgba(148,163,184,0.2)'}
                    strokeWidth={bothOnline ? 1 : 0.5}
                    strokeDasharray={bothOnline ? '0' : '3 2'}
                  />
                );
              })}

              {/* Data packets */}
              {meshBroadcast && MESH_LINKS.slice(0, 4).map(([a, b], i) => {
                const na = MESH_NODES[a], nb = MESH_NODES[b];
                return <DataPacket key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} delay={i * 0.4} />;
              })}

              {/* Nodes */}
              {MESH_NODES.map(node => (
                <g key={node.id}>
                  {node.online && (
                    <motion.circle
                      cx={node.x + '%'} cy={node.y + '%'}
                      r={8}
                      fill="rgba(59,110,248,0.15)"
                      animate={{ r: [6, 10, 6], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: node.id * 0.3 }}
                    />
                  )}
                  <circle
                    cx={node.x + '%'} cy={node.y + '%'}
                    r={4}
                    fill={node.online ? '#3b6ef8' : '#94a3b8'}
                    stroke={node.online ? 'rgba(59,110,248,0.5)' : 'rgba(148,163,184,0.3)'}
                    strokeWidth={1.5}
                  />
                  <text
                    x={node.x + '%'} y={(node.y + 12) + '%'}
                    textAnchor="middle"
                    fontSize="5"
                    fill={node.online ? '#3b6ef8' : '#94a3b8'}
                    fontFamily="'JetBrains Mono',monospace"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Button */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Broadcast status */}
        <AnimatePresence>
          {(sosActive || meshBroadcast) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 14px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <Radio size={11} color="#ef4444" />
              </motion.div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.06em' }}>
                Broadcasting via mesh…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The big SOS button */}
        <motion.button
          onTapStart={() => setPressing(true)}
          onTap={() => setPressing(false)}
          onClick={onSOS}
          animate={sosActive ? {
            boxShadow: ['0 0 0 0 rgba(239,68,68,0.5)', '0 0 0 24px rgba(239,68,68,0)', '0 0 0 0 rgba(239,68,68,0)'],
          } : {
            boxShadow: '0 0 24px rgba(239,68,68,0.35)',
          }}
          transition={sosActive ? { duration: 1.4, repeat: Infinity } : {}}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: sosActive
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #ff6b6b, #ef4444)',
            border: '3px solid rgba(255,255,255,0.4)',
            color: 'white',
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Radio size={18} />
          <span style={{ fontSize: 10, fontWeight: 800 }}>SOS</span>
        </motion.button>
      </motion.div>
    </>
  );
}
