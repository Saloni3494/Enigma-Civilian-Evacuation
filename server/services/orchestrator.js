// Central Orchestration Engine
// Event → Classification → Prediction → Safe Path → Merge → Update UI
import config from '../config.js';
import { getDB } from '../db/connection.js';
import { createEvent } from '../models/Event.js';
import { getAllZones, updateZoneStatus, toFrontendZone } from '../models/Zone.js';
import { createPrediction } from '../models/Prediction.js';
import { createRoute } from '../models/Route.js';
import { broadcastPipelineProgress, broadcastZoneUpdate, broadcastEvent, broadcastRouteUpdate } from '../websocket/wsManager.js';
import { checkZoneAlerts } from './alertEngine.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load road graph for A* pathfinding
let roadGraph = null;
try {
  const graphPath = join(__dirname, '..', 'data', 'roadGraph.json');
  roadGraph = JSON.parse(readFileSync(graphPath, 'utf-8'));
  console.log(`🗺️  Road graph loaded: ${Object.keys(roadGraph.nodes).length} nodes, ${roadGraph.edges.length} edges`);
} catch (e) {
  console.warn('⚠️  Road graph not loaded:', e.message);
}

// ========= JAVASCRIPT FALLBACK AI AGENTS =========
// These run when the Python FastAPI service is unavailable

