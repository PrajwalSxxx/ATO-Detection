"""Feature extraction service: compute all 18 features from login context."""
from __future__ import annotations
import math
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.login_event import LoginEvent
from app.services.device_service import DeviceAnalysis
from app.services.geo_service import compute_distance_km


@dataclass
class FeatureVector:
    # Failed attempts
    failed_attempts_15min: int
    failed_attempts_1h: int
    # Device signals
    is_new_device: int         # 0/1
    is_new_ip: int             # 0/1
    is_new_ip_subnet: int      # 0/1
    # Time features
    login_hour_sin: float
    login_hour_cos: float
    is_unusual_hour: int       # 0/1 (outside 06-22)
    # Volume
    logins_last_hour: int
    logins_last_24h: int
    # Time since last login
    seconds_since_last_login_log: float
    # Location
    geo_distance_km: float
    country_changed: int        # 0/1
    impossible_travel_flag: int # 0/1
    # Browser/OS
    browser_changed: int        # 0/1
    os_changed: int             # 0/1
    # Rarity
    ua_rarity_score: float      # 0-1 (inverse of frequency)
    # Deviation
    deviation_from_baseline: float

    # Cold-start flag (not a feature but metadata)
    low_history: bool = False
    # Current context & threat intelligence metadata
    current_country: Optional[str] = None
    current_city: Optional[str] = None
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None
    current_ip: Optional[str] = None
    current_subnet: Optional[str] = None
    prev_country: Optional[str] = None
    prev_city: Optional[str] = None
    calculated_speed_kmh: float = 0.0
    travel_time_hours: float = 0.0
    is_vpn: bool = False
    is_proxy: bool = False
    is_tor: bool = False
    is_datacenter: bool = False
    threat_level: str = "none"
    isp: Optional[str] = None
    asn: Optional[str] = None


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def compute_features(
    db: Session,
    user_id: str,
    ip_address: str,
    geo: dict,
    device_analysis: DeviceAnalysis,
    login_time: Optional[datetime] = None,
) -> FeatureVector:
    """
    Compute all features from the user's login history.
    Handles cold start (< 5 historical logins).
    """
    now = _to_utc(login_time or datetime.now(timezone.utc))
    t_15m = now - timedelta(minutes=15)
    t_1h = now - timedelta(hours=1)
    t_24h = now - timedelta(hours=24)
    t_30d = now - timedelta(days=30)

    # --- Failed attempts ---
    failed_15m = (
        db.query(func.count(LoginEvent.id))
        .filter(
            LoginEvent.user_id == user_id,
            LoginEvent.success == False,
            LoginEvent.created_at >= t_15m,
            LoginEvent.created_at < now,
        )
        .scalar() or 0
    )
    failed_1h = (
        db.query(func.count(LoginEvent.id))
        .filter(
            LoginEvent.user_id == user_id,
            LoginEvent.success == False,
            LoginEvent.created_at >= t_1h,
            LoginEvent.created_at < now,
        )
        .scalar() or 0
    )

    # --- Login volume ---
    logins_last_hour = (
        db.query(func.count(LoginEvent.id))
        .filter(
            LoginEvent.user_id == user_id,
            LoginEvent.created_at >= t_1h,
            LoginEvent.created_at < now,
        )
        .scalar() or 0
    )
    logins_last_24h = (
        db.query(func.count(LoginEvent.id))
        .filter(
            LoginEvent.user_id == user_id,
            LoginEvent.created_at >= t_24h,
            LoginEvent.created_at < now,
        )
        .scalar() or 0
    )

    # --- Historical login events (30 days) ---
    historical = (
        db.query(LoginEvent)
        .filter(
            LoginEvent.user_id == user_id,
            LoginEvent.success == True,
            LoginEvent.created_at >= t_30d,
            LoginEvent.created_at < now,
        )
        .order_by(LoginEvent.created_at.desc())
        .limit(200)
        .all()
    )

    low_history = len(historical) < 5

    # --- Last login time ---
    last_login = historical[0] if historical else None
    if last_login:
        delta_secs = (now - _to_utc(last_login.created_at)).total_seconds()
        seconds_since_last_login_log = math.log1p(max(delta_secs, 0))
    else:
        seconds_since_last_login_log = math.log1p(86400 * 30)  # 30 days default

    # --- IP novelty ---
    known_ips = {e.ip_address for e in historical}
    is_new_ip = int(ip_address not in known_ips)

    from app.utils.ip_utils import get_subnet_24
    current_subnet = get_subnet_24(ip_address)
    known_subnets = {get_subnet_24(e.ip_address) for e in historical}
    is_new_ip_subnet = int(current_subnet not in known_subnets)

    # --- Geo / location & IP Intelligence ---
    current_country = geo.get("country", "Unknown")
    current_city = geo.get("city", "Unknown")
    current_lat = geo.get("latitude", 0.0)
    current_lon = geo.get("longitude", 0.0)

    # IP Intelligence signals
    is_vpn = bool(geo.get("is_vpn", False))
    is_proxy = bool(geo.get("is_proxy", False))
    is_tor = bool(geo.get("is_tor", False))
    is_datacenter = bool(geo.get("is_datacenter", False))
    threat_level = str(geo.get("threat_level", "none"))
    isp = geo.get("isp")
    asn = geo.get("asn")

    # Country change
    known_countries = {e.country for e in historical if e.country and e.country not in ("Unknown", "Local Network")}
    country_changed = int(bool(known_countries) and current_country not in known_countries and current_country not in ("Unknown", "Local Network"))

    # Geo distance from last login & velocity analysis
    geo_distance_km = 0.0
    impossible_travel_flag = 0
    calculated_speed_kmh = 0.0
    travel_time_hours = 0.0
    prev_country = last_login.country if last_login else None
    prev_city = last_login.city if last_login else None

    if last_login and last_login.latitude and last_login.longitude and current_lat and current_lon:
        geo_distance_km = compute_distance_km(
            last_login.latitude, last_login.longitude, current_lat, current_lon
        )
        time_gap_seconds = max((now - _to_utc(last_login.created_at)).total_seconds(), 1.0)
        travel_time_hours = time_gap_seconds / 3600.0
        calculated_speed_kmh = (geo_distance_km / travel_time_hours) if travel_time_hours > 0 else 0.0

        # Impossible travel: > 500 km and speed > 800 km/h (commercial aircraft speed limit)
        if geo_distance_km > 500 and calculated_speed_kmh > 800:
            impossible_travel_flag = 1
    elif last_login and prev_country and current_country and prev_country != current_country and prev_country not in ("Unknown", "Local Network"):
        # Country changed without valid coordinates
        country_changed = 1

    # --- Time features ---
    hour = now.hour
    login_hour_sin = math.sin(2 * math.pi * hour / 24)
    login_hour_cos = math.cos(2 * math.pi * hour / 24)
    is_unusual_hour = int(hour < 6 or hour > 22)

    # --- Baseline deviation ---
    if not low_history:
        baseline_hours = [e.created_at.hour for e in historical]
        avg_hour = sum(baseline_hours) / len(baseline_hours)
        # Circular mean distance
        deviation_from_baseline = abs(hour - avg_hour)
        if deviation_from_baseline > 12:
            deviation_from_baseline = 24 - deviation_from_baseline
        deviation_from_baseline = deviation_from_baseline / 12.0  # Normalize 0-1
    else:
        deviation_from_baseline = 0.0

    # --- UA rarity score ---
    if not low_history:
        ua_counts: dict[str, int] = {}
        for e in historical:
            ua = e.user_agent or "unknown"
            ua_counts[ua] = ua_counts.get(ua, 0) + 1
        total = len(historical)
        current_ua = device_analysis.browser_name + "|" + device_analysis.os_name
        # Find matching events
        matching = sum(v for k, v in ua_counts.items() if device_analysis.browser_name in k)
        ua_rarity_score = 1.0 - (matching / total) if total > 0 else 1.0
    else:
        ua_rarity_score = 0.5

    return FeatureVector(
        failed_attempts_15min=failed_15m,
        failed_attempts_1h=failed_1h,
        is_new_device=int(device_analysis.is_new_device),
        is_new_ip=is_new_ip,
        is_new_ip_subnet=is_new_ip_subnet,
        login_hour_sin=login_hour_sin,
        login_hour_cos=login_hour_cos,
        is_unusual_hour=is_unusual_hour,
        logins_last_hour=logins_last_hour,
        logins_last_24h=logins_last_24h,
        seconds_since_last_login_log=seconds_since_last_login_log,
        geo_distance_km=geo_distance_km,
        country_changed=country_changed,
        impossible_travel_flag=impossible_travel_flag,
        browser_changed=int(device_analysis.browser_changed),
        os_changed=int(device_analysis.os_changed),
        ua_rarity_score=ua_rarity_score,
        deviation_from_baseline=deviation_from_baseline,
        low_history=low_history,
        current_country=current_country,
        current_city=current_city,
        current_lat=current_lat,
        current_lon=current_lon,
        current_ip=ip_address,
        current_subnet=current_subnet,
        prev_country=prev_country,
        prev_city=prev_city,
        calculated_speed_kmh=calculated_speed_kmh,
        travel_time_hours=travel_time_hours,
        is_vpn=is_vpn,
        is_proxy=is_proxy,
        is_tor=is_tor,
        is_datacenter=is_datacenter,
        threat_level=threat_level,
        isp=isp,
        asn=asn,
    )
