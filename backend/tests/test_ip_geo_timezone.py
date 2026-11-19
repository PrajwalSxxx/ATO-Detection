"""
Unit and integration tests for accurate IP detection, live geolocation,
threat indicator classification (VPN/Proxy/Tor/Datacenter), User-Agent parsing,
and UTC to Asia/Kolkata timezone handling.
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.core.ip_resolver import (
    resolve_client_ip,
    parse_ip_safely,
    is_ip_in_trusted_proxies,
    ClientIPInfo,
)
from app.services.ip_intelligence_service import (
    get_ip_intelligence,
    _fetch_from_ip_api,
    IPIntelligenceResult,
    clear_ip_intelligence_cache,
)
from app.services.telemetry_service import parse_telemetry
from app.schemas.login import LoginEventSchema


class DummyRequest:
    """Mock Starlette/FastAPI Request object for testing IP resolution."""
    def __init__(self, client_host=None, headers=None):
        self.client = MagicMock()
        if client_host:
            self.client.host = client_host
        else:
            self.client = None
        # Case-insensitive dict for headers
        raw_headers = headers or {}
        self.headers = {k.lower(): v for k, v in raw_headers.items()}
        # Add .get method that lowercases key
        self.headers = type("CaseInsensitiveHeaders", (), {
            "get": lambda s, k, default=None: raw_headers.get(k) or raw_headers.get(k.lower()) or raw_headers.get(k.title()) or default
        })()


# ─── 1. IP RESOLUTION TESTS ───────────────────────────────────────────────────

def test_resolve_direct_public_client_ip():
    """Direct connection with a public IP should be resolved and verified."""
    req = DummyRequest(client_host="103.21.244.2")
    info = resolve_client_ip(req)
    assert info.ip == "103.21.244.2"
    assert info.ip_address == "103.21.244.2"
    assert info.source == "direct"
    assert info.trust_status == "verified"
    assert info.is_public is True


def test_resolve_trusted_proxy_forwarded_ip():
    """When connecting from a trusted proxy (e.g. 127.0.0.1), parse X-Forwarded-For."""
    req = DummyRequest(
        client_host="127.0.0.1",
        headers={"X-Forwarded-For": "103.21.244.2, 127.0.0.1"},
    )
    info = resolve_client_ip(req)
    assert info.ip == "103.21.244.2"
    assert info.ip_address == "103.21.244.2"
    assert info.source == "trusted_proxy"
    assert info.trust_status == "verified"
    assert info.is_public is True


def test_reject_untrusted_proxy_spoofed_headers():
    """Untrusted client sending X-Forwarded-For must have spoofed header rejected."""
    req = DummyRequest(
        client_host="103.21.244.50",  # Not in trusted proxies
        headers={"X-Forwarded-For": "1.1.1.1, 8.8.8.8"},
    )
    info = resolve_client_ip(req)
    # Must use the direct client host, rejecting the spoofed header
    assert info.ip == "103.21.244.50"
    assert info.ip_address == "103.21.244.50"
    assert info.source == "direct"
    assert info.trust_status == "verified"


def test_resolve_loopback_connection_without_client_reported_ip():
    """Loopback connection without dev fallback returns 127.0.0.1 with loopback source."""
    req = DummyRequest(client_host="127.0.0.1")
    info = resolve_client_ip(req, client_reported_ip=None)
    assert info.ip == "127.0.0.1"
    assert info.ip_address == "127.0.0.1"
    assert info.source in ("loopback", "loopback_dev")
    assert info.trust_status in ("verified", "loopback")
    assert info.is_public is False


def test_resolve_loopback_with_client_reported_ip():
    """Development mode public IP discovery returns unverified client-reported IP."""
    req = DummyRequest(client_host="127.0.0.1")
    info = resolve_client_ip(req, client_reported_ip="103.21.244.2")
    assert info.ip == "103.21.244.2"
    assert info.ip_address == "103.21.244.2"
    assert info.source == "client_reported"
    assert info.trust_status == "unverified"
    assert info.is_public is True


def test_parse_ip_safely_ipv4_and_ipv6():
    """Verify safe parsing of valid and invalid IPv4 and IPv6 strings."""
    assert parse_ip_safely("192.0.2.1") is not None
    assert parse_ip_safely("2001:db8::1") is not None
    assert parse_ip_safely("invalid-ip") is None
    assert parse_ip_safely("") is None
    assert parse_ip_safely(None) is None


# ─── 2. GEOLOCATION & THREAT INTELLIGENCE TESTS ──────────────────────────────

def test_ip_intelligence_local_network_no_external_call():
    """Local network and loopback IPs should return immediately without external HTTP calls."""
    clear_ip_intelligence_cache()
    res = get_ip_intelligence("127.0.0.1", bypass_cache=True)
    assert res.geo_status == "local_network"
    assert res.provider == "local"
    assert res.is_vpn is False
    assert res.vpn_status == "not_detected"
    assert res.is_tor is False
    assert res.is_proxy is False


def test_ip_intelligence_private_ip_range():
    """RFC1918 private IPs return local_network status."""
    res = get_ip_intelligence("192.168.1.100", bypass_cache=True)
    assert res.geo_status == "local_network"
    assert res.is_vpn is False


def test_ip_intelligence_provider_failure_does_not_fabricate_mock_data():
    """When external lookup fails, service returns geo_status='unavailable', not fake data."""
    clear_ip_intelligence_cache()
    with patch("httpx.Client.get", side_effect=Exception("Connection timed out")):
        res = get_ip_intelligence("103.21.244.88", bypass_cache=True)
        assert res.geo_status == "unavailable"
        assert res.city == "Lookup unavailable"
        assert res.country == "Lookup unavailable"
        assert res.error_category == "provider_unreachable_or_rate_limited"


def test_ip_threat_classification_confirmed_vpn():
    """Commercial VPN providers (proxy=true) should be classified with vpn_status='confirmed'."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": "success",
        "country": "Netherlands",
        "regionName": "North Holland",
        "city": "Amsterdam",
        "lat": 52.37,
        "lon": 4.89,
        "isp": "NordVPN / M247 Europe",
        "as": "AS9009 M247 Ltd",
        "proxy": True,
        "hosting": True,
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        res = _fetch_from_ip_api("185.156.46.10")
        assert res is not None
        assert res.is_vpn is True
        assert res.vpn_status == "confirmed"
        assert res.is_proxy is True
        assert res.is_datacenter is True
        assert res.geo_status == "success"


