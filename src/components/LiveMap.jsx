import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Polyline, Circle, Marker, useMap, Popup } from 'react-leaflet';
import { Satellite, Hospital, Home, Shield } from 'lucide-react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import DestinationSearch from './DestinationSearch';
import NavigationPanel from './NavigationPanel';
import { getPhoneLocation, updateLocation } from '../services/api';
import './DestinationSearch.css';
import './NavigationPanel.css';
import './LiveMap.css';

const STATUS_COLORS = {
  safe: { fill: '#10c97c', glow: 'rgba(16,201,124,0.35)' },
  warn: { fill: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  danger: { fill: '#ef4444', glow: 'rgba(239,68,68,0.45)' },
};

// Animated zone marker via Leaflet DivIcon
function ZoneMarker({ zone }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    const c = STATUS_COLORS[zone.status];
    const icon = L.divIcon({
      className: 'zone-marker',
      html: `
        <div class="zone-pulse-wrap">
          <div class="zone-pulse-ring" style="background:${c.fill};opacity:0.4"></div>
          <div class="zone-pulse-ring delay1" style="background:${c.fill};opacity:0.25"></div>
          <div class="zone-pulse-dot" style="background:${c.fill};color:${c.fill}"></div>
          <div class="zone-label" style="background:${c.fill}">${zone.name.split('–')[0].trim()}</div>
        </div>
      `,
      iconSize: [40, 60],
      iconAnchor: [20, 20],
    });

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }
    const marker = L.marker([zone.lat, zone.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${zone.name}</div>
          <div style="font-size:11px;color:#475569">Status: <b style="color:${c.fill}">${zone.status.toUpperCase()}</b></div>
          <div style="font-size:11px;color:#475569">Population: ${zone.population.toLocaleString()}</div>
        </div>
      `);
    markerRef.current = marker;
    return () => map.removeLayer(marker);
  }, [zone, map]);

  return null;
}

// Heatmap circles using Leaflet CircleMarker underneath
function HeatmapOverlay({ zones, expanding }) {
  return (
    <>
      {zones.map(zone => {
        const c = STATUS_COLORS[zone.status];
        const radius = zone.status === 'danger' ? 420 : zone.status === 'warn' ? 280 : 180;
        return (
          <CircleMarker
            key={`heat-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={0}
            pathOptions={{
              fillColor: c.fill,
              fillOpacity: zone.status === 'danger' ? 0.14 : 0.09,
              color: c.fill,
              opacity: 0.18,
              weight: 0,
            }}
          />
        );
      })}
    </>
  );
}

// Prediction zone dashed circle
function PredictionZone({ show }) {
  const map = useMap();
  const circleRef = useRef(null);

  useEffect(() => {
    if (!show) {
      if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; }
      return;
    }
    const c = L.circle([12.9700, 77.6150], {
      radius: 600,
      color: '#7c3aed',
      fillColor: 'rgba(124,58,237,0.08)',
      fillOpacity: 1,
      weight: 2.5,
      dashArray: '12 6',
      className: 'prediction-zone',
    }).addTo(map);
    circleRef.current = c;
    return () => { if (circleRef.current) map.removeLayer(circleRef.current); };
  }, [show, map]);

  return null;
}

// Safe route polyline with animation
function SafeRoute({ blocked }) {
  const normalPath = [
    [12.9634, 77.6007],
    [12.9680, 77.5970],
    [12.9716, 77.5946],
  ];
  const altPath = [
    [12.9634, 77.6007],
    [12.9640, 77.5900],
    [12.9716, 77.5946],
  ];

  return (
    <>
      <AnimatePresence>
        {!blocked && (
          <Polyline
            positions={normalPath}
            pathOptions={{ color: '#3b6ef8', weight: 4, opacity: 0.85, dashArray: '0' }}
          />
        )}
      </AnimatePresence>
      {blocked && (
        <Polyline
          positions={normalPath}
          pathOptions={{ color: '#ef4444', weight: 3, opacity: 0.5, dashArray: '8 5' }}
        />
      )}
      {blocked && (
        <Polyline
          positions={altPath}
          pathOptions={{ color: '#10c97c', weight: 4, opacity: 0.90 }}
        />
      )}
    </>
  );
}

