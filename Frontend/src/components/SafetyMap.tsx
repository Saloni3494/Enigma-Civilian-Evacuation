import { MapContainer, TileLayer, Polygon, Marker, Popup, CircleMarker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { CENTER, Zone, SosEvent, safeRoute } from "@/lib/mock-data";

// Fix default marker icon (leaflet + bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COLORS: Record<Zone["status"], string> = {
  safe: "hsl(142 71% 42%)",
  moderate: "hsl(38 95% 50%)",
  unsafe: "hsl(0 84% 55%)",
};

function FitToBounds() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

interface Props {
  zones: Zone[];
  sos?: SosEvent[];
  showRoute?: boolean;
  satellite?: boolean;
  onZoneClick?: (z: Zone) => void;
  onSosClick?: (s: SosEvent) => void;
  className?: string;
}

export default function SafetyMap({
  zones,
  sos = [],
  showRoute = false,
  satellite = false,
  onZoneClick,
  onSosClick,
  className,
}: Props) {
  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer center={CENTER} zoom={14} className="h-full w-full" zoomControl={false}>
        <FitToBounds />
        {satellite ? (
          <TileLayer
            attribution="Tiles © Esri — Satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {zones.map((z) => (
          <Polygon
            key={z.id}
            positions={z.polygon}
            pathOptions={{
              color: COLORS[z.status],
              weight: 2,
              fillColor: COLORS[z.status],
              fillOpacity: 0.28,
            }}
            eventHandlers={{ click: () => onZoneClick?.(z) }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{z.name}</div>
                <div className="capitalize">Status: {z.status}</div>
                <div className="text-xs opacity-80">{z.reason}</div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* User marker */}
        <CircleMarker
          center={CENTER}
          radius={8}
          pathOptions={{ color: "hsl(214 90% 42%)", fillColor: "hsl(214 95% 60%)", fillOpacity: 1, weight: 3 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>

        {/* SOS markers */}
        {sos.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={9}
            pathOptions={{ color: "hsl(350 90% 52%)", fillColor: "hsl(350 90% 52%)", fillOpacity: 0.9, weight: 2 }}
            eventHandlers={{ click: () => onSosClick?.(s) }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">SOS · {s.status}</div>
                <div className="text-xs">{s.deviceId}</div>
                <div className="text-xs opacity-80">{s.time}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {showRoute && (
          <Polyline
            positions={safeRoute}
            pathOptions={{ color: "hsl(214 90% 42%)", weight: 5, opacity: 0.9, dashArray: "1 0" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
