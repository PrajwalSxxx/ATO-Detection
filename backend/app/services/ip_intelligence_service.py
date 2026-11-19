"""IP Intelligence and Geolocation Service.

Provides real-time IP lookup with:
- Geolocation: Country, Region, City, Latitude, Longitude
- Network metadata: ISP, Organization, Autonomous System Number (ASN)
- Threat intelligence: VPN, Proxy, Tor Exit Node, Datacenter / Hosting detection
- Multiple providers: ip-api (live real-time), and deterministic mock (simulation only)
- LRU caching with TTL, graceful timeouts, and offline resilience
- Zero fabrication: Real lookups never fabricate fake cities or silently return mock data on failure.
"""
from __future__ import annotations
import ipaddress
import time
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

# In-memory IP cache: ip -> (data_dict, expire_timestamp)
_IP_CACHE: Dict[str, tuple[Dict[str, Any], float]] = {}
_MAX_CACHE_SIZE = 2000

# Known Tor exit node IP subnets / signatures for deterministic detection
_KNOWN_TOR_IPS = {
    "185.220.101.5",
    "185.220.101.6",
    "185.220.101.7",
    "185.220.100.240",
    "185.220.100.241",
    "198.98.56.146",
    "171.25.193.77",
    "171.25.193.78",
    "192.42.116.16",
    "192.42.116.17",
    "162.247.74.200",
    "162.247.74.201",
    "51.15.43.205",
}

# Known datacenter / VPN IP prefixes for simulation testing
_KNOWN_VPN_PREFIXES = [
    "185.220.",
    "198.51.100.",
    "203.0.113.",
    "104.28.",
    "199.195.",
]


@dataclass
class IPIntelligenceResult:
    ip: str
    country: str
    region: str
    city: str
    latitude: float
    longitude: float
    isp: str
    asn: str
    is_vpn: bool
    is_proxy: bool
    is_tor: bool
    is_datacenter: bool
    threat_level: str          # "confirmed", "suspected", "none", "unknown"
    vpn_status: str            # "confirmed", "suspected", "not_detected", "unavailable"
    proxy_status: str          # "detected", "not_detected", "unavailable"
    tor_status: str            # "detected", "not_detected", "unavailable"
    datacenter_status: str     # "detected", "not_detected", "unavailable"
    provider: str              # "ip-api", "mock", "local", "unavailable"
    geo_status: str            # "success", "local_network", "failed", "simulated", "unavailable"
    error_category: Optional[str] = None
    lookup_timestamp: float = 0.0
    cached: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def is_private_or_local(ip_str: str) -> bool:
    """Check if IP is loopback, link-local, private RFC1918, or multicast."""
    try:
        ip_obj = ipaddress.ip_address(ip_str.strip())
        return (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_reserved
            or ip_obj.is_link_local
            or ip_obj.is_multicast
        )
    except ValueError:
        return True


def _get_local_ip_result(ip_str: str) -> IPIntelligenceResult:
    """Return explicit local network context for private / loopback IP addresses."""
    return IPIntelligenceResult(
        ip=ip_str,
        country="Local Network",
        region="Internal Subnet",
        city="Private / Local",
        latitude=0.0,
        longitude=0.0,
        isp="Private LAN / Loopback",
        asn="AS0 Private",
        is_vpn=False,
        is_proxy=False,
        is_tor=False,
        is_datacenter=False,
        threat_level="none",
        vpn_status="not_detected",
        proxy_status="not_detected",
        tor_status="not_detected",
        datacenter_status="not_detected",
        provider="local",
        geo_status="local_network",
        lookup_timestamp=time.time(),
        cached=True,
    )


