"""Authentication API routes."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db_session
from app.core.exceptions import (
    ResourceNotFoundError,
    MFAInvalidError,
    AccountLockedError,
    UserAlreadyExistsError,
)
from app.core.rate_limit import limiter
from app.core.security import create_access_token, get_current_user, hash_password
from app.models.login_event import LoginEvent
from app.models.user import User
from app.utils.phone_utils import validate_and_normalize_phone, mask_phone_number
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    MFAResendRequest,
    RegisterRequest,
    RegisterResponse,
    VerifyRegistrationOTPRequest,
    VerifyRegistrationOTPResponse,
)
from app.services.adaptive_auth_service import create_mfa_challenge, verify_mfa_challenge
from app.services.auth_service import process_login
from app.services.audit_service import write_audit_log
from app.core.ip_resolver import resolve_client_ip

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str:
    """Get the client's real IP address from headers or connection using topology-aware resolver."""
    info = resolve_client_ip(request)
    return info.ip


@router.post("/register", response_model=RegisterResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def register(
    request: Request,
    body: RegisterRequest,
    db: Session = Depends(get_db_session),
):
    """
    User self-registration with mandatory mobile phone verification.
    Validates mobile format (supports Indian & international E.164), checks for duplicates,
    and dispatches a 6-digit registration OTP via SMS.
    """
    from fastapi import HTTPException

    # 1. Check duplicate email
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise UserAlreadyExistsError()

    # 2. Validate and normalize mobile number
    try:
        normalized_phone = validate_and_normalize_phone(body.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 3. Check duplicate phone number
    existing_phone = db.query(User).filter(User.phone_number == normalized_phone).first()
    if existing_phone:
        raise HTTPException(status_code=409, detail="A user with this mobile number already exists.")

    # 4. Create user record (phone_verified=False initially)
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name or body.email.split("@")[0],
        role="user",
        is_active=True,
        phone_number=normalized_phone,
        phone_verified=False,
        mfa_enabled=True,
    )
    db.add(user)
    db.flush()

    # 5. Dispatch Registration OTP via SMS
    mfa_res = create_mfa_challenge(
        db,
        user,
        purpose="registration_verify",
        target_phone=normalized_phone,
    )

    write_audit_log(
        db,
        "USER_REGISTRATION_INITIATED",
        user_id=user.id,
        ip_address=_get_client_ip(request),
        status="pending_verification",
        details={"phone_masked": mfa_res.masked_phone},
    )

    db.commit()

    return RegisterResponse(
        user_id=user.id,
        email=user.email,
        phone_number_masked=mfa_res.masked_phone,
        phone_verified=False,
        message="Account created. Please enter the 6-digit code sent via SMS to verify your mobile number.",
        delivery_status=mfa_res.delivery_status,
        dev_otp=mfa_res.plain_otp if settings.APP_ENV != "production" else None,
    )


@router.post("/verify-registration-otp", response_model=VerifyRegistrationOTPResponse)
@router.post("/register/verify", response_model=VerifyRegistrationOTPResponse)
@limiter.limit(settings.RATE_LIMIT_OTP)
def verify_registration_otp(
    request: Request,
    response: Response,
    body: VerifyRegistrationOTPRequest,
    db: Session = Depends(get_db_session),
):
    """
    Verify registration OTP sent to mobile phone.
    Once verified, marks phone_verified=True and issues authentication token.
    """
    user = None
    if body.user_id:
        user = db.query(User).filter(User.id == body.user_id).first()
    if not user and body.email:
        user = db.query(User).filter(User.email == body.email).first()

    if not user:
        raise ResourceNotFoundError("User not found for registration verification")

    # Verify registration OTP
    try:
        verify_mfa_challenge(db, user, body.otp, purpose="registration_verify")
    except (MFAInvalidError, AccountLockedError) as err:
        write_audit_log(
            db,
            "REGISTRATION_OTP_FAILED",
            user_id=user.id,
            ip_address=_get_client_ip(request),
            status="failure",
            details={"error": str(err)},
        )
        db.commit()
        raise

    write_audit_log(
        db,
        "PHONE_VERIFIED",
        user_id=user.id,
        ip_address=_get_client_ip(request),
        status="success",
        details={"phone_masked": mask_phone_number(user.phone_number)},
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

    return VerifyRegistrationOTPResponse(
        user_id=user.id,
        email=user.email,
        phone_verified=True,
        message="Mobile number verified successfully. Welcome to the platform!",
        access_token=token,
        token_type="bearer",
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Session = Depends(get_db_session),
):
    """Authenticate user with adaptive risk-based authentication."""
    client_ip_info = resolve_client_ip(request, client_reported_ip=body.client_reported_ip)
    ua = request.headers.get("User-Agent", "Unknown")

    result = process_login(
        db,
        body.email,
        body.password,
        client_ip_info.ip,
        ua,
        device_fingerprint=body.device_fingerprint,
        device_category=body.device_category,
        ip_source=client_ip_info.source,
        ip_trust_status=client_ip_info.trust_status,
    )

    user = db.query(User).filter(User.id == result["user_id"]).first()
    if user:
        result["user"] = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
        }

    # If MFA is required, dispatch SMS OTP challenge to the user's verified phone
    if result.get("mfa_required"):
        if user:
            try:
                mfa_res = create_mfa_challenge(
                    db,
                    user,
                    login_event_id=result.get("login_event_id"),
                    purpose="login_mfa",
                )
                db.commit()
                result["destination_masked"] = mfa_res.masked_phone
                result["delivery_status"] = mfa_res.delivery_status
                if settings.APP_ENV != "production":
                    result["dev_otp"] = mfa_res.plain_otp
            except MFAInvalidError as e:
                result["message"] = str(e)

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

    # Verify OTP against stored hash
    try:
        verify_mfa_challenge(db, user, body.otp, purpose="login_mfa")
    except (MFAInvalidError, AccountLockedError) as err:
        write_audit_log(
            db,
            "MFA_FAILED",
            user_id=user.id,
            ip_address=_get_client_ip(request),
            status="failure",
            details={"error": str(err)},
        )
        db.commit()
        raise

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
        details={"destination_masked": mask_phone_number(user.phone_number)},
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
    """Resend a new MFA OTP via SMS for an active login or registration challenge."""
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
    purpose = getattr(body, "purpose", "login_mfa") or "login_mfa"

    mfa_res = create_mfa_challenge(db, user, login_event_id=login_evt_id, purpose=purpose)
    db.commit()

    return {
        "message": f"OTP resent successfully via SMS to {mfa_res.masked_phone}.",
        "destination_masked": mfa_res.masked_phone,
        "delivery_status": mfa_res.delivery_status,
        "dev_otp": mfa_res.plain_otp if settings.APP_ENV != "production" else None,
    }


@router.get("/me")
def get_me(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Return currently authenticated user profile including verified mobile status."""
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise ResourceNotFoundError("User not found")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "phone_number": user.phone_number,
        "phone_number_masked": mask_phone_number(user.phone_number),
        "phone_verified": user.phone_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/logout")
def logout(response: Response):
    """Log out current user by clearing the auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}
