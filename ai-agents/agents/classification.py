# DBSCAN + Rule-based Zone Classification Agent
import math
from collections import defaultdict


def dbscan_cluster(points, eps=0.005, min_samples=2):
    """
    Simplified DBSCAN clustering on lat/lng coordinates.
    eps: ~500m in degrees
    """
    n = len(points)
    if n == 0:
        return []

    labels = [-1] * n
    cluster_id = 0
    visited = [False] * n

    def region_query(idx):
        neighbors = []
        for j in range(n):
            if j == idx:
                continue
            dist = math.sqrt(
                (points[idx][0] - points[j][0]) ** 2 +
                (points[idx][1] - points[j][1]) ** 2
            )
            if dist <= eps:
                neighbors.append(j)
        return neighbors

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        neighbors = region_query(i)

        if len(neighbors) < min_samples:
            labels[i] = -1  # noise
            continue

        labels[i] = cluster_id
        seed_set = list(neighbors)

        while seed_set:
            j = seed_set.pop(0)
            if not visited[j]:
                visited[j] = True
                j_neighbors = region_query(j)
                if len(j_neighbors) >= min_samples:
                    seed_set.extend(j_neighbors)
            if labels[j] == -1:
                labels[j] = cluster_id

        cluster_id += 1

    return labels


def classify_zones(events: list, zones: list) -> dict:
    """
    Classify zones as SAFE/MODERATE/UNSAFE based on event clustering.

    Args:
        events: List of event dicts with location.coordinates [lng, lat]
        zones: List of zone dicts with center {lat, lng}

    Returns:
        Dict mapping zone_id -> {status, risk_score, event_count}
    """
    # Group events by nearest zone
    zone_events = defaultdict(list)

    for event in events:
        loc = event.get("location", {})
        coords = loc.get("coordinates", [])
        if len(coords) < 2:
            continue
        e_lng, e_lat = coords[0], coords[1]

        nearest_zone = None
        min_dist = float("inf")
        for zone in zones:
            center = zone.get("center", {})
            z_lat = center.get("lat", 0)
            z_lng = center.get("lng", 0)
            dist = math.sqrt((z_lat - e_lat) ** 2 + (z_lng - e_lng) ** 2)
            if dist < min_dist:
                min_dist = dist
                nearest_zone = zone.get("zone_id")

        if nearest_zone and min_dist < 0.02:  # ~2km
            zone_events[nearest_zone].append(event)

    # Run DBSCAN on danger events for cluster detection
    all_danger_points = []
    for event in events:
        if event.get("severity") in ("danger",) or event.get("type") in ("SOS", "fire"):
            coords = event.get("location", {}).get("coordinates", [])
            if len(coords) >= 2:
                all_danger_points.append((coords[1], coords[0]))

    if all_danger_points:
        cluster_labels = dbscan_cluster(all_danger_points, eps=0.005, min_samples=2)
    else:
        cluster_labels = []

    # Classify each zone
    classifications = {}
    for zone in zones:
        zone_id = zone.get("zone_id")
        evts = zone_events.get(zone_id, [])

        danger_events = [
            e for e in evts
            if e.get("severity") == "danger" or e.get("type") in ("SOS", "fire")
        ]
        warn_events = [e for e in evts if e.get("severity") == "warn"]

        # Rule-based classification
        status = "SAFE"
        risk_score = zone.get("risk_score", 0)

        if len(danger_events) >= 3:
            status = "UNSAFE"
            risk_score = min(100, 70 + len(danger_events) * 5)
        elif len(danger_events) >= 1:
            status = "MODERATE"
            risk_score = min(80, 40 + len(danger_events) * 15 + len(warn_events) * 5)
        elif len(warn_events) >= 2:
            status = "MODERATE"
            risk_score = min(60, 30 + len(warn_events) * 10)
        else:
            status = "SAFE"
            risk_score = max(0, min(25, len(evts) * 5))

        # Recency boost
        import time
        now = time.time() * 1000
        recent = [
            e for e in danger_events
            if (now - _to_timestamp(e.get("timestamp"))) < 600000
        ]
        if recent:
            risk_score = min(100, risk_score + 15)

        classifications[zone_id] = {
            "status": status,
            "risk_score": risk_score,
            "event_count": len(evts),
        }

    return classifications


def _to_timestamp(ts):
    """Convert various timestamp formats to epoch millis."""
    if isinstance(ts, (int, float)):
        return ts
    if isinstance(ts, str):
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            return dt.timestamp() * 1000
        except Exception:
            return 0
    return 0
