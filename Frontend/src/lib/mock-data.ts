// Mock geo + telemetry data for the Civilian Safety Zone Monitor demo.
// Centered around a fictional operations area (Delhi NCR coords for realism).

export type ZoneStatus = "safe" | "moderate" | "unsafe";

export interface Zone {
  id: string;
  name: string;
  status: ZoneStatus;
  // [lat, lng] polygon
  polygon: [number, number][];
  reason: string;
  updatedAt: string;
  prediction?: string;
}

export interface SosEvent {
  id: string;
  deviceId: string; // MAC-like
  lat: number;
  lng: number;
  time: string;
  status: "active" | "responding" | "resolved";
}

export interface AlertItem {
  id: string;
  kind: "hazard" | "sos" | "ai";
  title: string;
  detail: string;
  time: string;
}

export interface MeshDevice {
  id: string;
  hops: number;
  signal: number; // 0-100
  online: boolean;
}

export const CENTER: [number, number] = [28.6139, 77.209];

export const zones: Zone[] = [
  {
    id: "z1",
    name: "Sector 14 — Residential",
    status: "safe",
    polygon: [
      [28.622, 77.198],
      [28.622, 77.214],
      [28.612, 77.214],
      [28.612, 77.198],
    ],
    reason: "No active incidents. Patrol coverage 92%.",
    updatedAt: "2m ago",
    prediction: "Stable for next 4h",
  },
  {
    id: "z2",
    name: "Industrial Belt — North",
    status: "moderate",
    polygon: [
      [28.632, 77.214],
      [28.632, 77.232],
      [28.622, 77.232],
      [28.622, 77.214],
    ],
    reason: "Smoke plume detected by drone-2. Wind shifting south.",
    updatedAt: "just now",
    prediction: "May become unsafe in ~25 min",
  },
  {
    id: "z3",
    name: "Riverside Quadrant",
    status: "unsafe",
    polygon: [
      [28.612, 77.214],
      [28.612, 77.232],
      [28.602, 77.232],
      [28.602, 77.214],
    ],
    reason: "Active fire + 3 SOS pings in last 5 min.",
    updatedAt: "30s ago",
    prediction: "Escalating",
  },
  {
    id: "z4",
    name: "South Market",
    status: "moderate",
    polygon: [
      [28.602, 77.198],
      [28.602, 77.214],
      [28.592, 77.214],
      [28.592, 77.198],
    ],
    reason: "Crowd density above threshold.",
    updatedAt: "5m ago",
  },
  {
    id: "z5",
    name: "Sector 09 — Schools",
    status: "safe",
    polygon: [
      [28.622, 77.184],
      [28.622, 77.198],
      [28.612, 77.198],
      [28.612, 77.184],
    ],
    reason: "Cleared by Authority at 14:02.",
    updatedAt: "12m ago",
  },
];

export const sosEvents: SosEvent[] = [
  { id: "s1", deviceId: "SAFE-TAG A4:CF:12:9E:01", lat: 28.6075, lng: 77.222, time: "00:32 ago", status: "active" },
  { id: "s2", deviceId: "SAFE-TAG B8:27:EB:44:A1", lat: 28.6098, lng: 77.225, time: "01:10 ago", status: "responding" },
  { id: "s3", deviceId: "SAFE-TAG 5C:CF:7F:11:32", lat: 28.6042, lng: 77.219, time: "03:48 ago", status: "active" },
];

export const alerts: AlertItem[] = [
  { id: "a1", kind: "hazard", title: "Fire spread predicted", detail: "Riverside Quadrant — 25 min to spread north.", time: "30s" },
  { id: "a2", kind: "sos", title: "SOS received", detail: "Device A4:CF:12:9E:01 — 320m SE", time: "1m" },
  { id: "a3", kind: "ai", title: "Re-classification", detail: "Industrial Belt → Moderate", time: "2m" },
  { id: "a4", kind: "hazard", title: "Crowd density warning", detail: "South Market threshold exceeded", time: "5m" },
];

export const meshDevices: MeshDevice[] = [
  { id: "NODE-01", hops: 1, signal: 92, online: true },
  { id: "NODE-04", hops: 2, signal: 71, online: true },
  { id: "NODE-07", hops: 2, signal: 64, online: true },
  { id: "NODE-09", hops: 3, signal: 48, online: true },
  { id: "NODE-12", hops: 4, signal: 22, online: false },
];

export const blackBox = [
  { t: "14:32:11", e: "AI agent flagged Industrial Belt as Moderate" },
  { t: "14:31:45", e: "Drone-2 detected smoke plume (conf. 0.87)" },
  { t: "14:30:02", e: "SOS received from A4:CF:12:9E:01" },
  { t: "14:28:17", e: "Satellite pass complete (ISRO Cartosat)" },
  { t: "14:25:00", e: "Authority cleared Sector 09 — Schools" },
  { t: "14:21:33", e: "Mesh node NODE-12 went offline" },
  { t: "14:19:08", e: "Manual hazard added by Operator-2" },
];

export const safeRoute: [number, number][] = [
  [28.6139, 77.209],
  [28.6155, 77.205],
  [28.617, 77.2],
  [28.619, 77.193],
];
