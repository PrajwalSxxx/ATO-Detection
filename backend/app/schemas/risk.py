"""Pydantic schemas for risk assessment endpoints."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class RiskReasonSchema(BaseModel):
    factor: str
    points: float
    description: str


class RiskAssessmentSchema(BaseModel):
    id: str
    user_id: str
    login_event_id: Optional[str] = None
    risk_score: float
    risk_level: str
    ml_anomaly_score: Optional[float] = None
    decision: str
    confidence: Optional[float] = None
    reasons: Optional[str] = None
    features_snapshot: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskOverviewStats(BaseModel):
    total_assessments: int
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    critical_risk_count: int
    avg_risk_score: float
    allow_count: int
    mfa_count: int
    block_count: int
