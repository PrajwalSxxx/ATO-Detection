"""
Automated Test Suite for New ITDR Security Features:
1. Real-time New-Device Fingerprinting & Tracking
2. Geolocation Change, Haversine Distance & Impossible Travel Calculation
3. IP Intelligence, VPN, Proxy, and Tor Exit Node Detection
4. Threat-weighted Risk Engine Evaluation
5. WebSocket Security Event Stream Authorization & Broadcast
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

from app.core.security import create_access_token, decode_token
from app.core.websocket_manager import WebSocketSecurityManager
from app.services.device_service import get_or_create_device
from app.services.geo_service import compute_distance_km
from app.services.ip_intelligence_service import (
    get_ip_intelligence,
    is_private_or_local,
    _KNOWN_TOR_IPS,
)
from app.services.telemetry_service import parse_telemetry
from app.services.risk_service import compute_risk_score, MLResult
from app.services.feature_service import FeatureVector, compute_features
from app.models.device import Device
from app.models.login_event import LoginEvent
from app.models.user import User


def make_test_features(**kwargs) -> FeatureVector:
    """Helper to create a FeatureVector with valid defaults."""
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
        "current_country": "India",
        "current_subnet": "103.21.244",
    }
    defaults.update(kwargs)
    return FeatureVector(**defaults)


class TestDeviceFingerprinting:
    """Test client & server-side device fingerprinting and recognition."""

    def test_telemetry_incorporates_client_fingerprint(self):
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15"
        client_fp = "client_canvas_webgl_hash_987654321"

        telemetry = parse_telemetry(
            ua,
            client_fingerprint=client_fp,
            client_device_category="mobile",
        )

        assert telemetry.device_category == "mobile"
        assert telemetry.client_fingerprint == client_fp
        assert len(telemetry.fingerprint_hash) == 64  # SHA-256

        # Telemetry with same client_fingerprint should generate identical hash
        telemetry2 = parse_telemetry(
            ua,
            client_fingerprint=client_fp,
            client_device_category="mobile",
        )
        assert telemetry.fingerprint_hash == telemetry2.fingerprint_hash

    def test_device_recognition_known_vs_new(self, db_session):
        user = db_session.query(User).filter(User.email == "testuser@test.com").first()
        assert user is not None

        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0"
        client_fp = "stable_desktop_canvas_hash_123"

        telemetry = parse_telemetry(ua, client_fingerprint=client_fp, client_device_category="desktop")

        # First login from this device -> must be recorded as NEW
        analysis1 = get_or_create_device(db_session, user.id, telemetry, "103.21.244.2")
        db_session.commit()

        assert analysis1.is_new_device is True
        assert analysis1.login_count == 1
        assert analysis1.device_type == "desktop"
        assert analysis1.device_category == "desktop"

        # Second login with the same fingerprint -> must be recognized as KNOWN / TRUSTED
        analysis2 = get_or_create_device(db_session, user.id, telemetry, "103.21.244.2")
        db_session.commit()

        assert analysis2.is_new_device is False
        assert analysis2.login_count == 2


class TestGeoAndImpossibleTravel:
    """Test geolocation change, distance calculation, and impossible travel speed."""

    def test_haversine_distance_calculation(self):
        # San Francisco (37.7749, -122.4194) to New York (40.7128, -74.0060)
        dist_km = compute_distance_km(37.7749, -122.4194, 40.7128, -74.0060)
        assert dist_km is not None
        # Great circle distance is ~4128 km
        assert 4000 < dist_km < 4300

    def test_same_location_distance_is_zero(self):
        dist_km = compute_distance_km(12.9716, 77.5946, 12.9716, 77.5946)
        assert dist_km == 0.0

    def test_impossible_travel_triggers_on_high_speed(self, db_session):
        user = db_session.query(User).filter(User.email == "testuser@test.com").first()
        assert user is not None

        now = datetime.now(timezone.utc)
        earlier = now - timedelta(minutes=15)

        # Record a previous login in Bengaluru, India
        prev_event = LoginEvent(
            id="prev-event-bengaluru",
            user_id=user.id,
            ip_address="103.21.244.2",
            city="Bengaluru",
            country="India",
            latitude=12.97,
            longitude=77.59,
            success=True,
            created_at=earlier,
        )
        db_session.add(prev_event)
        db_session.commit()

        # Current login 15 minutes later in Frankfurt, Germany (~7,400 km away)
        geo_frankfurt = {
            "country": "Germany",
            "city": "Frankfurt",
            "latitude": 50.11,
            "longitude": 8.68,
            "is_vpn": False,
            "is_tor": False,
            "is_proxy": False,
            "is_datacenter": False,
        }

        # Mock device analysis
        mock_device = MagicMock()
        mock_device.is_new_device = False

        features = compute_features(
            db_session,
            user.id,
            "185.220.101.4",
            geo_frankfurt,
            mock_device,
            login_time=now,
        )

        assert features.country_changed == 1
        assert features.geo_distance_km > 7000
        # 7400 km in 0.25 hours = ~29,600 km/h
        assert features.calculated_speed_kmh > 800
        assert features.impossible_travel_flag == 1


class TestIPIntelligenceAndThreatDetection:
    """Test Tor, VPN, Proxy, and private IP intelligence detection."""

    def test_tor_exit_node_detection(self):
        for tor_ip in list(_KNOWN_TOR_IPS)[:3]:
            result = get_ip_intelligence(tor_ip)
            assert result.is_tor is True
            assert result.is_vpn is True
            assert result.threat_level == "confirmed"
            assert result.tor_status == "detected"

    def test_vpn_datacenter_detection(self):
        vpn_ip = "185.220.101.4"
        # Test under simulation/mock mode
        result_sim = get_ip_intelligence(vpn_ip, is_simulation=True)
        assert result_sim.is_vpn is True
        assert result_sim.country == "Germany"

        # Test live fallback mode
        result = get_ip_intelligence(vpn_ip)
        assert result.is_vpn is True
        assert result.vpn_status in ("detected", "confirmed", "suspected")

    def test_private_local_ip_resolution(self):
        for local_ip in ["127.0.0.1", "192.168.1.100", "10.0.0.1"]:
            assert is_private_or_local(local_ip) is True
            result = get_ip_intelligence(local_ip)
            assert result.is_vpn is False
            assert result.is_tor is False
            assert result.provider == "local"

    def test_graceful_fallback_on_network_timeout(self):
        result = get_ip_intelligence("8.8.8.8", bypass_cache=True)
        # Must return a valid fallback result without crashing
        assert result is not None
        assert result.ip == "8.8.8.8"
        assert result.country != ""


class TestRiskEngineThreatWeights:
    """Test risk engine integration with new threat factors."""

    def test_tor_exit_node_triggers_high_risk_and_block(self):
        features = make_test_features(
            is_new_device=1,
            is_new_ip_subnet=1,
            country_changed=1,
            is_tor=True,
            is_vpn=True,
            is_datacenter=True,
        )

        ml_result = MLResult(anomaly_score=0.45, raw_score=0.1, is_anomaly=True, model_loaded=True)
        risk = compute_risk_score(features, ml_result)

        # Tor exit node (+30), country changed (+12), new device (+15), new IP subnet (+10), ML anomaly (+11.25) -> >= 70
        assert risk.score >= 70
        assert risk.decision == "block"
        assert any(r.factor == "tor_exit_node" for r in risk.reasons)

    def test_impossible_travel_adds_risk_points(self):
        features = make_test_features(
            is_new_device=0,
            is_new_ip_subnet=1,
            impossible_travel_flag=1,
            geo_distance_km=6000.0,
            calculated_speed_kmh=12000.0,
            travel_time_hours=0.5,
        )

        ml_result = MLResult(anomaly_score=0.0, raw_score=0.0, is_anomaly=False, model_loaded=True)
        risk = compute_risk_score(features, ml_result)

        assert any(r.factor == "impossible_travel" for r in risk.reasons)
        assert risk.score >= 25


class TestWebSocketSecurityManager:
    """Test WebSocket real-time security event manager logic and broadcast bridge."""

    def test_websocket_token_role_verification(self):
        # Admin token
        admin_token = create_access_token({"sub": "admin-1", "email": "admin@test.com", "role": "admin"})
        payload = decode_token(admin_token)
        assert payload.get("role") == "admin"

        # Analyst token
        analyst_token = create_access_token({"sub": "analyst-1", "email": "analyst@test.com", "role": "analyst"})
        payload = decode_token(analyst_token)
        assert payload.get("role") == "analyst"

        # Regular user token (should be denied)
        user_token = create_access_token({"sub": "user-1", "email": "user@test.com", "role": "user"})
        payload = decode_token(user_token)
        assert payload.get("role") not in ("admin", "analyst")

    def test_websocket_manager_active_connection_lifecycle(self):
        manager = WebSocketSecurityManager()
        ws_mock = MagicMock()

        # Connect
        manager.active_connections.append(ws_mock)
        assert ws_mock in manager.active_connections

        # Disconnect
        manager.disconnect(ws_mock)
        assert ws_mock not in manager.active_connections

    def test_websocket_manager_sync_broadcast_bridge(self):
        manager = WebSocketSecurityManager()
        test_event = {
            "type": "login_event",
            "email": "alice@test.com",
            "threats": {"is_vpn": True, "is_tor": False},
            "risk": {"score": 45, "decision": "mfa"},
        }
        # Safe sync call shouldn't crash even if no connections are open
        manager.broadcast_security_event(test_event)
