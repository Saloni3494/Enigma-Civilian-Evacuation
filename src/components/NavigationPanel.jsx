import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation2, ArrowUpRight, ArrowUpLeft, ArrowUp,
  CornerUpRight, CornerUpLeft, Volume2, VolumeX,
  Play, Pause, Square, FastForward, AlertTriangle,
  MapPin, Clock, Route, ChevronUp, ChevronDown, Shield
} from 'lucide-react';
import { getOSRMRoute, JourneySimulator, speak, setVoiceEnabled } from '../services/navigationEngine';
import './NavigationPanel.css';

// Maneuver icon based on type + modifier
function ManeuverIcon({ type, modifier, size = 28, color = 'white' }) {
  if (type === 'arrive') return <MapPin size={size} color={color} />;
  if (type === 'depart') return <Navigation2 size={size} color={color} />;
  if (type === 'flyover') return <span style={{ fontSize: size - 4, filter: color === 'white' ? 'none' : 'grayscale(1) brightness(0.5)' }}>🌉</span>;

  if (modifier?.includes('right')) return <CornerUpRight size={size} color={color} />;
  if (modifier?.includes('left')) return <CornerUpLeft size={size} color={color} />;
  if (modifier?.includes('straight') || type === 'continue' || type === 'new name')
    return <ArrowUp size={size} color={color} />;

  return <ArrowUp size={size} color={color} />;
}

