"""Tests for risk scoring engine and feature computation."""
import pytest
from app.services.feature_service import FeatureVector
from app.services.risk_service import compute_risk_score, MLResult
from app.utils.geo_utils import haversine_distance, get_geo_for_ip
from app.utils.ip_utils import classify_ip, get_subnet_24


def make_sample_features(**kwargs) -> FeatureVector:
    """Helper to create a feature vector with default safe values."""
    defaults = {
        "failed_attempts_15min": 0,
        "failed_attempts_1h": 0,
        "is_new_device": 0,
        "is_new_ip": 0,
        "is_new_ip_subnet": 0,
        "login_hour_sin": 0.5,
        "login_hour_cos": 0.86,
        "is_unusual_hour": 0,
        "logins_last_hour": 1,
        "logins_last_24h": 3,
        "seconds_since_last_login_log": 10.0,
        "geo_distance_km": 5.0,
        "country_changed": 0,
        "impossible_travel_flag": 0,
        "browser_changed": 0,
        "os_changed": 0,
        "ua_rarity_score": 0.1,
        "deviation_from_baseline": 0.1,
        "low_history": False,
        "current_country": "USA",
        "current_subnet": "8.8.8",
    }
    defaults.update(kwargs)
    return FeatureVector(**defaults)


def test_low_risk_scenario():
    features = make_sample_features(is_new_device=0, is_new_ip_subnet=0, is_unusual_hour=0)
    ml_result = MLResult(anomaly_score=0.05, raw_score=0.2, is_anomaly=False, model_loaded=True)
    result = compute_risk_score(features, ml_result)

    assert result.decision == "allow"
    assert result.level == "low"
    assert result.score < 30
    assert any(r.factor == "trust_reduction" for r in result.reasons)


def test_high_risk_impossible_travel():
    features = make_sample_features(
        impossible_travel_flag=1,
        is_new_device=1,
        is_new_ip_subnet=1,
        country_changed=1,
        geo_distance_km=8000.0,
    )
    ml_result = MLResult(anomaly_score=0.9, raw_score=-0.4, is_anomaly=True, model_loaded=True)
    result = compute_risk_score(features, ml_result)

    assert result.decision == "block"
    assert result.level in ("high", "critical")
    assert result.score >= 70
    assert any(r.factor == "impossible_travel" for r in result.reasons)
    assert any(r.factor == "new_device_country_combo" for r in result.reasons)


def test_medium_risk_new_device_only():
    features = make_sample_features(
        is_new_device=1,
        is_new_ip_subnet=1,
        failed_attempts_15min=1,
    )
    ml_result = MLResult(anomaly_score=0.2, raw_score=0.1, is_anomaly=False, model_loaded=True)
    result = compute_risk_score(features, ml_result)

    # 15 (device) + 10 (subnet) + 5 (15m attempt) + ~6 (ml) = ~36 -> mfa
    assert result.decision in ("mfa", "block")
    assert result.score >= 30


def test_haversine_distance():
    # London (51.51, -0.13) to Paris (48.86, 2.35) is ~343 km
    dist = haversine_distance(51.51, -0.13, 48.86, 2.35)
    assert 330 < dist < 360

    # Same point distance is 0
    assert haversine_distance(10.0, 20.0, 10.0, 20.0) == 0.0


def test_geo_lookup():
    geo_us = get_geo_for_ip("8.8.8.8")
    assert geo_us["country"] == "USA"
    assert geo_us["is_known"] is True

    geo_private = get_geo_for_ip("192.168.1.1")
    assert geo_private["country"] == "Unknown"
    assert geo_private["is_known"] is False


def test_ip_classification():
    info = classify_ip("127.0.0.1")
    assert info["is_loopback"] is True

    info_pub = classify_ip("8.8.8.8")
    assert info_pub["is_global"] is True
    assert get_subnet_24("8.8.8.8") == "8.8.8"
