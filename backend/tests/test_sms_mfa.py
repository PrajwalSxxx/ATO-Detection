"""Comprehensive automated test suite for SMS-based OTP delivery,
phone verification, and adaptive MFA integration.
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.utils.phone_utils import validate_and_normalize_phone, mask_phone_number
from app.services.sms_service import (
    sms_service,
    SMSDeliveryResult,
    get_mock_sms_outbox,
    clear_mock_sms_outbox,
)
from app.services.adaptive_auth_service import (
    create_mfa_challenge,
    verify_mfa_challenge,
    MFAChallengeResult,
)
from app.core.exceptions import MFAInvalidError, MFACooldownError, AccountLockedError
from app.models.user import User
from app.models.ml_model import MFAVerification
from app.core.security import hash_password
from app.core.config import settings


class TestPhoneUtils:
    """Tests for phone parsing, validation, and masking utilities."""

    def test_indian_phone_normalization(self):
        # 10-digit without country code defaults to India (+91)
        res1 = validate_and_normalize_phone("9876543210", default_region="IN")
        assert res1 == "+919876543210"

        # 0-prefixed Indian number
        res2 = validate_and_normalize_phone("09876543210", default_region="IN")
        assert res2 == "+919876543210"

        # Explicit +91 with spaces and dashes
        res3 = validate_and_normalize_phone("+91 98765-43210")
        assert res3 == "+919876543210"

    def test_international_phone_normalization(self):
        # US number (+1)
        res_us = validate_and_normalize_phone("+1 650 253 0000")
        assert res_us == "+16502530000"

        # UK number (+44)
        res_uk = validate_and_normalize_phone("+44 7911 123456")
        assert res_uk == "+447911123456"

    def test_invalid_phone_rejection(self):
        # Too short raises ValueError
        with pytest.raises(ValueError, match="Invalid phone number"):
            validate_and_normalize_phone("1234")

        # Alphabetic raises ValueError
        with pytest.raises(ValueError, match="Invalid phone number"):
            validate_and_normalize_phone("not-a-number")

        # Empty raises ValueError
        with pytest.raises(ValueError, match="required"):
            validate_and_normalize_phone("")

    def test_phone_masking(self):
        # Full E.164 masking preserves country code and last 4 digits
        masked = mask_phone_number("+919876543210")
        assert masked == "+91 ******3210"

        # US number
        masked_us = mask_phone_number("+16502530000")
        assert masked_us == "+1 ******0000"

        # Empty / None handling defaults safely
        assert mask_phone_number("") == "******0000"
        assert mask_phone_number(None) == "******0000"


class TestSMSService:
    """Tests for pluggable SMS delivery service."""

    def test_mock_sms_delivery(self):
        clear_mock_sms_outbox()
        res = sms_service.send_otp_sms(
            phone_number="+919876543210",
            plain_otp="123456",
            purpose="login_mfa",
        )
        assert res.success is True
        assert res.provider == "mock"
        assert res.status == "mock_delivered"
        assert res.destination_masked == "+91 ******3210"

        messages = get_mock_sms_outbox()
        assert len(messages) >= 1
        assert messages[-1]["destination"] == "+919876543210"
        assert messages[-1]["otp"] == "123456"
        assert "login_mfa" in messages[-1]["purpose"]

    def test_registration_sms_body(self):
        clear_mock_sms_outbox()
        sms_service.send_otp_sms(
            phone_number="+919876543210",
            plain_otp="654321",
            purpose="registration_verify",
        )
        messages = get_mock_sms_outbox()
        assert len(messages) >= 1
        assert "registration verification code" in messages[-1]["body"].lower()


class TestRegistrationAndAdaptiveMFA:
    """Tests for registration OTP verification, mobile ownership, and adaptive MFA lifecycle."""

    def test_registration_otp_verification_flow(self, db_session):
        clear_mock_sms_outbox()
        # 1. Create unverified user during registration
        norm_phone = validate_and_normalize_phone("+91 99887 76655")
        user = User(
            email="reg_test@test.com",
            hashed_password=hash_password("SecurePass123!"),
            full_name="Registration Test User",
            phone_number=norm_phone,
            phone_verified=False,
            is_active=True,
            role="user",
        )
        db_session.add(user)
        db_session.commit()

        # 2. Dispatch registration challenge
        challenge = create_mfa_challenge(
            db=db_session,
            user=user,
            purpose="registration_verify",
            target_phone=norm_phone,
        )
        assert challenge.delivery_status == "mock_delivered"
        assert challenge.masked_phone == "+91 ******6655"
        plain_otp = challenge.plain_otp

        # 3. Wrong OTP rejected
        with pytest.raises(MFAInvalidError, match="Invalid OTP"):
            verify_mfa_challenge(
                db=db_session,
                user=user,
                plain_otp="000000",
                purpose="registration_verify",
            )

        # 4. Correct OTP verifies user's mobile number
        success = verify_mfa_challenge(
            db=db_session,
            user=user,
            plain_otp=plain_otp,
            purpose="registration_verify",
        )
        assert success is True
        db_session.refresh(user)
        assert user.phone_verified is True

    def test_unverified_phone_rejected_for_login_mfa(self, db_session):
        unverified_user = User(
            email="unverified_login@test.com",
            hashed_password=hash_password("Pass123!"),
            phone_number="+919876543211",
            phone_verified=False,
            is_active=True,
        )
        db_session.add(unverified_user)
        db_session.commit()

        # create_mfa_challenge for login_mfa MUST fail because phone is not verified
        with pytest.raises(MFAInvalidError, match="No verified phone number"):
            create_mfa_challenge(
                db=db_session,
                user=unverified_user,
                purpose="login_mfa",
            )

    def test_login_mfa_lifecycle(self, db_session):
        clear_mock_sms_outbox()
        phone_user = User(
            email="mfa_active@test.com",
            hashed_password=hash_password("User@SecurePass123"),
            phone_number="+919811122233",
            phone_verified=True,
            is_active=True,
            role="user",
        )
        db_session.add(phone_user)
        db_session.commit()

        # 1. Step-up MFA challenge created
        challenge = create_mfa_challenge(
            db=db_session,
            user=phone_user,
            purpose="login_mfa",
        )
        assert challenge.masked_phone == "+91 ******2233"
        assert challenge.delivery_status == "mock_delivered"
        plain_otp = challenge.plain_otp

        # 2. Verify with correct OTP succeeds
        assert verify_mfa_challenge(
            db=db_session,
            user=phone_user,
            plain_otp=plain_otp,
            purpose="login_mfa",
        ) is True

        # 3. OTP cannot be reused
        with pytest.raises(MFAInvalidError, match="No active OTP challenge"):
            verify_mfa_challenge(
                db=db_session,
                user=phone_user,
                plain_otp=plain_otp,
                purpose="login_mfa",
            )

    def test_mfa_resend_cooldown_enforcement(self, db_session):
        user = User(
            email="cooldown_check@test.com",
            hashed_password=hash_password("Pass123!"),
            phone_number="+919833344455",
            phone_verified=True,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        # First dispatch
        create_mfa_challenge(db=db_session, user=user, purpose="login_mfa")

        # Immediate resend within 30s cooldown must raise MFACooldownError
        with pytest.raises(MFACooldownError, match="wait"):
            create_mfa_challenge(db=db_session, user=user, purpose="login_mfa")

    def test_expired_otp_rejection(self, db_session):
        user = User(
            email="expired_check@test.com",
            hashed_password=hash_password("Pass123!"),
            phone_number="+919844455566",
            phone_verified=True,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        challenge = create_mfa_challenge(db=db_session, user=user, purpose="login_mfa")
        otp = challenge.plain_otp

        # Backdate expiration in DB
        db_record = (
            db_session.query(MFAVerification)
            .filter(MFAVerification.user_id == user.id)
            .order_by(MFAVerification.created_at.desc())
            .first()
        )
        db_record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db_session.commit()

        with pytest.raises(MFAInvalidError, match="expired"):
            verify_mfa_challenge(
                db=db_session,
                user=user,
                plain_otp=otp,
                purpose="login_mfa",
            )

    def test_max_attempts_lockout(self, db_session):
        user = User(
            email="lockout_check@test.com",
            hashed_password=hash_password("Pass123!"),
            phone_number="+919855566677",
            phone_verified=True,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        create_mfa_challenge(db=db_session, user=user, purpose="login_mfa")

        # Submit wrong OTP up to MFA_MAX_ATTEMPTS (default 5)
        for i in range(settings.MFA_MAX_ATTEMPTS - 1):
            with pytest.raises(MFAInvalidError, match="Invalid OTP"):
                verify_mfa_challenge(
                    db=db_session,
                    user=user,
                    plain_otp=f"99999{i}",
                    purpose="login_mfa",
                )

        # Final failed attempt triggers AccountLockedError
        with pytest.raises(AccountLockedError, match="Too many failed OTP attempts"):
            verify_mfa_challenge(
                db=db_session,
                user=user,
                plain_otp="000000",
                purpose="login_mfa",
            )
