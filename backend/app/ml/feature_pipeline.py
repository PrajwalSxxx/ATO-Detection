"""Feature pipeline: convert FeatureVector to numpy array in correct order."""
from __future__ import annotations
import numpy as np
from app.services.feature_service import FeatureVector

FEATURE_NAMES = [
    "failed_attempts_15min",
    "failed_attempts_1h",
    "is_new_device",
    "is_new_ip",
    "is_new_ip_subnet",
    "login_hour_sin",
    "login_hour_cos",
    "is_unusual_hour",
    "logins_last_hour",
    "logins_last_24h",
    "seconds_since_last_login_log",
    "geo_distance_km",
    "country_changed",
    "impossible_travel_flag",
    "browser_changed",
    "os_changed",
    "ua_rarity_score",
    "deviation_from_baseline",
]


def feature_vector_to_array(fv: FeatureVector) -> np.ndarray:
    """Convert a FeatureVector to a numpy array in the canonical feature order."""
    values = [
        fv.failed_attempts_15min,
        fv.failed_attempts_1h,
        fv.is_new_device,
        fv.is_new_ip,
        fv.is_new_ip_subnet,
        fv.login_hour_sin,
        fv.login_hour_cos,
        fv.is_unusual_hour,
        fv.logins_last_hour,
        fv.logins_last_24h,
        fv.seconds_since_last_login_log,
        fv.geo_distance_km,
        fv.country_changed,
        fv.impossible_travel_flag,
        fv.browser_changed,
        fv.os_changed,
        fv.ua_rarity_score,
        fv.deviation_from_baseline,
    ]
    return np.array(values, dtype=np.float64).reshape(1, -1)


def dict_to_array(feature_dict: dict) -> np.ndarray:
    """Convert a dict of features to a numpy array in canonical order."""
    values = [float(feature_dict.get(name, 0.0)) for name in FEATURE_NAMES]
    return np.array(values, dtype=np.float64).reshape(1, -1)
