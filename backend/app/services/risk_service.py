"""Risk scoring engine: transparent weighted formula."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

from app.services.feature_service import FeatureVector


@dataclass
class MLResult:
    anomaly_score: float   # 0-1
    raw_score: float
    is_anomaly: bool
    model_loaded: bool


@dataclass
class RiskReason:
    factor: str
    points: float
    description: str


@dataclass
class RiskResult:
    score: float            # 0-100
    level: str              # low, medium, high, critical
    decision: str           # allow, mfa, block
    confidence: float       # 0-1
    reasons: List[RiskReason]
    ml_contributed: bool


_DEFAULT_WEIGHTS = {
    "ml_anomaly_signal": 25,
    "new_device": 15,
    "new_ip_subnet": 10,
    "failed_attempts_recent": 15,
    "unusual_hour": 8,
    "location_change": 12,
    "impossible_travel": 25,
    "browser_os_change": 5,
    "deviation_baseline": 2,
    "vpn_detected": 15,
    "tor_detected": 30,
    "proxy_detected": 15,
    "datacenter_ip": 10,
}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def compute_risk_score(
    features: FeatureVector,
    ml_result: MLResult,
    settings_override: Optional[Dict[str, Any]] = None,
) -> RiskResult:
    """
    Transparent weighted risk formula.

    Weights (configurable via settings_override):
    - ml_anomaly_signal: 30 points max
    - new_device: 15 points
    - new_ip_subnet: 10 points
    - failed_attempts_recent: 15 points max
    - unusual_hour: 8 points
    - location_change: 12 points (or 15 if impossible travel)
    - browser_os_change: 5 points
    - deviation_baseline: 2 points max

    Trust reductions: -5 for (known device + known IP + usual hour)
    Interaction bonus: +5 for (new device + country changed)
    """
    weights = {**_DEFAULT_WEIGHTS, **(settings_override or {})}
    reasons: List[RiskReason] = []
    score = 0.0

    # 1. ML anomaly signal (up to 30 pts)
    if ml_result.model_loaded and ml_result.anomaly_score > 0.0:
        ml_pts = _clamp(ml_result.anomaly_score * weights["ml_anomaly_signal"], 0, weights["ml_anomaly_signal"])
        score += ml_pts
        reasons.append(RiskReason(
            factor="ml_anomaly_signal",
            points=round(ml_pts, 2),
            description=f"ML model anomaly score: {ml_result.anomaly_score:.2f} (contributes {ml_pts:.1f} pts)",
        ))
        ml_contributed = True
    else:
        ml_contributed = False

    # 2. New device (15 pts)
    if features.is_new_device:
        pts = weights["new_device"]
        score += pts
        reasons.append(RiskReason(
            factor="new_device",
            points=pts,
            description="Login from a previously unseen device fingerprint",
        ))

    # 3. New IP subnet (10 pts)
    if features.is_new_ip_subnet:
        pts = weights["new_ip_subnet"]
        score += pts
        reasons.append(RiskReason(
            factor="new_ip_subnet",
            points=pts,
            description=f"Login from new IP subnet: {features.current_subnet}",
        ))

    # 4. Failed attempts (up to 15 pts)
    if features.failed_attempts_15min > 0 or features.failed_attempts_1h > 0:
        # Scaled: each attempt in 15m = 5pts (max 15), each in 1h = 2pts (max 10)
        pts_15m = min(features.failed_attempts_15min * 5, 10)
        pts_1h = min(features.failed_attempts_1h * 2, 5)
        pts = _clamp(pts_15m + pts_1h, 0, weights["failed_attempts_recent"])
        score += pts
        reasons.append(RiskReason(
            factor="failed_attempts_recent",
            points=round(pts, 2),
            description=(
                f"{features.failed_attempts_15min} failed attempts in last 15 min, "
                f"{features.failed_attempts_1h} in last 1 hour"
            ),
        ))

    # 5. Unusual hour (8 pts)
    if features.is_unusual_hour:
        pts = weights["unusual_hour"]
        score += pts
        reasons.append(RiskReason(
            factor="unusual_hour",
            points=pts,
            description=f"Login at unusual hour (outside 06:00-22:00)",
        ))

    # 6. Location change & Impossible Travel
    if features.impossible_travel_flag:
        pts = weights["impossible_travel"]
        score += pts
        speed_desc = f" ({features.calculated_speed_kmh:.0f} km/h)" if getattr(features, 'calculated_speed_kmh', 0) > 0 else ""
        time_desc = f" in {features.travel_time_hours*60:.0f} mins" if getattr(features, 'travel_time_hours', 0) > 0 else " in <2 hours"
        from_loc = f"{features.prev_city}, {features.prev_country}" if features.prev_country else "Last login"
        to_loc = f"{features.current_city or features.current_country}, {features.current_country}"
        reasons.append(RiskReason(
            factor="impossible_travel",
            points=pts,
            description=f"Impossible travel detected: {from_loc} to {to_loc} ({features.geo_distance_km:.0f} km{time_desc}{speed_desc})",
        ))
    elif features.country_changed:
        pts = weights["location_change"]
        score += pts
        prev = f" (previous: {features.prev_country})" if getattr(features, 'prev_country', None) else ""
        reasons.append(RiskReason(
            factor="location_change",
            points=pts,
            description=f"Login from new country: {features.current_country}{prev}",
        ))
    elif features.geo_distance_km > 500:
        pts = weights["location_change"] * 0.5
        score += pts
        reasons.append(RiskReason(
            factor="geo_distance",
            points=round(pts, 2),
            description=f"Login from unusual location: {features.geo_distance_km:.0f} km from last known location",
        ))

    # 7. Threat Intelligence: Tor, VPN, Proxy, Datacenter
    if getattr(features, "is_tor", False):
        pts = weights.get("tor_detected", 30)
        score += pts
        reasons.append(RiskReason(
            factor="tor_exit_node",
            points=pts,
            description="Confirmed Tor exit node / darknet anonymizer network",
        ))
    elif getattr(features, "is_vpn", False):
        pts = weights.get("vpn_detected", 15)
        score += pts
        reasons.append(RiskReason(
            factor="vpn_detected",
            points=pts,
            description=f"Commercial or private VPN connection detected ({getattr(features, 'isp', 'VPN Service')})",
        ))
    elif getattr(features, "is_proxy", False):
        pts = weights.get("proxy_detected", 15)
        score += pts
        reasons.append(RiskReason(
            factor="proxy_detected",
            points=pts,
            description="Public or forwarding proxy detected",
        ))

    if getattr(features, "is_datacenter", False) and not getattr(features, "is_tor", False):
        pts = weights.get("datacenter_ip", 10)
        score += pts
        reasons.append(RiskReason(
            factor="datacenter_hosting",
            points=pts,
            description=f"Hosting / cloud datacenter IP space ({getattr(features, 'isp', 'Cloud ASN')})",
        ))

    # 8. Browser/OS change (5 pts)
    if features.browser_changed or features.os_changed:
        pts = weights["browser_os_change"]
        score += pts
        changed_parts = []
        if features.browser_changed:
            changed_parts.append("browser")
        if features.os_changed:
            changed_parts.append("OS")
        reasons.append(RiskReason(
            factor="browser_os_change",
            points=pts,
            description=f"Changed {' and '.join(changed_parts)} from known baseline",
        ))

    # 9. Deviation from baseline (up to 2 pts)
    if features.deviation_from_baseline > 0.5:
        pts = _clamp(features.deviation_from_baseline * weights["deviation_baseline"], 0, weights["deviation_baseline"])
        score += pts
        reasons.append(RiskReason(
            factor="deviation_baseline",
            points=round(pts, 2),
            description=f"Login time deviates significantly from user's historical pattern",
        ))

    # --- Trust reductions ---
    if (
        not features.is_new_device
        and not features.is_new_ip_subnet
        and not features.is_unusual_hour
        and not getattr(features, "is_vpn", False)
        and not getattr(features, "is_tor", False)
    ):
        reduction = 5.0
        score = max(0.0, score - reduction)
        reasons.append(RiskReason(
            factor="trust_reduction",
            points=-reduction,
            description="Trusted context: known device, known IP subnet, and usual hour",
        ))

    # --- Interaction bonus ---
    if features.is_new_device and features.country_changed:
        bonus = 5.0
        score += bonus
        reasons.append(RiskReason(
            factor="new_device_country_combo",
            points=bonus,
            description="High-risk combination: new device AND new country",
        ))

    # Clamp to 0-100
    score = _clamp(score, 0.0, 100.0)

    # Risk level
    if score < 30:
        level = "low"
    elif score < 50:
        level = "medium"
    elif score < 70:
        level = "high"
    else:
        level = "critical"

    # Decision
    if score >= 70:
        decision = "block"
    elif score >= 30:
        decision = "mfa"
    else:
        decision = "allow"

    # Confidence: higher when model loaded and more signals present
    confidence = _clamp(0.5 + (len(reasons) * 0.05) + (0.2 if ml_contributed else 0.0), 0.5, 1.0)

    return RiskResult(
        score=round(score, 2),
        level=level,
        decision=decision,
        confidence=round(confidence, 3),
        reasons=reasons,
        ml_contributed=ml_contributed,
    )
