"""Geo service: cached IP-to-geo lookups integrated with IP intelligence."""
from __future__ import annotations
from typing import Optional
from app.services.ip_intelligence_service import get_ip_intelligence, clear_ip_intelligence_cache
from app.utils.geo_utils import haversine_distance


def get_geo(ip_address: str) -> dict:
    """
    Get geographic and threat intelligence for an IP address.
    Routes to IP intelligence service with provider selection, caching, and offline fallbacks.
    """
    result = get_ip_intelligence(ip_address)
    return result.to_dict()


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
    """Clear the geo and IP intelligence caches."""
    clear_ip_intelligence_cache()