// SOS Ripple – HTML overlay positioned at zone-b
function SOSRippleOverlay({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            top: '42%',
            left: '60%',
            transform: 'translate(-50%,-50%)',
            zIndex: 410,
            pointerEvents: 'none',
          }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 80, height: 80,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.25)',
                border: '2px solid rgba(239,68,68,0.6)',
              }}
              animate={{ scale: [1, 3.5], opacity: [0.8, 0] }}
              transition={{ duration: 2, delay: i * 0.65, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 24, height: 24, borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 20px rgba(239,68,68,0.8)',
            zIndex: 1,
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Real-time GPS location tracker or Remote tracked phone
function UserLocationMarker({ trackedPhone }) {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const markerRef = useRef(null);
  const hasPannedRef = useRef(false);

  useEffect(() => {
    let watchId;
    let pollInterval;

    if (trackedPhone) {
      // Track remote phone via API
      const pollLocation = async () => {
        try {
          const res = await getPhoneLocation(trackedPhone);
          if (res && res.success && res.location) {
            const [lat, lng] = res.location;
            setPosition([lat, lng]);
            setAccuracy(10); // arbitrary good accuracy for tracked phone

            if (!hasPannedRef.current) {
              hasPannedRef.current = true;
              map.setView([lat, lng], 15, { animate: true });
            }
          }
        } catch (err) {
          console.warn('Failed to get tracked phone location:', err);
        }
      };

      pollLocation();
      pollInterval = setInterval(pollLocation, 3000); // poll every 3 seconds

    } else {
      // Use local device GPS
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported by this browser');
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy: acc } = pos.coords;
          setPosition([latitude, longitude]);
          setAccuracy(acc);

          // Sync location to backend if logged in
          try {
            const saved = localStorage.getItem('sera_user');
            if (saved) {
              const user = JSON.parse(saved);
              if (user.email) {
                updateLocation(user.email, [latitude, longitude]).catch(() => { });
              }
            }
          } catch (e) { }

          // Pan to user location on first GPS fix
          if (!hasPannedRef.current) {
            hasPannedRef.current = true;
            map.setView([latitude, longitude], 15, { animate: true });
          }
        },
        (err) => {
          console.warn('GPS error:', err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [map, trackedPhone]);

  useEffect(() => {
    if (!position) return;

    // Create / update the pulsing blue dot marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    const icon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="user-loc-wrap">
          <div class="user-loc-pulse"></div>
          <div class="user-loc-pulse delay2"></div>
          <div class="user-loc-dot"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker(position, { icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:140px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">📍 Your Location</div>
          <div style="font-size:11px;color:#475569">Lat: ${position[0].toFixed(6)}</div>
          <div style="font-size:11px;color:#475569">Lng: ${position[1].toFixed(6)}</div>
          <div style="font-size:11px;color:#475569">Accuracy: ±${Math.round(accuracy || 0)}m</div>
        </div>
      `);

    markerRef.current = marker;
    return () => map.removeLayer(marker);
  }, [position, accuracy, map]);

  // Accuracy radius circle
  if (!position) return null;
  return (
    <Circle
      center={position}
      radius={accuracy || 50}
      pathOptions={{
        color: '#3b82f6',
        fillColor: 'rgba(59,130,246,0.08)',
        fillOpacity: 1,
        weight: 1.5,
        opacity: 0.4,
      }}
    />
  );
}

// Destination route polyline + destination marker
function DestinationRoute({ route }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (!route || !route.path || route.path.length < 2) return;

    // Add destination marker
    const dest = route.path[route.path.length - 1];
    const icon = L.divIcon({
      className: 'destination-marker',
      html: `
        <div class="dest-marker-wrap">
          <div class="dest-marker-pin"></div>
          <div class="dest-marker-shadow"></div>
        </div>
      `,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    });

    const marker = L.marker([dest[0], dest[1]], { icon, zIndexOffset: 900 }).addTo(map);
    markerRef.current = marker;

    // Fit map to show entire route
    const bounds = L.latLngBounds(route.path.map(p => [p[0], p[1]]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });

    return () => {
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [route, map]);

  if (!route || !route.path || route.path.length < 2) return null;

  const safetyScore = route.safety_score || 50;
  const color = safetyScore >= 70 ? '#10c97c' : safetyScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* Route shadow */}
      <Polyline
        positions={route.path}
        pathOptions={{ color: '#000', weight: 7, opacity: 0.08 }}
      />
      {/* Route line */}
      <Polyline
        positions={route.path}
        pathOptions={{
          color: color,
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Route outline */}
      <Polyline
        positions={route.path}
        pathOptions={{
          color: '#fff',
          weight: 7,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
}

// Simulation marker – green dot that moves along the route during navigation
function SimulationMarker({ position }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (!position) return;

    const icon = L.divIcon({
      className: 'sim-marker',
      html: `
        <div class="sim-marker-wrap">
          <div class="sim-marker-pulse"></div>
          <div class="sim-marker-arrow"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(position, { icon, zIndexOffset: 2000 }).addTo(map);
    markerRef.current = marker;

    // Smoothly pan map to follow simulation
    map.panTo(position, { animate: true, duration: 0.3 });

    return () => {
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [position, map]);

  return null;
}

// OSRM route polyline (real roads)
function OSRMRoute({ route }) {
  if (!route || !route.coordinates || route.coordinates.length < 2) return null;

  return (
    <>
      {/* Shadow */}
      <Polyline
        positions={route.coordinates}
        pathOptions={{ color: '#000', weight: 8, opacity: 0.06 }}
      />
      {/* White outline */}
      <Polyline
        positions={route.coordinates}
        pathOptions={{ color: '#fff', weight: 7, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }}
      />
      {/* Blue route */}
      <Polyline
        positions={route.coordinates}
        pathOptions={{
          color: '#4285F4',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
}

// Facility icon helper (returns plain HTML string for Leaflet DivIcon)
function facilityIconHTML(type) {
  const configs = {
    hospital: { color: '#ef4444', svg: '<path d="M18 18v-6a2 2 0 0 0-2-2h-4V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12h14z"/><path d="M9 12h2m-1-1v2"/>' },
    shelter: { color: '#3b82f6', svg: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    police: { color: '#10c97c', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  };
  const cfg = configs[type] || configs.shelter;
  return `<div style="width:26px;height:26px;border-radius:50%;background:white;border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cfg.svg}</svg>
  </div>`;
}

// Hardware ESP32 Tag Marker
function HardwareDeviceMarker({ device }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!device || !device.lat || !device.lng) return;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    const isDistress = device.sos === true;
    const bg = isDistress ? '#ef4444' : '#3b82f6';
    const ring = isDistress ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)';
    const tempText = device.temperature ? `| ${device.temperature.toFixed(1)}°C` : '';
    const animClass = isDistress ? 'hardware-sos-pulse' : '';

    const icon = L.divIcon({
      className: 'hardware-marker',
      html: `
        <div style="position:relative; width:16px; height:16px;">
          <div class="${animClass}" style="position:absolute; inset:-8px; border-radius:50%; background:${ring};"></div>
          <div style="position:absolute; inset:0; border-radius:50%; background:${bg}; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:2;"></div>
          <div style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; font-size:9px; padding:2px 6px; border-radius:4px; white-space:nowrap; font-weight:700;">
            ${device.device_id.split('_').pop()} ${tempText}
          </div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const marker = L.marker([device.lat, device.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:140px">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px">Device: ${device.device_id}</div>
          <div style="font-size:11px;color:#475569">Status: <b style="color:${bg}">${isDistress ? 'SOS ACTIVE' : 'ONLINE'}</b></div>
          ${device.temperature ? `<div style="font-size:11px;color:#475569">Temp: ${device.temperature.toFixed(1)}°C</div>` : ''}
        </div>
      `);

    markerRef.current = marker;
    return () => { if (marker) map.removeLayer(marker); };
  }, [device, map]);

  return null;
}

// Manual pin selection via map click
function ManualPinSelector({ enabled, onPinSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    function handleClick(e) {
      if (onPinSelect) onPinSelect([e.latlng.lat, e.latlng.lng]);
    }
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [enabled, onPinSelect, map]);

  return null;
}

export default function LiveMap({ zones, facilities, sosActive, routeBlocked, showPrediction, onZoneSelect, onSubmitFeedback, userRecommendations, trackedPhone, hardwareDevices }) {
  const center = [18.464140, 73.867642]; // Pune (matches SERA Tag location)
  const [searchedRoute, setSearchedRoute] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [selectedDest, setSelectedDest] = useState(null);
  const [osrmRoute, setOsrmRoute] = useState(null);
  const [simPosition, setSimPosition] = useState(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const [manualPinMode, setManualPinMode] = useState(false);

  // Track user position for search component
  useEffect(() => {
    let watchId;
    let pollInterval;

    if (trackedPhone) {
      const poll = async () => {
        try {
          const res = await getPhoneLocation(trackedPhone);
          if (res && res.success && res.location) {
            setUserPos([res.location[0], res.location[1]]);
          }
        } catch (e) { }
      };
      poll();
      pollInterval = setInterval(poll, 3000);
    } else {
      if (!navigator.geolocation) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => { },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [trackedPhone]);

  // When a destination is selected via search, set it for navigation
  const handleRouteFound = useCallback((route) => {
    setSearchedRoute(route);
  }, []);

  // When destination is selected from DestinationSearch
  const handleDestinationSelect = useCallback((dest) => {
    setSelectedDest(dest);
  }, []);

  // Handle manual pin selection as GPS fallback
  const handleManualPin = useCallback((pos) => {
    setUserPos(pos);
    setManualPinMode(false);
  }, []);

  return (
    <div className="map-root">
      {/* Destination Search – Google Maps style */}
      <DestinationSearch
        userLocation={userPos}
        zones={zones}
        onRouteFound={handleRouteFound}
        onDestinationSelect={handleDestinationSelect}
        userRecommendations={userRecommendations}
      />

      {/* Manual Pin Mode Indicator */}
      <AnimatePresence>
        {manualPinMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
              zIndex: 800, background: 'rgba(59,110,248,0.95)', color: 'white',
              padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 16px rgba(59,110,248,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            📍 Tap on the map to set your location
            <button onClick={() => setManualPinMode(false)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              borderRadius: 12, padding: '2px 8px', cursor: 'pointer', fontSize: 11,
            }}>Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS Fallback Button */}
      {!userPos && !manualPinMode && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setManualPinMode(true)}
          style={{
            position: 'absolute', bottom: 140, left: 16, zIndex: 700,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12,
            padding: '8px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            fontFamily: 'Inter, sans-serif', color: '#3b6ef8',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          📍 Set Location Manually
        </motion.button>
      )}

      <MapContainer
        center={center}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        {showSatellite ? (
          <WMSTileLayer
            url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
            layers="india3"
            format="image/png"
            transparent={true}
            attribution="ISRO Bhuvan"
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />
        )}

        {/* Heatmap circles */}
        {zones.map(zone => {
          const c = STATUS_COLORS[zone.status];
          const radii = zone.status === 'danger' ? [350, 250, 150] : zone.status === 'warn' ? [240, 160] : [140];
          return radii.map((r, i) => (
            <CircleMarker
              key={`heat-${zone.id}-${i}`}
              center={[zone.lat, zone.lng]}
              radius={r / 25}
              pathOptions={{
                fillColor: c.fill,
                fillOpacity: 0.07 - i * 0.015,
                color: 'transparent',
                weight: 0,
              }}
            />
          ));
        })}

        {/* Zone markers */}
        {zones.map(zone => (
          <ZoneMarker key={zone.id} zone={zone} />
        ))}

        {/* Hardware ESP32 Tags */}
        {hardwareDevices && Object.values(hardwareDevices).map(dev => (
          <HardwareDeviceMarker key={dev.device_id} device={dev} />
        ))}

        {/* User's real-time GPS location */}
        <UserLocationMarker trackedPhone={trackedPhone} />

        {/* Manual pin selection */}
        <ManualPinSelector enabled={manualPinMode} onPinSelect={handleManualPin} />

        {/* OSRM real road route */}
        <OSRMRoute route={osrmRoute} />

        {/* Old searched route (fallback) */}
        {!osrmRoute && <DestinationRoute route={searchedRoute} />}

        {/* Simulation moving marker */}
        <SimulationMarker position={simPosition} />

        {/* Critical Infrastructure Facilities */}
        {facilities && facilities.length > 0 && facilities.map(f => {
          const icon = L.divIcon({
            html: facilityIconHTML(f.type),
            className: 'facility-marker-icon',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          return (
            <Marker
              key={f.facility_id}
              position={[f.location.coordinates[1], f.location.coordinates[0]]}
              icon={icon}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.type}</div>
                  <div style={{ marginTop: 6, fontSize: 11 }}>
                    Capacity: {f.capacity}<br />
                    Available: <span style={{ color: f.available < 50 ? '#ef4444' : '#10c97c', fontWeight: 600 }}>{f.available}</span>
                  </div>
                  <div style={{ fontSize: 10, color: f.status === 'operational' ? '#10c97c' : '#ef4444', fontWeight: 600, marginTop: 4 }}>
                    ● {f.status?.toUpperCase() || 'OPERATIONAL'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Prediction zone */}
        <PredictionZone show={showPrediction} />

        {/* Safe route */}
        <SafeRoute blocked={routeBlocked} />
      </MapContainer>

      {/* Navigation Panel – Google Maps style bottom bar */}
      <NavigationPanel
        destination={selectedDest}
        userLocation={userPos}
        zones={zones}
        onRouteReady={(route) => setOsrmRoute(route)}
        onSimulationPosition={setSimPosition}
        onSubmitFeedback={onSubmitFeedback}
        onClose={() => {
          setSelectedDest(null);
          setOsrmRoute(null);
          setSimPosition(null);
        }}
      />

      {/* SOS Ripple overlay (HTML, not Leaflet) */}
      <SOSRippleOverlay active={sosActive} />

      {/* Satellite Toggle Button */}
      <motion.button
        className="satellite-toggle-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowSatellite(!showSatellite)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 700,
          background: showSatellite ? '#10c97c' : 'rgba(255, 255, 255, 0.9)',
          color: showSatellite ? 'white' : '#475569',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '13px'
        }}
      >
        <Satellite size={16} />
        {showSatellite ? 'Map View' : 'Bhuvan Satellite'}
      </motion.button>
    </div>
  );
}
