import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Camera, Zap, Route, CheckCircle, Loader } from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 0, icon: Camera, label: 'Analyzing camera input…', color: '#000000' },
  { id: 1, icon: Brain, label: 'Classifying event type…', color: '#7c3aed' },
  { id: 2, icon: Zap, label: 'Predicting risk spread…', color: '#f59e0b' },
  { id: 3, icon: Route, label: 'Calculating safe route…', color: '#10c97c' },
  { id: 4, icon: CheckCircle, label: 'Dispatching output…', color: '#3b6ef8' },
];

function PipelineStep({ step, active, done }) {
  const Icon = step.icon;
  return (
    <motion.div
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}
    >
      {/* Icon circle */}
      <motion.div
        animate={active ? { scale: [1, 1.15, 1], boxShadow: [`0 0 0px ${step.color}00`, `0 0 14px ${step.color}99`, `0 0 6px ${step.color}60`] } : {}}
        transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done || active ? `${step.color}22` : 'rgba(148,163,184,0.1)',
          border: `1.5px solid ${done || active ? step.color : 'rgba(148,163,184,0.2)'}`,
          transition: 'all 0.3s ease',
          flexShrink: 0,
        }}
      >
        {active
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader size={13} color={step.color} /></motion.div>
          : <Icon size={13} color={done || active ? step.color : '#94a3b8'} />
        }
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{ opacity: done || active ? 1 : 0.4 }}
        style={{
          fontSize: 11,
          fontWeight: active ? 600 : done ? 500 : 400,
          color: active ? step.color : '#000000',
          letterSpacing: '0.01em',
          flex: 1,
          transition: 'color 0.3s ease',
        }}
      >
        {step.label}
      </motion.span>

      {/* Status dot */}
      <motion.div
        animate={{ opacity: done ? 1 : 0 }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: '#10c97c', flexShrink: 0 }}
      />

      {/* Connector line below (not on last) */}
    </motion.div>
  );
}

export default function AIPipelinePanel({ aiPipeline }) {
  const { active, step } = aiPipeline;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        position: 'absolute',
        bottom: 16,
        left: 252,
        width: 240,
        zIndex: 600,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--grad-panel)',
        backdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--clr-border)',
        boxShadow: active ? '0 0 30px rgba(59,110,248,0.20), var(--shadow-panel)' : 'var(--shadow-panel)',
        overflow: 'hidden',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--clr-border)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'linear-gradient(135deg, rgba(59,110,248,0.07), rgba(124,58,237,0.05))',
      }}>
        <motion.div
          animate={active ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: active ? Infinity : 0, ease: 'linear' }}
        >
          <Brain size={14} color="var(--clr-primary)" />
        </motion.div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#000000', letterSpacing: '0.05em' }}>
          AI PIPELINE
        </span>
        <AnimatePresence>
          {active && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                marginLeft: 'auto',
                fontSize: 8,
                fontWeight: 700,
                color: 'var(--clr-primary)',
                background: 'var(--clr-primary-light)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
                letterSpacing: '0.08em',
              }}
            >
              LIVE
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Steps */}
      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PIPELINE_STEPS.map((s, i) => (
          <div key={s.id}>
            <PipelineStep
              step={s}
              active={active && step === i}
              done={active ? step > i : false}
            />
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{
                marginLeft: 14,
                width: 1.5,
                height: 8,
                background: (active && step > i) ? s.color + '60' : 'rgba(148,163,184,0.15)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Status footer */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              borderTop: '1px solid var(--clr-border)',
              padding: '6px 14px',
              background: 'var(--clr-primary-light)',
            }}
          >
            <div style={{ fontSize: 9, color: 'var(--clr-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ● Processing: {PIPELINE_STEPS[Math.max(0, step)]?.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
