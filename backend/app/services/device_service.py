"""Device service: identify, track, and analyse devices."""
from __future__ import annotations
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.device import Device
from app.services.telemetry_service import TelemetryData


@dataclass
class DeviceAnalysis:
    device_id: str
    fingerprint_hash: str
    is_new_device: bool
    browser_changed: bool
    os_changed: bool
    device_type: str
    browser_name: str
    os_name: str
    is_trusted: bool
    login_count: int
    device_category: str = "desktop"


def get_or_create_device(
    db: Session,
    user_id: str,
    telemetry: TelemetryData,
    ip_address: str,
) -> DeviceAnalysis:
    """
    Look up a device by user_id + fingerprint_hash.
    Creates a new Device record if not found.
    Updates login count and last seen info.
    Returns DeviceAnalysis with change flags.
    """
    existing: Optional[Device] = (
        db.query(Device)
        .filter(Device.user_id == user_id, Device.fingerprint_hash == telemetry.fingerprint_hash)
        .first()
    )

    if existing:
        # Detect changes
        browser_changed = (existing.browser_name or "") != telemetry.browser_name
        os_changed = (existing.os_name or "") != telemetry.os_name

        # Update stats
        existing.login_count += 1
        existing.last_seen_ip = ip_address
        existing.last_seen_at = datetime.now(timezone.utc)
        existing.browser_version = telemetry.browser_version
        existing.os_version = telemetry.os_version
        existing.user_agent = telemetry.raw_ua
        db.add(existing)

        return DeviceAnalysis(
            device_id=existing.id,
            fingerprint_hash=existing.fingerprint_hash,
            is_new_device=False,
            browser_changed=browser_changed,
            os_changed=os_changed,
            device_type=existing.device_type or telemetry.device_type,
            browser_name=existing.browser_name or telemetry.browser_name,
            os_name=existing.os_name or telemetry.os_name,
            is_trusted=existing.is_trusted,
            login_count=existing.login_count,
            device_category=existing.device_type or telemetry.device_type,
        )
    else:
        # Create new device
        new_device = Device(
            id=str(uuid.uuid4()),
            user_id=user_id,
            fingerprint_hash=telemetry.fingerprint_hash,
            browser_name=telemetry.browser_name,
            browser_version=telemetry.browser_version,
            os_name=telemetry.os_name,
            os_version=telemetry.os_version,
            device_type=telemetry.device_type,
            user_agent=telemetry.raw_ua,
            is_trusted=False,
            login_count=1,
            last_seen_ip=ip_address,
            last_seen_at=datetime.now(timezone.utc),
            first_seen_at=datetime.now(timezone.utc),
        )
        db.add(new_device)

        return DeviceAnalysis(
            device_id=new_device.id,
            fingerprint_hash=new_device.fingerprint_hash,
            is_new_device=True,
            browser_changed=False,
            os_changed=False,
            device_type=telemetry.device_type,
            browser_name=telemetry.browser_name,
            os_name=telemetry.os_name,
            is_trusted=False,
            login_count=1,
            device_category=telemetry.device_type,
        )
