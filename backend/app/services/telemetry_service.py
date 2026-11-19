"""Telemetry service: parse user-agent string to extract device/browser info."""
from __future__ import annotations
import hashlib
from dataclasses import dataclass
from typing import Optional

from user_agents import parse as ua_parse


@dataclass
class TelemetryData:
    browser_name: str
    browser_version: str
    os_name: str
    os_version: str
    device_type: str  # desktop, mobile, tablet, bot, other
    is_mobile: bool
    is_tablet: bool
    is_pc: bool
    is_bot: bool
    fingerprint_hash: str
    raw_ua: str
    device_category: str = "desktop"
    client_fingerprint: Optional[str] = None


def parse_telemetry(
    user_agent_string: Optional[str],
    client_fingerprint: Optional[str] = None,
    client_device_category: Optional[str] = None,
) -> TelemetryData:
    """
    Parse a User-Agent string and combine with client-side entropy
    to extract device/browser telemetry and produce a robust fingerprint.
    """
    if not user_agent_string:
        user_agent_string = "unknown"

    ua = ua_parse(user_agent_string)

    browser_name = ua.browser.family or "Unknown"
    browser_version = ua.browser.version_string or "0"
    os_name = ua.os.family or "Unknown"
    os_version = ua.os.version_string or "0"

    # Refine browser identification if user_agents returned generic/other
    ua_lower = user_agent_string.lower()
    if browser_name in ("Unknown", "Other") or not browser_name:
        import re
        if "edg/" in ua_lower:
            browser_name = "Edge"
            m = re.search(r"edg/([\d.]+)", ua_lower)
            if m:
                browser_version = m.group(1)
        elif "chrome/" in ua_lower and "chromium" not in ua_lower:
            browser_name = "Chrome"
            m = re.search(r"chrome/([\d.]+)", ua_lower)
            if m:
                browser_version = m.group(1)
        elif "firefox/" in ua_lower:
            browser_name = "Firefox"
            m = re.search(r"firefox/([\d.]+)", ua_lower)
            if m:
                browser_version = m.group(1)
        elif "safari/" in ua_lower and "chrome/" not in ua_lower:
            browser_name = "Safari"
            m = re.search(r"version/([\d.]+)", ua_lower)
            if m:
                browser_version = m.group(1)
        elif "curl/" in ua_lower:
            browser_name = "curl"
            m = re.search(r"curl/([\d.]+)", ua_lower)
            if m:
                browser_version = m.group(1)
        elif "python" in ua_lower:
            browser_name = "Python Requests"

    # Refine OS identification if generic
    if os_name in ("Unknown", "Other") or not os_name:
        import re
        if "windows nt 10.0" in ua_lower or "windows nt 11.0" in ua_lower:
            os_name = "Windows"
            os_version = "10/11"
        elif "windows nt" in ua_lower:
            os_name = "Windows"
        elif "mac os x" in ua_lower or "macintosh" in ua_lower:
            os_name = "Mac OS X"
            m = re.search(r"mac os x ([\d_]+)", ua_lower)
            if m:
                os_version = m.group(1).replace("_", ".")
        elif "android" in ua_lower:
            os_name = "Android"
            m = re.search(r"android ([\d.]+)", ua_lower)
            if m:
                os_version = m.group(1)
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            os_name = "iOS"
        elif "linux" in ua_lower:
            os_name = "Linux"

    if client_device_category:
        device_type = client_device_category.lower()
    elif ua.is_bot:
        device_type = "bot"
    elif ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    elif ua.is_pc:
        device_type = "desktop"
    else:
        device_type = "other"

    # Multi-layered fingerprint strategy:
    # If client-side cryptographic fingerprint is present, bind it with server-side UA attributes.
    # If not present (e.g. API clients, bots), derive from UA entropy components.
    if client_fingerprint and client_fingerprint.strip():
        fingerprint_raw = f"{client_fingerprint.strip()}|{browser_name}|{os_name}|{device_type}"
    else:
        # Fallback server-derived entropy
        fingerprint_raw = f"{user_agent_string}|{browser_name}|{os_name}|{device_type}"

    fingerprint_hash = hashlib.sha256(fingerprint_raw.encode("utf-8")).hexdigest()

    return TelemetryData(
        browser_name=browser_name,
        browser_version=browser_version,
        os_name=os_name,
        os_version=os_version,
        device_type=device_type,
        device_category=device_type,
        client_fingerprint=client_fingerprint,
        is_mobile=ua.is_mobile or device_type == "mobile",
        is_tablet=ua.is_tablet or device_type == "tablet",
        is_pc=ua.is_pc or device_type == "desktop",
        is_bot=ua.is_bot or device_type == "bot",
        fingerprint_hash=fingerprint_hash,
        raw_ua=user_agent_string,
    )
