# Time-series Pattern Analysis – Prediction Agent
import math
import time
from collections import defaultdict


def predict_risks(events: list, zones: list) -> list:
    """
    Predict future risk levels for each zone using
    Exponential Weighted Moving Average (EWMA) on event frequency.

    Args:
        events: List of event dicts
        zones: List of zone dicts

    Returns:
        List of prediction dicts {zone_id, risk_level, confidence, normalized_risk}
    """
    now = time.time() * 1000  # epoch millis
    predictions = []

    for zone in zones:
        center = zone.get("center", {})
        z_lat = center.get("lat", 0)
        z_lng = center.get("lng", 0)

        # Filter events near this zone
        zone_events = []
        for event in events:
            coords = event.get("location", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            e_lng, e_lat = coords[0], coords[1]
            dist = math.sqrt((z_lat - e_lat) ** 2 + (z_lng - e_lng) ** 2)
            if dist < 0.015:  # ~1.5km
                zone_events.append(event)

        # Time-series: event rates in different time windows
        windows_min = [5, 15, 30, 60]
        rates = []
        for w in windows_min:
            cutoff = now - w * 60 * 1000
            count = sum(
                1 for e in zone_events
                if _to_timestamp(e.get("timestamp")) > cutoff
            )
            rates.append(count / w)  # events per minute

        # EWMA with exponential decay weights
        weights = [0.4, 0.3, 0.2, 0.1]
        ewma = sum(r * w for r, w in zip(rates, weights))

        # Severity-weighted contribution from recent events
        recent_events = sorted(
            zone_events,
            key=lambda e: _to_timestamp(e.get("timestamp", 0)),
            reverse=True,
        )[:10]

        severity_score = sum(
            3 if e.get("severity") == "danger" else
            2 if e.get("severity") == "warn" else 1
            for e in recent_events
        )

        # Trend detection: compare recent vs older rate
        if len(rates) >= 2:
            trend = rates[0] - rates[1]  # positive = accelerating
        else:
            trend = 0

        # Composite risk score
        normalized_risk = min(1.0, ewma * 10 + severity_score / 30 + max(0, trend) * 5)

        # Determine risk level
        if normalized_risk > 0.7:
            risk_level = "HIGH"
        elif normalized_risk > 0.3:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Confidence based on data availability
        confidence = min(0.95, 0.5 + len(zone_events) * 0.05)

        predictions.append({
            "zone_id": zone.get("zone_id"),
            "risk_level": risk_level,
            "confidence": round(confidence, 2),
            "normalized_risk": round(normalized_risk, 3),
            "event_count": len(zone_events),
            "trend": "increasing" if trend > 0.01 else "decreasing" if trend < -0.01 else "stable",
        })

    return predictions


def _to_timestamp(ts):
    """Convert timestamp to epoch millis."""
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
