"""Client IP Resolution and Validation Subsystem.

Provides robust, topology-aware IP address extraction:
- Direct socket connections
- Trusted reverse proxies (e.g. Nginx, Cloudflare, Traefik, Docker gateway)
- Anti-spoofing: Rejects arbitrary X-Forwarded-For / X-Real-IP from untrusted origins
- IPv4 & IPv6 validation using python's `ipaddress` module
- Explicit classification: public vs loopback vs private RFC1918 vs malformed
- Development-mode public IP discovery support (marked CLIENT_REPORTED, unverified)
"""
from __future__ import annotations
import ipaddress
from dataclasses import dataclass, asdict
from typing import Optional, List, Union, Dict, Any
from fastapi import Request

from app.core.config import settings


@dataclass
class ClientIPInfo:
    ip: str
    source: str               # "direct", "trusted_proxy", "client_reported", "loopback_dev", "unknown"
    trust_status: str         # "verified", "unverified", "loopback", "untrusted"
    is_public: bool
    is_loopback: bool
    is_private: bool
    raw_socket_ip: str
    proxy_trusted: bool = False
    forwarded_chain: Optional[List[str]] = None

    @property
    def ip_address(self) -> str:
        return self.ip

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def parse_ip_safely(ip_str: Optional[str]) -> Optional[Union[ipaddress.IPv4Address, ipaddress.IPv6Address]]:
    """Parse an IP string safely into an IPv4Address or IPv6Address object, or None if invalid."""
    if not ip_str or not isinstance(ip_str, str):
        return None
    cleaned = ip_str.strip()
    # Strip port if present in IPv4 (e.g. 192.168.1.1:54321) or bracketed IPv6 ([::1]:8000)
    if ":" in cleaned and not cleaned.startswith("[") and cleaned.count(":") == 1:
        cleaned = cleaned.split(":")[0]
    elif cleaned.startswith("[") and "]" in cleaned:
        cleaned = cleaned.split("]")[0].lstrip("[")

    try:
        return ipaddress.ip_address(cleaned)
    except ValueError:
        return None


def is_ip_in_trusted_proxies(ip_obj: Union[ipaddress.IPv4Address, ipaddress.IPv6Address], trusted_list: List[str]) -> bool:
    """Check if the given IP address is in the list of configured trusted proxies/subnets."""
    if not trusted_list:
        return False

    for trusted_entry in trusted_list:
        entry_clean = str(trusted_entry).strip()
        if not entry_clean:
            continue
        try:
            # Check if entry is a network / CIDR (e.g. 10.0.0.0/8, 127.0.0.0/8)
            if "/" in entry_clean:
                net = ipaddress.ip_network(entry_clean, strict=False)
                if ip_obj in net:
                    return True
            else:
                trusted_ip = ipaddress.ip_address(entry_clean)
                if ip_obj == trusted_ip:
                    return True
        except ValueError:
            continue

    return False


def resolve_client_ip(
    request: Request,
    client_reported_ip: Optional[str] = None,
) -> ClientIPInfo:
    """
    Extract and validate the authentic client IP address based on request topology.

    SECURITY RULES:
    1. Only inspect X-Forwarded-For or X-Real-IP if the direct socket peer (request.client.host)
       matches an explicitly configured TRUSTED_PROXIES entry.
    2. Traverse the X-Forwarded-For chain from right to left to avoid spoofing.
    3. In development on loopback/localhost, if the frontend supplies a discovered public IP
       (e.g. Turbo VPN or real WAN IP), accept it as CLIENT_REPORTED with trust_status=UNVERIFIED.
    4. Never use an unverified client-reported IP for automated blocking decisions.
    """
    # 1. Obtain direct connection socket IP
    raw_socket = request.client.host if request.client and request.client.host else ""
    socket_ip_obj = parse_ip_safely(raw_socket)

    if not socket_ip_obj:
        # Fallback if connection host is completely missing
        return ClientIPInfo(
            ip="unknown",
            source="unknown",
            trust_status="untrusted",
            is_public=False,
            is_loopback=False,
            is_private=False,
            raw_socket_ip=raw_socket,
        )

    # 2. Check if the direct socket connection is from a configured trusted reverse proxy
    trusted_proxies = getattr(settings, "TRUSTED_PROXIES", ["127.0.0.1", "::1"])
    socket_is_trusted_proxy = is_ip_in_trusted_proxies(socket_ip_obj, trusted_proxies)

    resolved_ip_obj = socket_ip_obj
    ip_source = "direct"
    trust_status = "verified"
    forwarded_chain: List[str] = []

    # 3. Process proxy headers ONLY if connection comes from a trusted proxy
    if socket_is_trusted_proxy:
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        x_real_ip = request.headers.get("X-Real-IP")

        if x_forwarded_for:
            hops = [h.strip() for h in x_forwarded_for.split(",") if h.strip()]
            forwarded_chain = hops
            # Right-to-left traversal: find the first non-trusted IP in the chain
            for hop in reversed(hops):
                hop_ip_obj = parse_ip_safely(hop)
                if hop_ip_obj:
                    resolved_ip_obj = hop_ip_obj
                    ip_source = "trusted_proxy"
                    trust_status = "verified"
                    # If this hop is not a proxy, it's the real client
                    if not is_ip_in_trusted_proxies(hop_ip_obj, trusted_proxies):
                        break
        elif x_real_ip:
            real_ip_obj = parse_ip_safely(x_real_ip)
            if real_ip_obj:
                resolved_ip_obj = real_ip_obj
                ip_source = "trusted_proxy"
                trust_status = "verified"

    # 4. Local Development Fallback: Handling loopback connections with public discovery
    # On Windows laptop running React (localhost:5173) & FastAPI (localhost:8000),
    # loopback traffic bypasses the VPN tunnel. If client_reported_ip is provided in dev:
    is_loopback_or_private = (
        resolved_ip_obj.is_loopback
        or resolved_ip_obj.is_private
        or resolved_ip_obj.is_reserved
        or resolved_ip_obj.is_link_local
    )

    dev_discovery_enabled = getattr(settings, "DEV_PUBLIC_IP_DISCOVERY", True)
    is_dev_env = getattr(settings, "APP_ENV", "development").lower() != "production"

    if is_loopback_or_private and (dev_discovery_enabled or is_dev_env):
        if client_reported_ip and isinstance(client_reported_ip, str):
            reported_obj = parse_ip_safely(client_reported_ip)
            if reported_obj and reported_obj.is_global:
                # Valid public IP discovered by client (e.g. Turbo VPN exit node or public WAN)
                resolved_ip_obj = reported_obj
                ip_source = "client_reported"
                trust_status = "unverified"
        elif resolved_ip_obj.is_loopback:
            ip_source = "loopback_dev"
            trust_status = "loopback"

    return ClientIPInfo(
        ip=str(resolved_ip_obj),
        source=ip_source,
        trust_status=trust_status,
        is_public=resolved_ip_obj.is_global,
        is_loopback=resolved_ip_obj.is_loopback,
        is_private=resolved_ip_obj.is_private,
        raw_socket_ip=raw_socket,
        proxy_trusted=socket_is_trusted_proxy,
        forwarded_chain=forwarded_chain if forwarded_chain else None,
    )
