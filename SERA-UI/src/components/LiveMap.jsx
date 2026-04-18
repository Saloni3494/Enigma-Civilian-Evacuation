import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import './LiveMap.css';

const STATUS_COLORS = {
  safe:   { fill: '#10c97c', glow: 'rgba(16,201,124,0.35)' },
  warn:   { fill: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
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
          {[0,1,2].map(i => (
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
            position: 'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            width: 24, height: 24, borderRadius:'50%',
            background:'#ef4444',
            boxShadow:'0 0 20px rgba(239,68,68,0.8)',
            zIndex: 1,
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LiveMap({ zones, sosActive, routeBlocked, showPrediction, onZoneSelect }) {
  const center = [12.9716, 77.5946];

  return (
    <div className="map-root">
      <MapContainer
        center={center}
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />

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

        {/* Prediction zone */}
        <PredictionZone show={showPrediction} />

        {/* Safe route */}
        <SafeRoute blocked={routeBlocked} />
      </MapContainer>

      {/* SOS Ripple overlay (HTML, not Leaflet) */}
      <SOSRippleOverlay active={sosActive} />
    </div>
  );
}
