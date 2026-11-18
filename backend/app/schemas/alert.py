"""Pydantic schemas for security alert endpoints."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class AlertUpdate(BaseModel):
    status: str
    resolution_note: Optional[str] = None


class AlertResponse(BaseModel):
    id: str
    user_id: str
    login_event_id: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    status: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None
    risk_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