function formatDist(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function NavigationPanel({
  destination,
  userLocation,
  zones,
  searchedRoute,
  onRouteReady,
  onSimulationPosition,
  onSubmitFeedback,
  onClose,
}) {
  const [state, setState] = useState('idle'); // idle | loading | ready | navigating | arrived
  const [route, setRoute] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [nextStep, setNextStep] = useState(null);
  const [navData, setNavData] = useState({ progress: 0, remainingDistance: 0, heading: 0 });
  const [voiceOn, setVoiceOn] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoneAlert, setZoneAlert] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const simulatorRef = useRef(null);

  // Fetch OSRM route when destination changes
  useEffect(() => {
    if (!destination) {
      setState('idle');
      setRoute(null);
      return;
    }

    setState('loading');
    const start = userLocation || [12.9716, 77.5946];

    getOSRMRoute(start[0], start[1], destination.lat, destination.lng).then(result => {
      if (result) {
        // Inject Flyover Instructions from searchedRoute
        if (searchedRoute && searchedRoute.flyovers && searchedRoute.flyovers.length > 0) {
          searchedRoute.flyovers.forEach(flyover => {
            // Find closest step in OSRM route to inject the flyover maneuver
            let closestStepIdx = 0;
            let minDist = Infinity;
            
            result.instructions.forEach((step, idx) => {
              const dist = Math.sqrt(
                Math.pow(step.location[1] - flyover.startCoords[0], 2) + 
                Math.pow(step.location[0] - flyover.startCoords[1], 2)
              );
              if (dist < minDist) {
                minDist = dist;
                closestStepIdx = idx;
              }
            });

            // Insert a synthetic flyover instruction if it's reasonably close (<0.01 deg)
            if (minDist < 0.01) {
              result.instructions.splice(closestStepIdx + 1, 0, {
                id: `flyover_${flyover.id}`,
                instruction: `Take the flyover: ${flyover.name}`,
                distance: flyover.distance,
                duration: flyover.distance / 15, // rough estimate
                maneuver: 'flyover',
                modifier: 'straight',
                location: [flyover.startCoords[1], flyover.startCoords[0]],
                name: flyover.name,
                isFlyover: true
              });
            }
          });
          
          // Re-index instructions
          result.instructions.forEach((step, idx) => step.id = idx);
        }

        setRoute(result);
        setState('ready');
        if (onRouteReady) onRouteReady(result);
      } else {
        setState('idle');
      }
    });

    return () => {
      if (simulatorRef.current) {
        simulatorRef.current.stop();
        simulatorRef.current = null;
      }
    };
  }, [destination, userLocation]);

  // Start journey simulation
  const startNavigation = useCallback(() => {
    if (!route) return;
    setState('navigating');

    const sim = new JourneySimulator(
      route.coordinates,
      route.instructions,
      zones,
      // onUpdate
      (data) => {
        setCurrentStep(data.currentStep);
        setNextStep(data.nextStep);
        setNavData({
          progress: data.progress,
          remainingDistance: data.remainingDistance,
          heading: data.heading,
          position: data.position,
        });
        if (data.zoneAlert) {
          setZoneAlert(data.zoneAlert);
          setTimeout(() => setZoneAlert(null), 6000);
        }
        if (onSimulationPosition) onSimulationPosition(data.position);
      },
      // onComplete
      () => {
        setState('arrived');
        if (onSimulationPosition) onSimulationPosition(null);
      }
    );

    simulatorRef.current = sim;
    sim.setSpeed(speed);
    sim.start();
  }, [route, zones, speed, onSimulationPosition]);

  const togglePause = useCallback(() => {
    if (!simulatorRef.current) return;
    if (simulatorRef.current.paused) {
      simulatorRef.current.resume();
    } else {
      simulatorRef.current.pause();
    }
  }, []);

  const stopNavigation = useCallback(() => {
    if (simulatorRef.current) {
      simulatorRef.current.stop();
      simulatorRef.current = null;
    }
    setState('ready');
    if (onSimulationPosition) onSimulationPosition(null);
  }, [onSimulationPosition]);

  const cycleSpeed = useCallback(() => {
    const speeds = [1, 2, 5, 10];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    if (simulatorRef.current) simulatorRef.current.setSpeed(next);
  }, [speed]);

  const toggleVoice = useCallback(() => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
    if (next) speak('Voice navigation enabled');
  }, [voiceOn]);

  if (state === 'idle') return null;

  return (
    <div className="nav-panel-container">
      {/* Zone Alert Banner */}
      <AnimatePresence>
        {zoneAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="nav-zone-alert"
          >
            <AlertTriangle size={18} color="#ef4444" />
            <span>{zoneAlert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation Card */}
      <motion.div
        className="nav-panel"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        layout
      >
        {/* Loading State */}
        {state === 'loading' && (
          <div className="nav-loading">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="nav-spinner"
            />
            <span>Calculating safest route...</span>
          </div>
        )}

        {/* Ready / Navigating State */}
        {(state === 'ready' || state === 'navigating') && route && (
          <>
            {/* Current Maneuver – Big Turn Display */}
            {state === 'navigating' && currentStep && (
              <div className="nav-maneuver">
                <div className="nav-maneuver-icon">
                  <ManeuverIcon
                    type={currentStep.maneuver}
                    modifier={currentStep.modifier}
                    size={32}
                    color="white"
                  />
                </div>
                <div className="nav-maneuver-info">
                  <div className="nav-maneuver-dist">
                    {formatDist(nextStep?.distance || currentStep.distance)}
                  </div>
                  <div className="nav-maneuver-text">
                    {nextStep?.instruction || currentStep.instruction}
                  </div>
                  {currentStep.name && (
                    <div className="nav-road-name">{currentStep.name}</div>
                  )}
                </div>
              </div>
            )}

            {/* Route Overview (when ready, not yet navigating) */}
            {state === 'ready' && (
              <div className="nav-overview">
                <div className="nav-overview-header">
                  <Navigation2 size={18} color="#3b6ef8" />
                  <span className="nav-overview-title">Route Ready</span>
                </div>
                <div className="nav-overview-stats">
                  <div className="nav-stat">
                    <Route size={14} color="#64748b" />
                    <span>{formatDist(route.distance)}</span>
                  </div>
                  <div className="nav-stat">
                    <Clock size={14} color="#64748b" />
                    <span>{formatTime(route.duration)}</span>
                  </div>
                  <div className="nav-stat">
                    <Shield size={14} color="#10c97c" />
                    <span>{route.instructions?.length || 0} turns</span>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {state === 'navigating' && (
              <div className="nav-progress-bar">
                <motion.div
                  className="nav-progress-fill"
                  animate={{ width: `${navData.progress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Bottom Controls */}
            <div className="nav-controls">
              {state === 'ready' && (
                <motion.button
                  className="nav-start-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startNavigation}
                >
                  <Play size={18} />
                  <span>Start Navigation</span>
                </motion.button>
              )}

              {state === 'navigating' && (
                <>
                  <div className="nav-eta">
                    <span className="nav-eta-dist">{formatDist(navData.remainingDistance)}</span>
                    <span className="nav-eta-label">remaining</span>
                  </div>

                  <div className="nav-btns">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleVoice}
                      className="nav-icon-btn"
                      title={voiceOn ? 'Mute' : 'Unmute'}
                    >
                      {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={cycleSpeed}
                      className="nav-icon-btn nav-speed-btn"
                      title="Change speed"
                    >
                      <FastForward size={14} />
                      <span>{speed}x</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={togglePause}
                      className="nav-icon-btn"
                      title="Pause/Resume"
                    >
                      {simulatorRef.current?.paused
                        ? <Play size={16} />
                        : <Pause size={16} />}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={stopNavigation}
                      className="nav-icon-btn nav-stop-btn"
                      title="Stop navigation"
                    >
                      <Square size={16} />
                    </motion.button>
                  </div>
                </>
              )}
            </div>

            {/* Expandable Steps List */}
            {state === 'navigating' && (
              <>
                <button className="nav-expand-btn" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span>{expanded ? 'Hide steps' : 'Show all steps'}</span>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="nav-steps-list"
                    >
                      {route.instructions.map((step, i) => (
                        <div
                          key={step.id}
                          className={`nav-step-item ${i === navData.currentStepIndex ? 'active' : ''} ${i < navData.currentStepIndex ? 'done' : ''}`}
                        >
                          <div className="nav-step-icon">
                            <ManeuverIcon type={step.maneuver} modifier={step.modifier} size={16} color={i <= navData.currentStepIndex ? '#3b6ef8' : '#94a3b8'} />
                          </div>
                          <div className="nav-step-info">
                            <span className="nav-step-text">{step.instruction}</span>
                            <span className="nav-step-dist">{formatDist(step.distance)}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </>
        )}

        {/* Arrived State & Feedback Form */}
        {state === 'arrived' && (
          <div className="nav-arrived">
            {!feedbackSubmitted ? (
              <>
                <div className="nav-arrived-icon">🎉</div>
                <div className="nav-arrived-text">You have arrived!</div>

                <div className="nav-feedback-section">
                  <p className="nav-feedback-title">How safe did this route feel?</p>
                  <div className="nav-feedback-options">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="nav-feedback-btn safe"
                      onClick={() => {
                        if (onSubmitFeedback) onSubmitFeedback({ rating: 'safe', destination: destination?.name, timestamp: new Date().toISOString() });
                        setFeedbackSubmitted(true);
                      }}
                    >
                      <Shield size={16} />
                      Safe
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="nav-feedback-btn moderate"
                      onClick={() => {
                        if (onSubmitFeedback) onSubmitFeedback({ rating: 'moderate', destination: destination?.name, timestamp: new Date().toISOString() });
                        setFeedbackSubmitted(true);
                      }}
                    >
                      <AlertTriangle size={16} />
                      Moderate
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="nav-feedback-btn unsafe"
                      onClick={() => {
                        if (onSubmitFeedback) onSubmitFeedback({ rating: 'unsafe', destination: destination?.name, timestamp: new Date().toISOString() });
                        setFeedbackSubmitted(true);
                      }}
                    >
                      <AlertTriangle size={16} />
                      Unsafe
                    </motion.button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="nav-arrived-icon">✅</div>
                <div className="nav-arrived-text">Thank you for your feedback!</div>
                <p className="nav-feedback-thanks">Your report helps keep the community safe.</p>
                <motion.button
                  className="nav-close-btn"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setState('idle');
                    setFeedbackSubmitted(false);
                    if (onClose) onClose();
                  }}
                >
                  Done
                </motion.button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