def test_ip_threat_classification_suspected_vpn_hosting():
    """Datacenter / hosting providers without proxy flag should be classified with vpn_status='suspected'."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": "success",
        "country": "Germany",
        "regionName": "Hesse",
        "city": "Frankfurt",
        "lat": 50.11,
        "lon": 8.68,
        "isp": "DigitalOcean, LLC",
        "as": "AS14061 DigitalOcean, LLC",
        "proxy": False,
        "hosting": True,
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        res = _fetch_from_ip_api("159.65.120.30")
        assert res is not None
        assert res.is_vpn is True
        assert res.vpn_status == "suspected"
        assert res.is_datacenter is True
        assert res.datacenter_status == "detected"


def test_ip_threat_classification_clean_residential():
    """Standard residential ISP should be classified as clean with vpn_status='not_detected'."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": "success",
        "country": "India",
        "regionName": "Karnataka",
        "city": "Bengaluru",
        "lat": 12.97,
        "lon": 77.59,
        "isp": "Airtel Broadband",
        "as": "AS24560 Bharti Airtel Ltd",
        "proxy": False,
        "hosting": False,
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        res = _fetch_from_ip_api("122.161.45.10")
        assert res is not None
        assert res.is_vpn is False
        assert res.vpn_status == "not_detected"
        assert res.is_tor is False
        assert res.is_proxy is False
        assert res.is_datacenter is False


# ─── 3. USER-AGENT & TELEMETRY PARSING TESTS ────────────────────────────────

def test_telemetry_extract_chrome_windows_11():
    """Extract browser and OS from modern Chrome User-Agent."""
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    telemetry = parse_telemetry(user_agent_string=ua)
    assert telemetry.browser_name == "Chrome"
    assert "131" in telemetry.browser_version
    assert "Windows" in telemetry.os_name
    assert telemetry.device_category == "desktop"


def test_telemetry_extract_edge_windows():
    """Extract Microsoft Edge on Windows."""
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.86"
    telemetry = parse_telemetry(user_agent_string=ua)
    assert telemetry.browser_name == "Edge"
    assert "131" in telemetry.browser_version
    assert "Windows" in telemetry.os_name


def test_telemetry_extract_firefox_linux():
    """Extract Mozilla Firefox on Linux."""
    ua = "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0"
    telemetry = parse_telemetry(user_agent_string=ua)
    assert telemetry.browser_name == "Firefox"
    assert "132" in telemetry.browser_version
    assert "Linux" in telemetry.os_name


def test_telemetry_extract_safari_ios():
    """Extract Mobile Safari on iPhone."""
    ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    telemetry = parse_telemetry(user_agent_string=ua)
    assert "Safari" in telemetry.browser_name
    assert telemetry.os_name == "iOS"
    assert telemetry.device_category == "mobile"


def test_telemetry_empty_or_unknown_user_agent():
    """Graceful fallback for missing User-Agent."""
    telemetry = parse_telemetry(user_agent_string=None)
    assert telemetry.browser_name in ("Unknown", "Other")
    assert telemetry.os_name in ("Unknown", "Other")
    assert telemetry.device_category in ("desktop", "other")


# ─── 4. TIMESTAMP & ASIA/KOLKATA TIMEZONE TESTS ─────────────────────────────

def test_pydantic_schema_serializes_explicit_utc_z():
    """Ensure LoginEventSchema serializes created_at with explicit 'Z' UTC indicator."""
    now_utc = datetime(2026, 11, 19, 18, 57, 18, tzinfo=timezone.utc)
    evt = LoginEventSchema(
        id="test-event-1",
        user_id="user-123",
        ip_address="203.0.113.1",
        success=True,
        mfa_required=False,
        mfa_completed=False,
        is_new_device=False,
        is_new_ip=False,
        created_at=now_utc,
    )
    assert evt.serialize_created_at(now_utc, None) == "2026-11-19T18:57:18Z"


def test_utc_to_ist_offset_and_midnight_transition():
    """
    Verify that UTC 18:57:18 on 19 Nov converts to 00:27:18 on 20 Nov in Asia/Kolkata (+5:30).
    """
    utc_time = datetime(2026, 11, 19, 18, 57, 18, tzinfo=timezone.utc)
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    ist_time = utc_time.astimezone(ist_tz)

    assert ist_time.year == 2026
    assert ist_time.month == 11
    assert ist_time.day == 20  # Rolled over past midnight!
    assert ist_time.hour == 0
    assert ist_time.minute == 27
    assert ist_time.second == 18
