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
from app.utils.otp_utils import generate_otp, verify_otp_hash


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
) -> str:
    """
    Create an MFA challenge for the given user.
    Returns the plain OTP (for dev printing; in prod would be emailed).
    Enforces resend cooldown.
    """
    now = datetime.now(timezone.utc)

    # Check cooldown — look for a recent non-expired challenge
    recent = (
        db.query(MFAVerification)
        .filter(
            MFAVerification.user_id == user.id,
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
                    f"Please wait {int(cooldown_secs - elapsed)} seconds before requesting another OTP"
                )

    # Invalidate any old pending challenges
    db.query(MFAVerification).filter(
        MFAVerification.user_id == user.id,
        MFAVerification.is_used == False,
        MFAVerification.is_expired == False,
    ).update({"is_expired": True})

    # Generate new OTP
    plain_otp, otp_hash = generate_otp()
    expires_at = now + timedelta(minutes=settings.MFA_OTP_EXPIRE_MINUTES)

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
    )
    db.add(mfa)
    db.flush()

    # Dev-only: print OTP to console
    if settings.APP_ENV in ("development", "test"):
        print(f"[DEV MFA] OTP for {user.email}: {plain_otp}")

    return plain_otp


def verify_mfa_challenge(
    db: Session,
    user: User,
    plain_otp: str,
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
    return True
