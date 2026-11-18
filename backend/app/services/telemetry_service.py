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


def parse_telemetry(user_agent_string: Optional[str]) -> TelemetryData:
    """Parse a User-Agent string and extract device/browser telemetry."""
    if not user_agent_string:
        user_agent_string = "unknown"

    ua = ua_parse(user_agent_string)

    browser_name = ua.browser.family or "Unknown"
    browser_version = ua.browser.version_string or "0"
    os_name = ua.os.family or "Unknown"
    os_version = ua.os.version_string or "0"

    if ua.is_bot:
        device_type = "bot"
    elif ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    elif ua.is_pc:
        device_type = "desktop"
    else:
        device_type = "other"

    # Generate fingerprint from stable attributes
    fingerprint_raw = f"{browser_name}|{os_name}|{device_type}"
    fingerprint_hash = hashlib.sha256(fingerprint_raw.encode()).hexdigest()

    return TelemetryData(
        browser_name=browser_name,
        browser_version=browser_version,
        os_name=os_name,
        os_version=os_version,
        device_type=device_type,
        is_mobile=ua.is_mobile,
        is_tablet=ua.is_tablet,
        is_pc=ua.is_pc,
        is_bot=ua.is_bot,
        fingerprint_hash=fingerprint_hash,
        raw_ua=user_agent_string,
    )
