"""Pydantic schemas for dashboard metrics and analytics."""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class DashboardSummary(BaseModel):
    total_logins_today: int
    failed_logins_today: int
    mfa_challenges_today: int
    blocks_today: int
    open_alerts_count: int
    critical_alerts_count: int
    active_users_count: int
    avg_risk_score_today: float
    total_users: Optional[int] = None
    logins_today: Optional[int] = None
    successful_logins: Optional[int] = None
    failed_logins: Optional[int] = None
    suspicious_logins: Optional[int] = None
    high_risk_logins: Optional[int] = None
    mfa_challenges: Optional[int] = None
    blocked_logins: Optional[int] = None
    decision_breakdown: Optional[List[Dict[str, Any]]] = None
    recent_events: Optional[List[Dict[str, Any]]] = None


class DecisionItem(BaseModel):
    name: str
    value: int


class DashboardOverview(BaseModel):
    total_users: int
    logins_today: int
    successful_logins: int
    failed_logins: int
    suspicious_logins: int
    high_risk_logins: int
    mfa_challenges: int
    blocked_logins: int
    total_logins_today: int
    failed_logins_today: int
    mfa_challenges_today: int
    blocks_today: int
    open_alerts_count: int
    critical_alerts_count: int
    active_users_count: int
    avg_risk_score_today: float
    decision_breakdown: List[DecisionItem]
    recent_events: List[Dict[str, Any]]


class HourlyLoginStat(BaseModel):
    hour: str
    total: int
    successful: int
    failed: int


class DecisionDistribution(BaseModel):
    allow: int
    mfa: int
    block: int


class RiskDistribution(BaseModel):
    low: int
    medium: int
    high: int
    critical: int


class RecentAlertItem(BaseModel):
    id: str
    user_email: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    created_at: str
    risk_score: Optional[float] = None
    status: str
