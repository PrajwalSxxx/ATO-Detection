"""Schemas package."""
from app.schemas.auth import (
    LoginRequest, LoginResponse, MFAVerifyRequest, MFAVerifyResponse, MFAResendRequest, TokenResponse
)
from app.schemas.login import LoginEventSchema, LoginEventListResponse, SimulateLoginRequest
from app.schemas.risk import RiskAssessmentSchema, RiskOverviewStats, RiskReasonSchema
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.schemas.alert import AlertResponse, AlertListResponse, AlertUpdate
from app.schemas.device import DeviceResponse, DeviceListResponse, DeviceTrustUpdate
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.schemas.dashboard import DashboardSummary, HourlyLoginStat, DecisionDistribution, RiskDistribution
from app.schemas.settings import SettingItem, SettingUpdate, SettingsMap

__all__ = [
    "LoginRequest", "LoginResponse", "MFAVerifyRequest", "MFAVerifyResponse", "MFAResendRequest", "TokenResponse",
    "LoginEventSchema", "LoginEventListResponse", "SimulateLoginRequest",
    "RiskAssessmentSchema", "RiskOverviewStats", "RiskReasonSchema",
    "UserCreate", "UserUpdate", "UserResponse", "UserListResponse",
    "AlertResponse", "AlertListResponse", "AlertUpdate",
    "DeviceResponse", "DeviceListResponse", "DeviceTrustUpdate",
    "AuditLogResponse", "AuditLogListResponse",
    "DashboardSummary", "HourlyLoginStat", "DecisionDistribution", "RiskDistribution",
    "SettingItem", "SettingUpdate", "SettingsMap",
]
