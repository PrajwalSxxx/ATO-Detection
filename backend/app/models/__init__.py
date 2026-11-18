"""Models package - import all models to register them with SQLAlchemy."""
from app.models.user import User
from app.models.login_event import LoginEvent
from app.models.device import Device
from app.models.risk import RiskAssessment
from app.models.alert import SecurityAlert
from app.models.audit import AuditLog
from app.models.settings import AppSettings
from app.models.ml_model import MFAVerification
from app.models.ml_model_meta import DetectionModelMetadata

__all__ = [
    "User",
    "LoginEvent",
    "Device",
    "RiskAssessment",
    "SecurityAlert",
    "AuditLog",
    "AppSettings",
    "MFAVerification",
    "DetectionModelMetadata",
]
