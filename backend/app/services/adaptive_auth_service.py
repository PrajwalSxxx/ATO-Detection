"""Adaptive authentication service: MFA challenge creation and verification."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    MFAInvalidError,
    MFACooldownError,
    AccountLockedError,
)
from app.models.ml_model import MFAVerification
from app.models.user import User
from app.models.login_event import LoginEvent
from app.utils.otp_utils import generate_otp, verify_otp_hash
from app.utils.phone_utils import mask_phone_number
from app.services.sms_service import sms_service, SMSDeliveryResult
from dataclasses import dataclass


@dataclass
class MFAChallengeResult:
    plain_otp: str
    masked_phone: str
    delivery_status: str
    provider: str
    challenge_id: str

    def __str__(self) -> str:
        return self.plain_otp


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def create_mfa_challenge(
    db: Session,
    user: User,
    login_event_id: Optional[str] = None,
    purpose: str = "login_mfa",
    target_phone: Optional[str] = None,
) -> MFAChallengeResult:
    """
    Create an MFA challenge for the given user and dispatch OTP via SMS service.
    - For login_mfa: strictly requires a verified registered phone number.
    - For registration_verify: sends OTP to the newly provided target_phone.
    Enforces resend cooldown and records masked destination.
    """
    now = datetime.now(timezone.utc)

    # Determine destination phone
    if purpose == "registration_verify":
        phone_to_send = target_phone or user.phone_number
        if not phone_to_send:
            raise MFAInvalidError("Mobile phone number is required for registration verification.")
    else:
        # Never trust an unverified phone number for MFA delivery
        if not user.phone_number or not user.phone_verified:
            raise MFAInvalidError("No verified phone number configured for SMS MFA. Access cannot be granted.")
        phone_to_send = user.phone_number

    masked_phone = mask_phone_number(phone_to_send)

    # Check cooldown — look for a recent non-expired challenge
    recent = (
        db.query(MFAVerification)
        .filter(
            MFAVerification.user_id == user.id,
            MFAVerification.purpose == purpose,
            MFAVerification.is_used == False,
            MFAVerification.is_expired == False,
        )
        .order_by(MFAVerification.created_at.desc())
        .first()
    )
    if recent:
        exp = _to_utc(recent.expires_at)
        last_sent = _to_utc(recent.last_sent_at)
        if exp and exp > now and last_sent:
            cooldown_secs = settings.MFA_RESEND_COOLDOWN_SECONDS
            elapsed = (now - last_sent).total_seconds()
            if elapsed < cooldown_secs:
                raise MFACooldownError(
                    f"Please wait {int(cooldown_secs - elapsed)} seconds before requesting another OTP."
                )

    # Invalidate any old pending challenges for this purpose
    db.query(MFAVerification).filter(
        MFAVerification.user_id == user.id,
        MFAVerification.purpose == purpose,
        MFAVerification.is_used == False,
        MFAVerification.is_expired == False,
    ).update({"is_expired": True})

    # Generate new secure 6-digit OTP
    plain_otp, otp_hash = generate_otp()
    expires_at = now + timedelta(minutes=settings.MFA_OTP_EXPIRE_MINUTES)

    # Dispatch via SMS service
    sms_res: SMSDeliveryResult = sms_service.send_otp_sms(
        phone_number=phone_to_send,
        plain_otp=plain_otp,
        purpose=purpose,
    )

    mfa = MFAVerification(
        id=str(uuid.uuid4()),
        user_id=user.id,
        login_event_id=login_event_id,
        otp_hash=otp_hash,
        attempts=0,
        is_used=False,
        is_expired=False,
        expires_at=expires_at,
        last_sent_at=now,
        phone_number_masked=masked_phone,
        delivery_channel="sms",
        delivery_status=sms_res.status,
        provider=sms_res.provider,
        message_id=sms_res.message_id,
        purpose=purpose,
    )
    db.add(mfa)

    # Update login event if associated
    if login_event_id:
        login_evt = db.query(LoginEvent).filter(LoginEvent.id == login_event_id).first()
        if login_evt:
            login_evt.mfa_phone_masked = masked_phone
            login_evt.mfa_delivery_status = sms_res.status
            db.add(login_evt)

    db.flush()

    # Redact raw OTP in production logs
    if settings.APP_ENV != "production":
        print(f"[MFA OTP] Sent to {masked_phone} ({purpose}) via {sms_res.provider}: {plain_otp}")

    return MFAChallengeResult(
        plain_otp=plain_otp,
        masked_phone=masked_phone,
        delivery_status=sms_res.status,
        provider=sms_res.provider,
        challenge_id=mfa.id,
    )


def verify_mfa_challenge(
    db: Session,
    user: User,
    plain_otp: str,
    purpose: str = "login_mfa",
) -> bool:
    """
    Verify the submitted OTP against the latest pending challenge.
    Enforces max attempts and expiry.
    Returns True on success.
    Raises MFAInvalidError on failure.
    """
    now = datetime.now(timezone.utc)
    mfa = (
        db.query(MFAVerification)
        .filter(
            MFAVerification.user_id == user.id,
            MFAVerification.purpose == purpose,
            MFAVerification.is_used == False,
            MFAVerification.is_expired == False,
        )
        .order_by(MFAVerification.created_at.desc())
        .first()
    )

    if not mfa:
        raise MFAInvalidError("No active OTP challenge found. Please request a new OTP.")

    exp = _to_utc(mfa.expires_at)
    if exp and exp <= now:
        mfa.is_expired = True
        db.add(mfa)
        raise MFAInvalidError("OTP has expired. Please request a new OTP.")

    if mfa.attempts >= settings.MFA_MAX_ATTEMPTS:
        mfa.is_expired = True
        db.add(mfa)
        raise AccountLockedError("Too many failed OTP attempts. Please request a new OTP.")

    mfa.attempts += 1
    db.add(mfa)

    if not verify_otp_hash(plain_otp, mfa.otp_hash):
        remaining = settings.MFA_MAX_ATTEMPTS - mfa.attempts
        if remaining <= 0:
            mfa.is_expired = True
            db.add(mfa)
            raise AccountLockedError("Too many failed OTP attempts. Please request a new OTP.")
        raise MFAInvalidError(f"Invalid OTP. {remaining} attempt(s) remaining.")

    # Mark as used
    mfa.is_used = True
    mfa.verified_at = now
    db.add(mfa)

    # If registration verification, mark user's phone_verified as True
    if purpose == "registration_verify":
        user.phone_verified = True
        db.add(user)

    db.flush()
    return True