def _get_mock_intelligence(ip_str: str) -> IPIntelligenceResult:
    """
    Deterministic mock provider for simulation scenarios and offline automated unit testing.
    Marked explicitly as provider='mock' and geo_status='simulated'.
    """
    ip = ip_str.strip()

    is_tor = ip in _KNOWN_TOR_IPS or "tor" in ip.lower()
    is_vpn = (
        is_tor
        or any(ip.startswith(prefix) for prefix in _KNOWN_VPN_PREFIXES)
        or ip.endswith(".100")
        or ip.endswith(".200")
    )
    is_proxy = is_tor or is_vpn or ip.startswith("185.")

    # Geolocation mapping by octet
    parts = ip.split(".")
    first_octet = int(parts[0]) if len(parts) == 4 and parts[0].isdigit() else 100

    if first_octet == 133 or first_octet == 110:
        country, region, city, lat, lon = "Japan", "Tokyo", "Tokyo", 35.68, 139.69
        isp = "NTT Communications"
        asn = "AS2914"
    elif first_octet == 185:
        country, region, city, lat, lon = "Germany", "Hesse", "Frankfurt", 50.11, 8.68
        isp = "Hostkey Datacenter Services"
        asn = "AS57043"
    elif first_octet == 80:
        country, region, city, lat, lon = "United Kingdom", "England", "London", 51.51, -0.13
        isp = "British Telecommunications"
        asn = "AS2856"
    elif first_octet == 103:
        country, region, city, lat, lon = "India", "Karnataka", "Bengaluru", 12.97, 77.59
        isp = "Bharti Airtel Telecommunications"
        asn = "AS9498"
    elif first_octet == 8 or first_octet == 198:
        country, region, city, lat, lon = "United States", "California", "San Francisco", 37.77, -122.42
        isp = "Cloudflare Inc."
        asn = "AS13335"
    else:
        country, region, city, lat, lon = "United States", "New York", "New York", 40.71, -74.01
        isp = "Verizon Fios"
        asn = "AS701"

    threat_level = "confirmed" if is_tor else "suspected" if (is_vpn or is_proxy) else "none"

    return IPIntelligenceResult(
        ip=ip,
        country=country,
        region=region,
        city=city,
        latitude=lat,
        longitude=lon,
        isp=isp,
        asn=asn,
        is_vpn=is_vpn,
        is_proxy=is_proxy,
        is_tor=is_tor,
        is_datacenter=is_proxy or is_tor,
        threat_level=threat_level,
        vpn_status="confirmed" if (is_tor or is_proxy) else "suspected" if is_vpn else "not_detected",
        proxy_status="detected" if is_proxy else "not_detected",
        tor_status="detected" if is_tor else "not_detected",
        datacenter_status="detected" if (is_proxy or is_tor) else "not_detected",
        provider="mock",
        geo_status="simulated",
        lookup_timestamp=time.time(),
    )


def _fetch_from_ip_api(ip_str: str) -> Optional[IPIntelligenceResult]:
    """
    Fetch live geolocation and threat intelligence from ip-api.com.
    Queries proxy and hosting flags without requiring a paid API key.
    """
    url = (
        f"http://ip-api.com/json/{ip_str}"
        "?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
    )
    timeout = getattr(settings, "IP_INTELLIGENCE_TIMEOUT_SECONDS", 5.0)
    now = time.time()

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                print(f"[IPIntelligence] ip-api HTTP {resp.status_code} for {ip_str}")
                return None
            data = resp.json()
            if data.get("status") != "success":
                err_msg = data.get("message", "Provider returned fail status")
                print(f"[IPIntelligence] ip-api query failed for {ip_str}: {err_msg}")
                return None

            is_proxy = bool(data.get("proxy", False))
            is_hosting = bool(data.get("hosting", False))
            is_tor = ip_str in _KNOWN_TOR_IPS

            # Differentiate confirmed vs suspected VPN:
            # - Proxy or Tor -> confirmed VPN
            # - Hosting / Datacenter IP without confirmed proxy -> suspected VPN (e.g. Turbo VPN, NordVPN datacenter exit)
            if is_tor or is_proxy:
                vpn_status = "confirmed"
                is_vpn = True
                threat_level = "confirmed"
            elif is_hosting:
                vpn_status = "suspected"
                is_vpn = True
                threat_level = "suspected"
            else:
                vpn_status = "not_detected"
                is_vpn = False
                threat_level = "none"

            return IPIntelligenceResult(
                ip=ip_str,
                country=data.get("country") or "Lookup unavailable",
                region=data.get("regionName") or "",
                city=data.get("city") or "Lookup unavailable",
                latitude=float(data.get("lat") or 0.0),
                longitude=float(data.get("lon") or 0.0),
                isp=data.get("isp") or data.get("org") or "Standard Network",
                asn=data.get("as") or "AS Private",
                is_vpn=is_vpn,
                is_proxy=is_proxy,
                is_tor=is_tor,
                is_datacenter=is_hosting,
                threat_level=threat_level,
                vpn_status=vpn_status,
                proxy_status="detected" if is_proxy else "not_detected",
                tor_status="detected" if is_tor else "not_detected",
                datacenter_status="detected" if is_hosting else "not_detected",
                provider="ip-api",
                geo_status="success",
                lookup_timestamp=now,
            )
    except httpx.TimeoutException:
        print(f"[IPIntelligence] ip-api timeout ({timeout}s) for {ip_str}")
        return None
    except Exception as e:
        print(f"[IPIntelligence] ip-api lookup error for {ip_str}: {e}")
        return None


