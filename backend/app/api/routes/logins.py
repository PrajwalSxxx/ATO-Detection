"""Login events and simulation API routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, analyst_or_admin_required, any_authenticated
from app.core.exceptions import ResourceNotFoundError
from app.models.login_event import LoginEvent
from app.models.risk import RiskAssessment
from app.models.user import User
from app.schemas.login import (
    LoginEventSchema,
    LoginEventListResponse,
    SimulateLoginRequest,
)
from app.services.auth_service import process_login

router = APIRouter(prefix="/logins", tags=["logins"])


@router.get("", response_model=LoginEventListResponse)
def list_login_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    success: Optional[bool] = None,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """List paginated login events with optional filtering."""
    query = db.query(LoginEvent)

    if user_id:
        query = query.filter(LoginEvent.user_id == user_id)
    if success is not None:
        query = query.filter(LoginEvent.success == success)

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)

    items = (
        query.order_by(LoginEvent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return LoginEventListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{event_id}")
def get_login_event_detail(
    event_id: str,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get full login event details including risk assessment."""
    event = db.query(LoginEvent).filter(LoginEvent.id == event_id).first()
    if not event:
        raise ResourceNotFoundError("Login event not found")

    risk = db.query(RiskAssessment).filter(RiskAssessment.login_event_id == event_id).first()

    import json
    risk_dict = None
    if risk:
        risk_dict = {
            "id": risk.id,
            "risk_score": risk.risk_score,
            "risk_level": risk.risk_level,
            "ml_anomaly_score": risk.ml_anomaly_score,
            "decision": risk.decision,
            "confidence": risk.confidence,
            "reasons": json.loads(risk.reasons) if risk.reasons else [],
            "features_snapshot": json.loads(risk.features_snapshot) if risk.features_snapshot else {},
            "created_at": risk.created_at.isoformat() if risk.created_at else None,
        }

    return {
        "event": {
            "id": event.id,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "fingerprint_hash": event.fingerprint_hash,
            "country": event.country,
            "region": event.region,
            "city": event.city,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "success": event.success,
            "failure_reason": event.failure_reason,
            "mfa_required": event.mfa_required,
            "mfa_completed": event.mfa_completed,
            "is_new_device": event.is_new_device,
            "is_new_ip": event.is_new_ip,
            "created_at": event.created_at.isoformat() if event.created_at else None,
        },
        "risk_assessment": risk_dict,
    }


@router.post("/simulate")
def simulate_login(
    body: SimulateLoginRequest,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """
    Simulate a login event through the real pipeline without affecting user lockout states.
    Allows testing different IPs, user agents, and risk factors.
    """
    email = body.email or "admin@ato-platform.com"
    if body.user_id:
        u = db.query(User).filter(User.id == body.user_id).first()
        if u:
            email = u.email
    password = body.password or "Admin@SecurePass123"
    if email.startswith("user") and password == "Admin@SecurePass123":
        password = "User@SecurePass123"

    import uuid
    ip_address = body.ip_address or "103.21.244.2"
    user_agent = body.user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
    device_fingerprint = getattr(body, "device_fingerprint", None)
    device_category = getattr(body, "device_category", None)

    if body.scenario in (1, "scenario_1", "normal", "normal_login"):
        ip_address = "103.21.244.2"
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        device_category = "desktop"
        device_fingerprint = "trusted_corporate_workstation_fp_001"
    elif body.scenario in (2, "scenario_2", "new_device"):
        ip_address = "103.21.244.2"
        user_agent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        device_category = "mobile"
        device_fingerprint = f"new_iphone_fp_{uuid.uuid4().hex[:12]}"
    elif body.scenario in (3, "scenario_3", "vpn", "vpn_location"):
        # Germany VPN datacenter IP
        ip_address = "185.220.101.4"
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
        device_category = "desktop"
        device_fingerprint = "trusted_corporate_workstation_fp_001"
    elif body.scenario in (4, "scenario_4", "suspicious_ato", "tor_ato", 7, "impossible_travel"):
        # Tor Exit Node with new Android device
        ip_address = "185.220.101.5"
        user_agent = "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36"
        device_category = "mobile"
        device_fingerprint = f"attacker_tor_device_{uuid.uuid4().hex[:12]}"
    elif body.scenario in (6, "credential_stuffing"):
        ip_address = "185.220.101.5"
        user_agent = "curl/7.88.1"
        device_category = "desktop"

    result = process_login(
        db=db,
        email=email,
        password=password,
        ip_address=ip_address,
        user_agent=user_agent,
        device_fingerprint=device_fingerprint,
        device_category=device_category,
    )
    return {
        "simulation": True,
        **result,
    }
