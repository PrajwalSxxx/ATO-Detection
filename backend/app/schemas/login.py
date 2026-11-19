"""Pydantic schemas for login event endpoints."""
from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone
from typing import Optional, List, Any


class LoginEventSchema(BaseModel):
    id: str
    user_id: str
    ip_address: str
    ip_source: Optional[str] = "direct"
    ip_trust_status: Optional[str] = "verified"
    user_agent: Optional[str] = None
    fingerprint_hash: Optional[str] = None
    browser: Optional[str] = None
    browser_version: Optional[str] = None
    os: Optional[str] = None
    os_version: Optional[str] = None
    device_category: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geo_provider: Optional[str] = None
    geo_status: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    mfa_required: bool
    mfa_completed: bool
    is_new_device: bool
    is_new_ip: bool
    mfa_phone_masked: Optional[str] = None
    mfa_delivery_status: Optional[str] = None
    is_vpn: Optional[bool] = False
    vpn_status: Optional[str] = "not_detected"
    is_proxy: Optional[bool] = False
    proxy_status: Optional[str] = "not_detected"
    is_tor: Optional[bool] = False
    tor_status: Optional[str] = "not_detected"
    is_datacenter: Optional[bool] = False
    datacenter_status: Optional[str] = "not_detected"
    prev_country: Optional[str] = None
    prev_city: Optional[str] = None
    geo_distance_km: Optional[float] = 0.0
    impossible_travel: Optional[bool] = False
    is_simulated: Optional[bool] = False
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    model_config = {"from_attributes": True}


class LoginEventListResponse(BaseModel):
    items: List[LoginEventSchema]
    total: int
    page: int
    page_size: int
    total_pages: int


from typing import Optional, List, Any


class SimulateLoginRequest(BaseModel):
    email: Optional[str] = "admin@ato-platform.com"
    password: Optional[str] = "Admin@SecurePass123"
    ip_address: Optional[str] = "198.51.100.45"
    user_agent: Optional[str] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
    scenario: Optional[Any] = None
    user_id: Optional[str] = None
    is_new_device: Optional[bool] = False
    is_tor_or_vpn: Optional[bool] = False
    hour_of_day: Optional[int] = None
    failed_attempts_last_hour: Optional[int] = 0
    impossible_travel: Optional[bool] = False
    location: Optional[str] = None
    device_fingerprint: Optional[str] = None
    device_category: Optional[str] = None
