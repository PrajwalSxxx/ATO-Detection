"""Auth service: orchestrates the full login decision pipeline."""
from __future__ import annotations
import uuid
import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    InvalidCredentialsError,
    AccountLockedError,
    AccountDisabledError,
)
from app.core.security import timing_safe_verify, create_access_token, hash_password
from app.models.user import User
from app.models.login_event import LoginEvent
from app.models.risk import RiskAssessment
from app.services.telemetry_service import parse_telemetry
from app.services.geo_service import get_geo
from app.services.device_service import get_or_create_device
from app.services.feature_service import compute_features
from app.services.risk_service import compute_risk_score, MLResult
from app.services.alert_service import create_alert_for_risk
from app.services.audit_service import write_audit_log
from app.ml.model_registry import model_registry
from app.ml.inference import predict
from app.ml.feature_pipeline import feature_vector_to_array


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def process_login(
    db: Session,
    email: str,
    password: str,
    ip_address: str,
    user_agent: Optional[str],
) -> dict:
    """
    Full login decision pipeline:
    1. Credential validation (timing-safe)
    2. Account status checks
    3. Telemetry & geo
    4. Device analysis
    5. Feature extraction
    6. ML inference
    7. Risk scoring
    8. Decision: allow / mfa / block
    9. Persist login event + risk assessment
    10. Create alert if needed
    11. Return result
    """
    now = datetime.now(timezone.utc)
    user = get_user_by_email(db, email)

    # Timing-safe credential check
    stored_hash = user.hashed_password if user else None
    password_ok = timing_safe_verify(password, stored_hash)

    if not user or not password_ok:
        # Log failed attempt
        if user:
            user.failed_login_count = (user.failed_login_count or 0) + 1
            if user.failed_login_count >= 10:
                user.is_locked = True
            db.add(user)
            # Record failed login event
            evt = _create_login_event(user.id, ip_address, user_agent, success=False,
                                       failure_reason="INVALID_PASSWORD", now=now)
            db.add(evt)
            write_audit_log(db, "LOGIN_FAILED", user_id=user.id, ip_address=ip_address,
                            user_agent=user_agent, status="failure",
                            details={"reason": "invalid_password"})
        db.commit()
        raise InvalidCredentialsError()

    # Account status
    if not user.is_active:
        raise AccountDisabledError()
    if user.is_locked:
        if user.locked_until and user.locked_until > now:
            raise AccountLockedError()
        else:
            # Unlock if lockout period expired
            user.is_locked = False
            user.failed_login_count = 0
            db.add(user)

    # Reset failed count on successful credential validation
    user.failed_login_count = 0
    user.last_login_at = now
    db.add(user)

    # Telemetry & geo
    telemetry = parse_telemetry(user_agent)
    geo = get_geo(ip_address)

    # Device analysis
    device_analysis = get_or_create_device(db, user.id, telemetry, ip_address)
    db.flush()

    # Feature extraction
    features = compute_features(db, user.id, ip_address, geo, device_analysis, login_time=now)

    # ML inference
    if model_registry.model_loaded:
        feature_arr = feature_vector_to_array(features)
        ml_raw = predict(feature_arr, model_registry)
        ml_result = MLResult(
            anomaly_score=ml_raw["anomaly_score"],
            raw_score=ml_raw["raw_score"],
            is_anomaly=ml_raw["is_anomaly"],
            model_loaded=True,
        )
    else:
        ml_result = MLResult(anomaly_score=0.0, raw_score=0.0, is_anomaly=False, model_loaded=False)

    # Risk scoring
    risk_result = compute_risk_score(features, ml_result)

    # Create login event
    evt = _create_login_event(
        user.id, ip_address, user_agent,
        success=True, failure_reason=None, now=now,
        fingerprint_hash=telemetry.fingerprint_hash,
        country=geo.get("country"), region=geo.get("region"), city=geo.get("city"),
        latitude=geo.get("latitude"), longitude=geo.get("longitude"),
        is_new_device=features.is_new_device == 1,
        is_new_ip=features.is_new_ip == 1,
        mfa_required=(risk_result.decision == "mfa"),
    )
    db.add(evt)
    db.flush()

    # Persist risk assessment
    risk_rec = RiskAssessment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        login_event_id=evt.id,
        risk_score=risk_result.score,
        risk_level=risk_result.level,
        ml_anomaly_score=ml_result.anomaly_score,
        decision=risk_result.decision,
        confidence=risk_result.confidence,
        reasons=json.dumps([
            {"factor": r.factor, "points": r.points, "description": r.description}
            for r in risk_result.reasons
        ]),
        features_snapshot=json.dumps({
            "failed_attempts_15min": features.failed_attempts_15min,
            "failed_attempts_1h": features.failed_attempts_1h,
            "is_new_device": features.is_new_device,
            "is_new_ip": features.is_new_ip,
            "geo_distance_km": features.geo_distance_km,
            "country_changed": features.country_changed,
        }),
    )
    db.add(risk_rec)

    # Create alert if needed
    create_alert_for_risk(db, user.id, evt.id, risk_result)

    # Audit log
    write_audit_log(
        db, "LOGIN_SUCCESS", user_id=user.id, ip_address=ip_address,
        user_agent=user_agent, status="success",
        details={"risk_level": risk_result.level, "decision": risk_result.decision},
    )

    db.commit()

    # Build response
    result = {
        "decision": risk_result.decision,
        "risk_score": risk_result.score,
        "risk_level": risk_result.level,
        "login_event_id": evt.id,
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    }

    if risk_result.decision == "allow":
        token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
        result["access_token"] = token
        result["token_type"] = "bearer"
    elif risk_result.decision == "mfa":
        result["mfa_required"] = True
        result["message"] = "MFA verification required"
    else:  # block
        result["blocked"] = True
        result["message"] = "Login blocked due to high risk"

    return result


def _create_login_event(
    user_id: str, ip_address: str, user_agent: Optional[str],
    success: bool, failure_reason: Optional[str], now: datetime,
    fingerprint_hash: Optional[str] = None,
    country: Optional[str] = None, region: Optional[str] = None, city: Optional[str] = None,
    latitude: Optional[float] = None, longitude: Optional[float] = None,
    is_new_device: bool = False, is_new_ip: bool = False, mfa_required: bool = False,
) -> LoginEvent:
    return LoginEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        fingerprint_hash=fingerprint_hash,
        country=country,
        region=region,
        city=city,
        latitude=latitude,
        longitude=longitude,
        success=success,
        failure_reason=failure_reason,
        is_new_device=is_new_device,
        is_new_ip=is_new_ip,
        mfa_required=mfa_required,
        mfa_completed=False,
        created_at=now,
    )
