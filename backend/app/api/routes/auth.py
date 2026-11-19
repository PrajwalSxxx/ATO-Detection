"""Authentication API routes."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db_session
from app.core.exceptions import (
    ResourceNotFoundError,
    MFAInvalidError,
    AccountLockedError,
)
from app.core.rate_limit import limiter
from app.core.security import create_access_token, get_current_user
from app.models.login_event import LoginEvent
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    MFAResendRequest,
)
from app.services.adaptive_auth_service import create_mfa_challenge, verify_mfa_challenge
from app.services.auth_service import process_login
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str:
    """Get the client's real IP address from headers or connection."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Session = Depends(get_db_session),
):
    """Authenticate user with adaptive risk-based authentication."""
    ip = _get_client_ip(request)
    ua = request.headers.get("User-Agent", "Unknown")

    result = process_login(
        db,
        body.email,
        body.password,
        ip,
        ua,
        device_fingerprint=body.device_fingerprint,
        device_category=body.device_category,
    )

    user = db.query(User).filter(User.id == result["user_id"]).first()
    if user:
        result["user"] = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
        }

    # If MFA is required, immediately create an MFA challenge
    if result.get("mfa_required"):
        if user:
            plain_otp = create_mfa_challenge(db, user, login_event_id=result.get("login_event_id"))
            db.commit()
            if settings.APP_ENV in ("development", "test"):
                result["dev_otp"] = plain_otp

    # Set auth cookie if access_token issued
    if result.get("access_token"):
        response.set_cookie(
            key="access_token",
            value=result["access_token"],
            httponly=True,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    return result


@router.post("/mfa/verify", response_model=MFAVerifyResponse)
@router.post("/verify-otp", response_model=MFAVerifyResponse)
@limiter.limit(settings.RATE_LIMIT_OTP)
def verify_mfa(
    request: Request,
    response: Response,
    body: MFAVerifyRequest,
    db: Session = Depends(get_db_session),
):
    """Verify MFA OTP and complete login."""
    login_event = None
    user = None

    if body.login_event_id:
        login_event = db.query(LoginEvent).filter(LoginEvent.id == body.login_event_id).first()
        if login_event:
            user = db.query(User).filter(User.id == login_event.user_id).first()

    if not user and body.email:
        user = db.query(User).filter(User.email == body.email).first()
        if user:
            login_event = (
                db.query(LoginEvent)
                .filter(LoginEvent.user_id == user.id)
                .order_by(LoginEvent.created_at.desc())
                .first()
            )

    if not user:
        raise ResourceNotFoundError("User not found for MFA verification")

    # Verify OTP
    verify_mfa_challenge(db, user, body.otp)

    # Mark login event as completed
    if login_event:
        login_event.mfa_completed = True
        db.add(login_event)

    write_audit_log(
        db,
        "MFA_SUCCESS",
        user_id=user.id,
        ip_address=_get_client_ip(request),
        status="success",
    )
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return MFAVerifyResponse(
        access_token=token,
        token_type="bearer",
        email=user.email,
        role=user.role,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
        },
    )


@router.post("/mfa/resend")
@router.post("/resend-otp")
@limiter.limit(settings.RATE_LIMIT_OTP)
def resend_mfa(
    request: Request,
    body: MFAResendRequest,
    db: Session = Depends(get_db_session),
):
    """Resend a new MFA OTP for an active login challenge."""
    login_event = None
    user = None

    if body.login_event_id:
        login_event = db.query(LoginEvent).filter(LoginEvent.id == body.login_event_id).first()
        if login_event:
            user = db.query(User).filter(User.id == login_event.user_id).first()

    if not user and body.email:
        user = db.query(User).filter(User.email == body.email).first()

    if not user:
        raise ResourceNotFoundError("User not found")

    login_evt_id = login_event.id if login_event else None
    plain_otp = create_mfa_challenge(db, user, login_event_id=login_evt_id)
    db.commit()

    return {"message": "OTP resent successfully", "dev_otp": plain_otp if settings.APP_ENV in ("development", "test") else None}


@router.get("/me")
def get_me(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Return currently authenticated user profile."""
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise ResourceNotFoundError("User not found")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/logout")
def logout(response: Response):
    """Log out current user by clearing the auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}
