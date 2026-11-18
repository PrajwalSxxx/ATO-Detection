"""Audit service: write audit log entries (never log sensitive data)."""
from __future__ import annotations
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models.audit import AuditLog

# Fields that must NEVER appear in audit logs
_SENSITIVE_FIELDS = {
    "password", "hashed_password", "token", "access_token", "refresh_token",
    "otp", "otp_hash", "secret", "secret_key", "api_key",
}


def _sanitize(data: Optional[Dict[str, Any]]) -> Optional[str]:
    """Remove sensitive fields and return JSON string."""
    if not data:
        return None
    cleaned = {k: v for k, v in data.items() if k.lower() not in _SENSITIVE_FIELDS}
    try:
        return json.dumps(cleaned, default=str)
    except Exception:
        return None


def write_audit_log(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status: str = "success",
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Write an audit log entry.
    Automatically sanitizes details to never log passwords, tokens, OTPs, or hashes.
    """
    log = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        status=status,
        details=_sanitize(details),
    )
    db.add(log)
    return log
