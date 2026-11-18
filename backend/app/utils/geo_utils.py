"""Geo utilities with mock IP-to-geo mapping and haversine distance."""
import math
import ipaddress
from typing import Optional

# Mock IP range → geo mapping
_GEO_MAP = [
    # (network_prefix, first_octet_range, country, region, city, lat, lon)
    (1,   "Australia", "New South Wales", "Sydney", -33.87, 151.21),
    (8,   "USA", "California", "San Jose", 37.34, -121.89),
    (14,  "USA", "New York", "New York City", 40.71, -74.01),
    (23,  "USA", "Texas", "Dallas", 32.78, -96.80),
    (31,  "Germany", "Bavaria", "Munich", 48.14, 11.58),
    (37,  "Russia", "Moscow Oblast", "Moscow", 55.75, 37.62),
    (46,  "China", "Beijing", "Beijing", 39.91, 116.39),
    (58,  "China", "Guangdong", "Shenzhen", 22.54, 114.06),
    (66,  "USA", "Washington", "Seattle", 47.61, -122.33),
    (74,  "USA", "Illinois", "Chicago", 41.85, -87.65),
    (80,  "UK", "England", "London", 51.51, -0.13),
    (85,  "Netherlands", "North Holland", "Amsterdam", 52.37, 4.90),
    (91,  "France", "Ile-de-France", "Paris", 48.86, 2.35),
    (103, "India", "Karnataka", "Bangalore", 12.97, 77.59),
    (110, "Japan", "Tokyo", "Tokyo", 35.68, 139.69),
    (117, "South Korea", "Seoul", "Seoul", 37.57, 126.98),
    (122, "Australia", "Victoria", "Melbourne", -37.81, 144.96),
    (130, "Brazil", "São Paulo", "São Paulo", -23.55, -46.63),
    (139, "Singapore", "Central Region", "Singapore", 1.29, 103.85),
    (159, "Russia", "Saint Petersburg City", "Saint Petersburg", 59.93, 30.32),
    (185, "Sweden", "Stockholm County", "Stockholm", 59.33, 18.07),
    (194, "Ireland", "Leinster", "Dublin", 53.33, -6.25),
    (203, "Australia", "Queensland", "Brisbane", -27.47, 153.03),
    (213, "Spain", "Community of Madrid", "Madrid", 40.42, -3.70),
]

_OCTET_TO_GEO = {entry[0]: entry[1:] for entry in _GEO_MAP}


def _get_first_octet(ip_str: str) -> Optional[int]:
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.version == 4:
            return int(str(ip).split('.')[0])
        return None
    except ValueError:
        return None


def get_geo_for_ip(ip_str: str) -> dict:
    """Mock geo lookup. Returns location data based on IP first octet."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_reserved:
            return _unknown_geo()
    except ValueError:
        return _unknown_geo()

    first = _get_first_octet(ip_str)
    if first is None:
        return _unknown_geo()

    if first in _OCTET_TO_GEO:
        country, region, city, lat, lon = _OCTET_TO_GEO[first]
        return {
            "country": country,
            "region": region,
            "city": city,
            "latitude": lat,
            "longitude": lon,
            "is_known": True,
        }

    # Closest match
    closest = min(_OCTET_TO_GEO.keys(), key=lambda k: abs(k - first))
    country, region, city, lat, lon = _OCTET_TO_GEO[closest]
    return {
        "country": country,
        "region": region,
        "city": city,
        "latitude": lat,
        "longitude": lon,
        "is_known": True,
    }


def _unknown_geo() -> dict:
    return {
        "country": "Unknown",
        "region": "Unknown",
        "city": "Unknown",
        "latitude": 0.0,
        "longitude": 0.0,
        "is_known": False,
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance in km between two lat/lon points.
    Uses the Haversine formula.
    """
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
