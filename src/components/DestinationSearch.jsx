import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Navigation2, Shield, Clock, MapPin, X, Route, Loader2 } from 'lucide-react';
import * as api from '../services/api';

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Geocode using OpenStreetMap Nominatim (free, no key)
async function searchPlaces(query) {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in&viewbox=77.4,13.1,77.8,12.8&bounded=0`
    );
    const data = await res.json();
    return data.map(place => ({
      id: place.place_id,
      name: place.display_name.split(',').slice(0, 3).join(', '),
      fullName: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      type: place.type,
    }));
  } catch (err) {
    console.warn('Geocode error:', err);
    return [];
  }
}

// Safety score color + label
function getSafetyInfo(score) {
  if (score >= 80) return { color: '#10c97c', bg: 'rgba(16,201,124,0.12)', label: 'Very Safe', icon: '🟢' };
  if (score >= 60) return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Safe', icon: '🔵' };
  if (score >= 40) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Moderate', icon: '🟡' };
  if (score >= 20) return { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Risky', icon: '🟠' };
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Dangerous', icon: '🔴' };
}

export default function DestinationSearch({ userLocation, zones, onRouteFound, onDestinationSelect, userRecommendations }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [destination, setDestination] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const debouncedQuery = useDebounce(query, 400);

  // Search places when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      searchPlaces(debouncedQuery).then(results => {
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Calculate route when destination is selected
  const selectDestination = useCallback(async (place) => {
    setDestination(place);
    setQuery(place.name);
    setShowSuggestions(false);
    setLoading(true);
    setRouteResult(null);

    // Notify parent about the selected destination for navigation
    if (onDestinationSelect) onDestinationSelect(place);

    try {
      // Use user's GPS location or fall back to a safe zone
      const start = userLocation
        ? { lat: userLocation[0], lng: userLocation[1] }
        : { lat: 12.9716, lng: 77.5946 }; // Default: Sector 4 Downtown

      const result = await api.getSafeRoute(start, { lat: place.lat, lng: place.lng });

      if (result?.route) {
        setRouteResult(result.route);
        if (onRouteFound) onRouteFound(result.route);
      } else {
        // Fallback: generate a simple safety estimate based on nearby zones
        const nearestZone = findNearestZone(place.lat, place.lng, zones);
        const fallbackScore = nearestZone
          ? (nearestZone.status === 'safe' ? 85 : nearestZone.status === 'warn' ? 45 : 15)
          : 50;

        const fallbackRoute = {
          path: [
            [start.lat, start.lng],
            [place.lat, place.lng],
          ],
          safety_score: fallbackScore,
          distance: haversineDistance(start.lat, start.lng, place.lat, place.lng),
        };
        setRouteResult(fallbackRoute);
        if (onRouteFound) onRouteFound(fallbackRoute);
      }
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setLoading(false);
    }
  }, [userLocation, zones, onRouteFound]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDestination(null);
    setRouteResult(null);
    setSuggestions([]);
    setShowSuggestions(false);
    if (onRouteFound) onRouteFound(null);
    if (onDestinationSelect) onDestinationSelect(null);
    inputRef.current?.focus();
  }, [onRouteFound, onDestinationSelect]);

  const safety = routeResult ? getSafetyInfo(routeResult.safety_score) : null;

  return (
    <div ref={panelRef} className="destination-search-panel">
      {/* Search Input */}
      <motion.div
        className="search-input-wrap"
        animate={{
          boxShadow: focused
            ? '0 4px 24px rgba(59,110,248,0.18), 0 0 0 2px rgba(59,110,248,0.15)'
            : '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <Search size={16} color={focused ? '#3b6ef8' : '#94a3b8'} style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search destination..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (suggestions.length) setShowSuggestions(true); }}
          onBlur={() => setFocused(false)}
          className="search-input"
        />
        {loading && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={16} color="#3b6ef8" />
          </motion.div>
        )}
        {(query || destination) && !loading && (
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.85 }}
            onClick={clearSearch}
            className="search-clear-btn"
          >
            <X size={14} />
          </motion.button>
        )}
      </motion.div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && !destination && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="search-suggestions"
          >
            {suggestions.map((place) => (
              <motion.button
                key={place.id}
                whileHover={{ backgroundColor: 'rgba(59,110,248,0.06)' }}
                className="suggestion-item"
                onClick={() => selectDestination(place)}
              >
                <MapPin size={14} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="suggestion-name">{place.name}</div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Result Card */}
      <AnimatePresence>
        {routeResult && destination && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="route-result-card"
          >
            {/* Destination */}
            <div className="route-destination">
              <Navigation2 size={14} color="#3b6ef8" style={{ flexShrink: 0 }} />
              <span className="route-dest-name">{destination.name}</span>
            </div>

            {/* Safety Score – Main Feature */}
            <div className="safety-score-section" style={{ background: safety.bg }}>
              <div className="safety-score-header">
                <Shield size={16} color={safety.color} />
                <span style={{ color: safety.color, fontWeight: 700, fontSize: 13 }}>Safety Score</span>
              </div>
              <div className="safety-score-display">
                <motion.span
                  className="safety-score-number"
                  style={{ color: safety.color }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {routeResult.safety_score}
                </motion.span>
                <span className="safety-score-max">/100</span>
                <span className="safety-score-label" style={{ color: safety.color, background: `${safety.color}18` }}>
                  {safety.icon} {safety.label}
                </span>
              </div>

              {/* Safety Bar */}
              <div className="safety-bar-track">
                <motion.div
                  className="safety-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${routeResult.safety_score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: `linear-gradient(90deg, ${safety.color}88, ${safety.color})` }}
                />
              </div>
            </div>

            {/* Route Stats */}
            <div className="route-stats">
              <div className="route-stat">
                <Route size={12} color="#64748b" />
                <span>{(routeResult.distance / 1000).toFixed(1)} km</span>
              </div>
              <div className="route-stat">
                <Clock size={12} color="#64748b" />
                <span>~{Math.max(1, Math.round(routeResult.distance / 800))} min walk</span>
              </div>
              <div className="route-stat">
                <MapPin size={12} color="#64748b" />
                <span>{routeResult.path?.length || 0} waypoints</span>
              </div>
            </div>

            {/* Safety factors */}
            <div className="safety-factors">
              <span className="safety-factor-title">Based on:</span>
              <div className="safety-factor-tags">
                <span className="safety-tag">Hazard zones</span>
                <span className="safety-tag">Recent incidents</span>
                <span className="safety-tag">AI prediction</span>
                {userRecommendations && userRecommendations.length > 0 && (
                  <span className="safety-tag" style={{ background: 'rgba(16,201,124,0.12)', color: '#10c97c' }}>Community Verified ({userRecommendations.length})</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helpers
function findNearestZone(lat, lng, zones) {
  let nearest = null;
  let minDist = Infinity;
  for (const z of zones) {
    const d = Math.sqrt(Math.pow(z.lat - lat, 2) + Math.pow(z.lng - lng, 2));
    if (d < minDist) { minDist = d; nearest = z; }
  }
  return nearest;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
