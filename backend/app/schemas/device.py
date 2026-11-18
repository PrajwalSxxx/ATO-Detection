"""Pydantic schemas for device endpoints."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class DeviceResponse(BaseModel):
    id: str
    user_id: str
    fingerprint_hash: str
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    device_type: Optional[str] = None
    is_trusted: bool
    trust_score: int
    login_count: int
    last_seen_ip: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    first_seen_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class DeviceTrustUpdate(BaseModel):
    is_trusted: bool


class DeviceListResponse(BaseModel):
    items: List[DeviceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