// --- Classification Agent (DBSCAN-inspired + rule-based) ---
function classifyZones(events, zones) {
  const zoneEvents = {};

  // Group events by nearest zone
  for (const event of events) {
    if (!event.location?.coordinates) continue;
    const [eLng, eLat] = event.location.coordinates;

    let nearestZone = null;
    let minDist = Infinity;
    for (const zone of zones) {
      const dist = Math.sqrt(
        Math.pow(zone.center.lat - eLat, 2) + Math.pow(zone.center.lng - eLng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearestZone = zone.zone_id;
      }
    }

    if (nearestZone) {
      if (!zoneEvents[nearestZone]) zoneEvents[nearestZone] = [];
      zoneEvents[nearestZone].push(event);
    }
  }

  // Classify each zone
  const classifications = {};
  for (const zone of zones) {
    const events = zoneEvents[zone.zone_id] || [];
    const dangerEvents = events.filter(e => e.severity === 'danger' || e.type === 'SOS' || e.type === 'fire');
    const warnEvents = events.filter(e => e.severity === 'warn');

    // DBSCAN-inspired: cluster density determines status
    let status = 'SAFE';
    let riskScore = zone.risk_score || 0;

    if (dangerEvents.length >= 3) {
      status = 'UNSAFE';
      riskScore = Math.min(100, 70 + dangerEvents.length * 5);
    } else if (dangerEvents.length >= 1) {
      status = 'MODERATE';
      riskScore = Math.min(80, 40 + dangerEvents.length * 15 + warnEvents.length * 5);
    } else if (warnEvents.length >= 2) {
      status = 'MODERATE';
      riskScore = Math.min(60, 30 + warnEvents.length * 10);
    } else {
      status = 'SAFE';
      riskScore = Math.max(0, Math.min(25, events.length * 5));
    }

    // Recency boost: recent events increase risk
    const recentDanger = dangerEvents.filter(e => (Date.now() - new Date(e.timestamp).getTime()) < 600000);
    if (recentDanger.length > 0) {
      riskScore = Math.min(100, riskScore + 15);
    }

    classifications[zone.zone_id] = { status, risk_score: riskScore, event_count: events.length };
  }

  return classifications;
}

// --- Prediction Agent (Exponential Weighted Moving Average) ---
function predictRisks(events, zones) {
  const predictions = [];
  const now = Date.now();

  for (const zone of zones) {
    // Get events in/near this zone
    const zoneEvts = events.filter(e => {
      if (!e.location?.coordinates) return false;
      const [eLng, eLat] = e.location.coordinates;
      const dist = Math.sqrt(
        Math.pow(zone.center.lat - eLat, 2) + Math.pow(zone.center.lng - eLng, 2)
      );
      return dist < 0.015; // ~1.5km radius
    });

    // Time-series: compute event rate in recent windows
    const windows = [5, 15, 30, 60]; // minutes
    const rates = windows.map(w => {
      const cutoff = now - w * 60 * 1000;
      const count = zoneEvts.filter(e => new Date(e.timestamp).getTime() > cutoff).length;
      return count / w; // events per minute
    });

    // EWMA: weight recent windows more
    const weights = [0.4, 0.3, 0.2, 0.1];
    const ewma = rates.reduce((sum, rate, i) => sum + rate * weights[i], 0);

    // Severity-weighted rate
    const severityWeights = zoneEvts.slice(-10).reduce((sum, e) => {
      return sum + (e.severity === 'danger' ? 3 : e.severity === 'warn' ? 2 : 1);
    }, 0);

    const normalizedRisk = Math.min(1, ewma * 10 + severityWeights / 30);

    let riskLevel = 'LOW';
    if (normalizedRisk > 0.7) riskLevel = 'HIGH';
    else if (normalizedRisk > 0.3) riskLevel = 'MEDIUM';

    predictions.push({
      zone_id: zone.zone_id,
      risk_level: riskLevel,
      confidence: Math.min(0.95, 0.5 + zoneEvts.length * 0.05),
      normalized_risk: normalizedRisk,
    });
  }

  return predictions;
}

// --- Safe Path Agent (A* Algorithm) ---
function findSafePath(startCoord, endCoord, zoneStatuses) {
  if (!roadGraph) return null;

  const nodes = roadGraph.nodes;
  const edges = roadGraph.edges;
  const zoneMap = roadGraph.zone_mapping;

  // Find nearest graph nodes to start and end coordinates
  function findNearestNode(lat, lng) {
    let nearest = null;
    let minDist = Infinity;
    for (const [id, node] of Object.entries(nodes)) {
      const dist = Math.sqrt(Math.pow(node.lat - lat, 2) + Math.pow(node.lng - lng, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = id;
      }
    }
    return nearest;
  }

  const startNode = findNearestNode(startCoord.lat, startCoord.lng);
  const endNode = findNearestNode(endCoord.lat, endCoord.lng);

  if (!startNode || !endNode) return null;

  // Build adjacency list
  const adjacency = {};
  for (const nodeId of Object.keys(nodes)) {
    adjacency[nodeId] = [];
  }
  for (const edge of edges) {
    const fromZone = zoneMap[edge.from];
    const toZone = zoneMap[edge.to];

    // Risk weight based on zone status
    function riskWeight(zoneId) {
      if (!zoneId) return 1; // neutral
      const status = zoneStatuses[zoneId] || 'SAFE';
      if (status === 'UNSAFE') return 10; // heavy penalty
      if (status === 'MODERATE') return 3;
      return 1;
    }

    const fromRisk = riskWeight(fromZone);
    const toRisk = riskWeight(toZone);
    const avgRisk = (fromRisk + toRisk) / 2;
    const cost = edge.distance * avgRisk;

    adjacency[edge.from].push({ to: edge.to, cost, distance: edge.distance });
    adjacency[edge.to].push({ to: edge.from, cost, distance: edge.distance }); // bidirectional
  }

  // A* heuristic: haversine-like distance
  function heuristic(nodeId) {
    const node = nodes[nodeId];
    const end = nodes[endNode];
    return Math.sqrt(Math.pow(node.lat - end.lat, 2) + Math.pow(node.lng - end.lng, 2)) * 111000; // rough meters
  }

  // A* search
  const openSet = new Set([startNode]);
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  for (const nodeId of Object.keys(nodes)) {
    gScore[nodeId] = Infinity;
    fScore[nodeId] = Infinity;
  }
  gScore[startNode] = 0;
  fScore[startNode] = heuristic(startNode);

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let current = null;
    let minF = Infinity;
    for (const nodeId of openSet) {
      if (fScore[nodeId] < minF) {
        minF = fScore[nodeId];
        current = nodeId;
      }
    }

    if (current === endNode) {
      // Reconstruct path
      const path = [];
      let node = endNode;
      while (node) {
        path.unshift(node);
        node = cameFrom[node];
      }

      const coordinates = path.map(n => [nodes[n].lat, nodes[n].lng]);
      const totalDistance = gScore[endNode];

      // Calculate safety score (inverse of total risk encountered)
      const maxPossibleCost = path.length * 500 * 10; // worst case
      const safetyScore = Math.max(0, Math.min(100, 100 * (1 - totalDistance / maxPossibleCost)));

      return {
        path: coordinates,
        nodes: path,
        distance: totalDistance,
        safety_score: Math.round(safetyScore),
      };
    }

    openSet.delete(current);

    for (const neighbor of (adjacency[current] || [])) {
      const tentativeG = gScore[current] + neighbor.cost;
      if (tentativeG < gScore[neighbor.to]) {
        cameFrom[neighbor.to] = current;
        gScore[neighbor.to] = tentativeG;
        fScore[neighbor.to] = tentativeG + heuristic(neighbor.to);
        openSet.add(neighbor.to);
      }
    }
  }

  return null; // No path found
}

// ========= ORCHESTRATION PIPELINE =========

async function tryCallPythonAgent(endpoint, data) {
  try {
    const response = await fetch(`${config.AI_AGENTS_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (e) {
    return null; // Python agent unavailable, use JS fallback
  }
}

export async function runOrchestration(triggerEvent = null) {
  const db = getDB();
  console.log('🧠 Starting orchestration pipeline...');

  const startTime = Date.now();
  const results = { classification: null, prediction: null, safePath: null };

  try {
    // Step 0: Analyzing input
    broadcastPipelineProgress(0, true);

    // Get all recent events and zones
    const events = await db.collection('events').find(
      {},
      { sort: { timestamp: -1 }, limit: 100 }
    );
    const zones = await db.collection('zones').find({});

    // Note: The trigger event is already broadcast by the route handler (events.js / devices.js)
    // No duplicate broadcast needed here

    await sleep(600);

    // Step 1: Classification Agent
    broadcastPipelineProgress(1, true);
    console.log('  → Running classification agent...');

    // Try Python agent first, fallback to JS
    let classifications = await tryCallPythonAgent('/classify', { events, zones });
    if (!classifications) {
      classifications = classifyZones(events, zones);
    }
    results.classification = classifications;

    // Apply zone updates
    const updatedZones = [];
    for (const zone of zones) {
      const cls = classifications[zone.zone_id];
      if (cls && cls.status !== zone.status) {
        await updateZoneStatus(zone.zone_id, cls.status, cls.risk_score);
        await checkZoneAlerts(zone.zone_id, zone.status, cls.status, zone.name);
      }
      updatedZones.push({
        ...zone,
        status: cls ? cls.status : zone.status,
        risk_score: cls ? cls.risk_score : zone.risk_score,
      });
    }

    // Broadcast zone updates to frontend
    broadcastZoneUpdate(updatedZones.map(z => toFrontendZone(z)));

    await sleep(600);

    // Step 2: Prediction Agent
    broadcastPipelineProgress(2, true);
    console.log('  → Running prediction agent...');

    let predictions = await tryCallPythonAgent('/predict', { events, zones: updatedZones });
    if (!predictions) {
      predictions = predictRisks(events, updatedZones);
    }
    results.prediction = predictions;

    // Store predictions
    for (const pred of predictions) {
      await createPrediction(pred);
    }

    await sleep(600);

    // Step 3: Safe Path Agent
    broadcastPipelineProgress(3, true);
    console.log('  → Running safe path agent...');

    // Build current zone status map
    const zoneStatuses = {};
    for (const zone of updatedZones) {
      zoneStatuses[zone.zone_id] = zone.status;
    }

    // Calculate safe route from most dangerous zone to nearest safe zone
    const unsafeZone = updatedZones.find(z => z.status === 'UNSAFE');
    const safeZone = updatedZones.find(z => z.status === 'SAFE');

    if (unsafeZone && safeZone) {
      let safePathResult = await tryCallPythonAgent('/safe-path', {
        start: unsafeZone.center,
        end: safeZone.center,
        zone_statuses: zoneStatuses,
      });

      if (!safePathResult) {
        safePathResult = findSafePath(unsafeZone.center, safeZone.center, zoneStatuses);
      }

      if (safePathResult) {
        const route = await createRoute({
          start: unsafeZone.center,
          end: safeZone.center,
          path: safePathResult.path,
          safety_score: safePathResult.safety_score,
          distance: safePathResult.distance,
        });
        results.safePath = route;
        broadcastRouteUpdate(route);
      }
    }

    await sleep(600);

    // Step 4: Dispatching output
    broadcastPipelineProgress(4, true);
    console.log('  → Dispatching results...');

    await sleep(400);

    // Pipeline complete
    broadcastPipelineProgress(-1, false);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Orchestration complete in ${elapsed}ms`);

    return results;
  } catch (err) {
    console.error('❌ Orchestration error:', err);
    broadcastPipelineProgress(-1, false);
    throw err;
  }
}

// Re-export the JS A* for direct use by the routing endpoint
export { findSafePath };

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
