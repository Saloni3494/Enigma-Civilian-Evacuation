import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script demonstrates how flyover data can be extracted from raw OpenStreetMap (OSM) JSON/XML exports.
// In a production environment, this would run during the offline map tile compilation phase.

function extractFlyoversFromOSM(osmData) {
  const flyovers = [];
  const nodesMap = {};

  // 1. Build a lookup map of all nodes (intersections/points)
  for (const element of osmData.elements) {
    if (element.type === 'node') {
      nodesMap[element.id] = { lat: element.lat, lon: element.lon };
    }
  }

  // 2. Identify ways (roads) that are bridges/flyovers
  for (const element of osmData.elements) {
    if (element.type === 'way' && element.tags) {
      const isBridge = element.tags.bridge === 'yes' || element.tags.bridge === 'viaduct';
      const isElevated = parseInt(element.tags.layer || '0') >= 1;
      const isHighway = !!element.tags.highway;

      if ((isBridge || isElevated) && isHighway) {
        // This way is a flyover!
        
        // Calculate rough distance
        let distance = 0;
        const coords = [];
        for (let i = 0; i < element.nodes.length; i++) {
          const nodeId = element.nodes[i];
          const node = nodesMap[nodeId];
          if (node) {
            coords.push(node);
            if (i > 0) {
              const prevNode = nodesMap[element.nodes[i-1]];
              distance += getDistanceMeters(prevNode.lat, prevNode.lon, node.lat, node.lon);
            }
          }
        }

        if (coords.length >= 2) {
          flyovers.push({
            id: `flyover_osm_${element.id}`,
            name: element.tags.name || element.tags.ref || 'Unnamed Flyover',
            startCoords: [coords[0].lat, coords[0].lon],
            endCoords: [coords[coords.length - 1].lat, coords[coords.length - 1].lon],
            distance: Math.round(distance),
            elevation: parseInt(element.tags.layer || '1') * 5 // Rough estimate: 5 meters per layer
          });
        }
      }
    }
  }

  return flyovers;
}

// Haversine formula
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

console.log('Flyover extraction logic ready.');
// Example Usage:
// const rawOsm = JSON.parse(fs.readFileSync('pune_osm_export.json'));
// const extractedFlyovers = extractFlyoversFromOSM(rawOsm);
// console.log(extractedFlyovers);