def get_ip_intelligence(
    ip_address: Optional[str] = None,
    bypass_cache: bool = False,
    is_simulation: bool = False,
) -> IPIntelligenceResult:
    """
    Get IP intelligence for an IP address with caching and verified provider statuses.

    ACCURACY GUARANTEE:
    - Never fabricates locations.
    - Never silently uses mock data when a live provider lookup fails.
    - Returns geo_status='unavailable' with clear error category on failure.
    - Only uses mock data if is_simulation=True or provider is explicitly configured as 'mock'.
    """
    ip_clean = (ip_address or "").strip()
    if not ip_clean:
        ip_clean = "127.0.0.1"

    now = time.time()

    # 1. If explicit simulation scenario
    if is_simulation:
        return _get_mock_intelligence(ip_clean)

    # 2. Check in-memory cache
    if not bypass_cache and ip_clean in _IP_CACHE:
        cached_dict, expire_at = _IP_CACHE[ip_clean]
        if now < expire_at:
            res = IPIntelligenceResult(**cached_dict)
            res.cached = True
            return res
        else:
            del _IP_CACHE[ip_clean]

    # 3. Check local / private IP (reject from external provider queries)
    if is_private_or_local(ip_clean):
        res = _get_local_ip_result(ip_clean)
        _store_in_cache(ip_clean, res)
        return res

    provider = (getattr(settings, "IP_INTELLIGENCE_PROVIDER", "ip-api") or "ip-api").lower()
    result: Optional[IPIntelligenceResult] = None

    # 4. Handle configured provider
    if provider == "mock":
        result = _get_mock_intelligence(ip_clean)
    else:
        # Default: Live ip-api.com query
        result = _fetch_from_ip_api(ip_clean)

    # 5. On provider lookup failure: DO NOT fabricate mock data!
    # Return structured unavailable result with real provider status, but retain
    # local static threat intelligence feed checks (known Tor / VPN ranges)
    if not result:
        known_tor = ip_clean in _KNOWN_TOR_IPS
        known_vpn = known_tor or any(ip_clean.startswith(prefix) for prefix in _KNOWN_VPN_PREFIXES)
        result = IPIntelligenceResult(
            ip=ip_clean,
            country="Lookup unavailable",
            region="",
            city="Lookup unavailable",
            latitude=0.0,
            longitude=0.0,
            isp="Unavailable",
            asn="Unavailable",
            is_vpn=known_vpn,
            is_proxy=known_vpn,
            is_tor=known_tor,
            is_datacenter=known_vpn,
            threat_level="confirmed" if (known_tor or known_vpn) else "unknown",
            vpn_status="confirmed" if known_vpn else "unavailable",
            proxy_status="detected" if known_vpn else "unavailable",
            tor_status="detected" if known_tor else "unavailable",
            datacenter_status="detected" if known_vpn else "unavailable",
            provider="ip-api",
            geo_status="unavailable",
            error_category="provider_unreachable_or_rate_limited",
            lookup_timestamp=now,
        )

    _store_in_cache(ip_clean, result)
    return result


def _store_in_cache(ip: str, res: IPIntelligenceResult) -> None:
    """Store result in LRU cache with TTL."""
    global _IP_CACHE
    if len(_IP_CACHE) >= _MAX_CACHE_SIZE:
        # Evict oldest 20%
        keys_to_remove = list(_IP_CACHE.keys())[: _MAX_CACHE_SIZE // 5]
        for k in keys_to_remove:
            _IP_CACHE.pop(k, None)

    ttl = getattr(settings, "IP_INTELLIGENCE_CACHE_TTL_SECONDS", 3600)
    _IP_CACHE[ip] = (res.to_dict(), time.time() + ttl)


def clear_ip_intelligence_cache() -> None:
    """Clear the in-memory cache (useful for testing or manual admin refresh)."""
    global _IP_CACHE
    _IP_CACHE.clear()
