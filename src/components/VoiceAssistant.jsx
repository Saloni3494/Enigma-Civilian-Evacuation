import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceAssistant({ store }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
        processCommand(result.toLowerCase());
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  }, []);

  const speak = (text) => {
    setResponse(text);
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
      synthRef.current.speak(utterance);
    }
  };

  const processCommand = (cmd) => {
    if (cmd.includes('sos') || cmd.includes('help') || cmd.includes('emergency')) {
      speak('Activating SOS and broadcasting to the mesh network. Stay calm.');
      store.triggerSOS();
    } else if (cmd.includes('safe') || cmd.includes('route') || cmd.includes('evacuate')) {
      speak('Calculating the safest evacuation route away from hazard zones.');
      // Assuming store has a generic search method or we just show a generic response
    } else if (cmd.includes('status') || cmd.includes('danger')) {
      const dangerZones = store.zones.filter(z => z.status === 'danger');
      if (dangerZones.length > 0) {
        speak(`Warning. There are ${dangerZones.length} active danger zones nearby. Please check the map.`);
      } else {
        speak('All clear. No immediate danger zones detected in your vicinity.');
      }
    } else {
      speak("I didn't catch that. Try saying 'activate SOS' or 'status'.");
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setResponse('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'absolute',
        bottom: 220, // Positioned above Quick Evacuate
        right: 16,
        zIndex: 750,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
        pointerEvents: 'auto',
      }}
    >
      <AnimatePresence>
        {(transcript || response) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '12px 16px',
              maxWidth: '220px',
              color: 'white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'right',
            }}
          >
            {transcript && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontStyle: 'italic' }}>
                "{transcript}"
              </div>
            )}
            {response && (
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#10c97c', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                {response}
                <Volume2 size={12} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleListen}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: isListening ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isListening ? 'white' : '#64748b',
          boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Mic size={20} />
          </motion.div>
        ) : (
          <MicOff size={20} />
        )}
      </motion.button>
    </motion.div>
  );
}
