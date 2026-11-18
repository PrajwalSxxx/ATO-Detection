"""Geo service: cached IP-to-geo lookups using mock provider."""
from __future__ import annotations
from typing import Optional
from app.utils.geo_utils import get_geo_for_ip, haversine_distance

_GEO_CACHE: dict[str, dict] = {}
_MAX_CACHE_SIZE = 1000


def get_geo(ip_address: str) -> dict:
    """
    Get geographic information for an IP address.
    Results are cached in memory (LRU-like with max size).
    """
    if ip_address in _GEO_CACHE:
        return _GEO_CACHE[ip_address]

    geo = get_geo_for_ip(ip_address)

    # Evict oldest entries if at capacity
    if len(_GEO_CACHE) >= _MAX_CACHE_SIZE:
        oldest_key = next(iter(_GEO_CACHE))
        del _GEO_CACHE[oldest_key]

    _GEO_CACHE[ip_address] = geo
    return geo


def compute_distance_km(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> float:
    """Compute haversine distance between two points. Returns 0.0 if any coord is None."""
    if any(c is None for c in [lat1, lon1, lat2, lon2]):
        return 0.0
    return haversine_distance(lat1, lon1, lat2, lon2)


def clear_cache() -> None:
    """Clear the geo cache (useful for testing)."""
    _GEO_CACHE.clear()
