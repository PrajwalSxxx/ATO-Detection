"""Pydantic schemas for login event endpoints."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class LoginEventSchema(BaseModel):
    id: str
    user_id: str
    ip_address: str
    user_agent: Optional[str] = None
    fingerprint_hash: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    mfa_required: bool
    mfa_completed: bool
    is_new_device: bool
    is_new_ip: bool
    created_at: datetime

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
