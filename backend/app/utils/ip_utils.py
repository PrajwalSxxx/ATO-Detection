"""IP address utilities."""
import ipaddress
from typing import Optional


def classify_ip(ip_str: str) -> dict:
    """Classify an IP address."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return {
            "is_private": ip.is_private,
            "is_loopback": ip.is_loopback,
            "is_reserved": ip.is_reserved,
            "is_global": ip.is_global,
            "version": ip.version,
            "subnet_24": str(ip).rsplit('.', 1)[0] if ip.version == 4 else str(ip),
        }
    except ValueError:
        return {
            "is_private": True,
            "is_loopback": False,
            "is_reserved": True,
            "is_global": False,
            "version": 4,
            "subnet_24": "unknown",
        }


def get_subnet_24(ip_str: str) -> str:
    """Get the /24 subnet prefix of an IP address."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.version == 4:
            parts = str(ip).split('.')
            return f"{parts[0]}.{parts[1]}.{parts[2]}"
        return str(ip)
    except Exception:
        return "unknown"


def is_private_ip(ip_str: str) -> bool:
    try:
        return ipaddress.ip_address(ip_str).is_private
    except ValueError:
        return True
