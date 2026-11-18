"""Alert service: create and manage security alerts."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.alert import SecurityAlert
from app.services.risk_service import RiskResult


def create_alert_for_risk(
    db: Session,
    user_id: str,
    login_event_id: Optional[str],
    risk_result: RiskResult,
) -> Optional[SecurityAlert]:
    """
    Create a SecurityAlert if risk level warrants it (high or critical).
    Returns the created alert or None.
    """
    if risk_result.level not in ("high", "critical"):
        return None

    alert_type_map = {
        "critical": "CRITICAL_RISK_LOGIN",
        "high": "HIGH_RISK_LOGIN",
    }

    # Check for impossible travel
    has_impossible_travel = any(r.factor == "impossible_travel" for r in risk_result.reasons)
    if has_impossible_travel:
        alert_type = "IMPOSSIBLE_TRAVEL"
        title = "Impossible Travel Detected"
        description = "A login was detected from a location that cannot be reached in the time since the last login."
    elif risk_result.level == "critical":
        alert_type = "CRITICAL_RISK_LOGIN"
        title = f"Critical Risk Login Detected (score: {risk_result.score:.0f})"
        description = "A login attempt with a critically high risk score was detected."
    else:
        alert_type = "HIGH_RISK_LOGIN"
        title = f"High Risk Login Detected (score: {risk_result.score:.0f})"
        description = "A login attempt with an elevated risk score was detected."

    # Add reasons summary
    top_reasons = [r.description for r in risk_result.reasons if r.points > 0][:3]
    if top_reasons:
        description += " Key signals: " + "; ".join(top_reasons)

    severity = "critical" if risk_result.level == "critical" else "high"

    alert = SecurityAlert(
        id=str(uuid.uuid4()),
        user_id=user_id,
        login_event_id=login_event_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        status="open",
        risk_score=risk_result.score,
    )
    db.add(alert)
    return alert


def update_alert_status(
    db: Session,
    alert_id: str,
    new_status: str,
    resolved_by: Optional[str],
    resolution_note: Optional[str] = None,
) -> Optional[SecurityAlert]:
    """Update alert status with audit trail."""
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        return None

    alert.status = new_status
    if new_status in ("resolved", "false_positive"):
        alert.resolved_by = resolved_by
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolution_note = resolution_note
    db.add(alert)
    return alert
