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
from app.utils.phone_utils import mask_phone_number
from app.core.websocket_manager import ws_manager
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
    device_fingerprint: Optional[str] = None,
    device_category: Optional[str] = None,
    ip_source: str = "direct",
    ip_trust_status: str = "verified",
    is_simulation: bool = False,
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
        # Log failed attempt with telemetry
        if user:
            user.failed_login_count = (user.failed_login_count or 0) + 1
            if user.failed_login_count >= 10:
                user.is_locked = True
            db.add(user)
            fail_telemetry = parse_telemetry(user_agent)
            evt = _create_login_event(
                user.id, ip_address, user_agent, success=False,
                failure_reason="INVALID_PASSWORD", now=now,
                ip_source=ip_source, ip_trust_status=ip_trust_status,
                browser=fail_telemetry.browser_name, browser_version=fail_telemetry.browser_version,
                os=fail_telemetry.os_name, os_version=fail_telemetry.os_version,
                device_category=fail_telemetry.device_category,
                is_simulated=is_simulation,
            )
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
    telemetry = parse_telemetry(
        user_agent,
        client_fingerprint=device_fingerprint,
        client_device_category=device_category,
    )
    geo = get_geo(ip_address, is_simulation=is_simulation)

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

    # Security policy: Never use unverified client-reported IP for automated blocking decisions!
    # If high risk was derived from unverified client-reported IP, downgrade BLOCK to REQUIRE_MFA
    final_decision = risk_result.decision
    if ip_trust_status == "unverified" and final_decision == "block":
        final_decision = "mfa"

    # Create login event
    evt = _create_login_event(
        user.id, ip_address, user_agent,
        success=True, failure_reason=None, now=now,
        fingerprint_hash=telemetry.fingerprint_hash,
        browser=telemetry.browser_name,
        browser_version=telemetry.browser_version,
        os=telemetry.os_name,
        os_version=telemetry.os_version,
        ip_source=ip_source,
        ip_trust_status=ip_trust_status,
        country=geo.get("country"), region=geo.get("region"), city=geo.get("city"),
        latitude=geo.get("latitude"), longitude=geo.get("longitude"),
        geo_provider=geo.get("provider"),
        geo_status=geo.get("geo_status"),
        is_new_device=features.is_new_device == 1,
        is_new_ip=features.is_new_ip == 1,
        mfa_required=(final_decision == "mfa"),
        device_category=telemetry.device_category,
        is_vpn=bool(geo.get("is_vpn", False)),
        vpn_status=geo.get("vpn_status", "not_detected"),
        is_proxy=bool(geo.get("is_proxy", False)),
        proxy_status=geo.get("proxy_status", "not_detected"),
        is_tor=bool(geo.get("is_tor", False)),
        tor_status=geo.get("tor_status", "not_detected"),
        is_datacenter=bool(geo.get("is_datacenter", False)),
        datacenter_status=geo.get("datacenter_status", "not_detected"),
        isp=geo.get("isp"),
        asn=geo.get("asn"),
        prev_country=getattr(features, "prev_country", None),
        prev_city=getattr(features, "prev_city", None),
        geo_distance_km=features.geo_distance_km,
        impossible_travel=bool(getattr(features, "impossible_travel", False)),
        is_simulated=is_simulation,
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
        decision=final_decision,
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
            "impossible_travel": getattr(features, "impossible_travel", False),
            "is_vpn": geo.get("is_vpn", False),
            "is_tor": geo.get("is_tor", False),
        }),
    )
    db.add(risk_rec)

    # Create alert if needed
    create_alert_for_risk(db, user.id, evt.id, risk_result)

    # Audit log
    write_audit_log(
        db, "LOGIN_SUCCESS", user_id=user.id, ip_address=ip_address,
        user_agent=user_agent, status="success",
        details={"risk_level": risk_result.level, "decision": final_decision},
    )

    db.commit()

    # Real-time WebSocket Broadcast to Admin Dashboard
    try:
        ws_event = {
            "type": "login_event",
            "event_id": evt.id,
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "timestamp": now.isoformat().replace("+00:00", "Z"),
            "ip_address": ip_address,
            "ip_source": ip_source,
            "ip_trust_status": ip_trust_status,
            "device": {
                "fingerprint": telemetry.fingerprint_hash,
                "browser": telemetry.browser_name,
                "browser_version": telemetry.browser_version,
                "os": telemetry.os_name,
                "os_version": telemetry.os_version,
                "category": telemetry.device_category,
                "is_new": bool(features.is_new_device == 1),
            },
            "location": {
                "country": geo.get("country"),
                "region": geo.get("region"),
                "city": geo.get("city"),
                "geo_provider": geo.get("provider"),
                "geo_status": geo.get("geo_status"),
                "prev_country": getattr(features, "prev_country", None),
                "prev_city": getattr(features, "prev_city", None),
                "distance_km": features.geo_distance_km,
                "speed_kmh": getattr(features, "calculated_speed_kmh", 0.0),
                "impossible_travel": bool(getattr(features, "impossible_travel", False)),
            },
            "threats": {
                "is_vpn": bool(geo.get("is_vpn", False)),
                "vpn_status": geo.get("vpn_status", "not_detected"),
                "is_proxy": bool(geo.get("is_proxy", False)),
                "proxy_status": geo.get("proxy_status", "not_detected"),
                "is_tor": bool(geo.get("is_tor", False)),
                "tor_status": geo.get("tor_status", "not_detected"),
                "is_datacenter": bool(geo.get("is_datacenter", False)),
                "datacenter_status": geo.get("datacenter_status", "not_detected"),
                "isp": geo.get("isp"),
                "asn": geo.get("asn"),
                "provider": geo.get("provider"),
            },
            "risk": {
                "score": risk_result.score,
                "level": risk_result.level,
                "decision": final_decision,
                "reasons": [{"factor": r.factor, "points": r.points, "description": r.description} for r in risk_result.reasons],
                "ml_anomaly_score": ml_result.anomaly_score,
            },
            "mfa": {
                "required": bool(final_decision == "mfa"),
                "phone_masked": mask_phone_number(user.phone_number) if user and user.phone_number else None,
                "delivery_status": "mock_delivered" if settings.SMS_PROVIDER == "mock" else "sent",
            },
            "is_simulated": is_simulation,
        }
        ws_manager.broadcast_security_event(ws_event)
    except Exception as ws_err:
        pass

    # Build response
    result = {
        "decision": final_decision,
        "risk_score": risk_result.score,
        "risk_level": risk_result.level,
        "login_event_id": evt.id,
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "ip_address": ip_address,
        "ip_source": ip_source,
        "ip_trust_status": ip_trust_status,
        "browser": telemetry.browser_name,
        "os": telemetry.os_name,
        "country": geo.get("country"),
        "city": geo.get("city"),
    }

    if final_decision == "allow":
        token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
        result["access_token"] = token
        result["token_type"] = "bearer"
    elif final_decision == "mfa":
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
    browser: Optional[str] = None,
    browser_version: Optional[str] = None,
    os: Optional[str] = None,
    os_version: Optional[str] = None,
    ip_source: str = "direct",
    ip_trust_status: str = "verified",
    country: Optional[str] = None, region: Optional[str] = None, city: Optional[str] = None,
    latitude: Optional[float] = None, longitude: Optional[float] = None,
    geo_provider: Optional[str] = None,
    geo_status: Optional[str] = None,
    is_new_device: bool = False, is_new_ip: bool = False, mfa_required: bool = False,
    device_category: Optional[str] = None,
    is_vpn: bool = False,
    vpn_status: str = "not_detected",
    is_proxy: bool = False,
    proxy_status: str = "not_detected",
    is_tor: bool = False,
    tor_status: str = "not_detected",
    is_datacenter: bool = False,
    datacenter_status: str = "not_detected",
    isp: Optional[str] = None,
    asn: Optional[str] = None,
    prev_country: Optional[str] = None,
    prev_city: Optional[str] = None,
    geo_distance_km: Optional[float] = None,
    impossible_travel: bool = False,
    is_simulated: bool = False,
) -> LoginEvent:
    return LoginEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        ip_address=ip_address,
        ip_source=ip_source,
        ip_trust_status=ip_trust_status,
        user_agent=user_agent,
        fingerprint_hash=fingerprint_hash,
        browser=browser,
        browser_version=browser_version,
        os=os,
        os_version=os_version,
        country=country,
        region=region,
        city=city,
        latitude=latitude,
        longitude=longitude,
        geo_provider=geo_provider,
        geo_status=geo_status,
        success=success,
        failure_reason=failure_reason,
        is_new_device=is_new_device,
        is_new_ip=is_new_ip,
        mfa_required=mfa_required,
        mfa_completed=False,
        created_at=now,
        device_category=device_category,
        is_vpn=is_vpn,
        vpn_status=vpn_status,
        is_proxy=is_proxy,
        proxy_status=proxy_status,
        is_tor=is_tor,
        tor_status=tor_status,
        is_datacenter=is_datacenter,
        datacenter_status=datacenter_status,
        isp=isp,
        asn=asn,
        prev_country=prev_country,
        prev_city=prev_city,
        geo_distance_km=geo_distance_km,
        impossible_travel=impossible_travel,
        is_simulated=is_simulated,
    )
