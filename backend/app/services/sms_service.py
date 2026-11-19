"""
Reusable SMS Service for Registration & Adaptive MFA Verification.
Supports Twilio, Fast2SMS (Indian Gateway), and an Offline Mock Provider.
"""
from __future__ import annotations
import time
import uuid
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List
import httpx

from app.core.config import settings
from app.utils.phone_utils import mask_phone_number


@dataclass
class SMSDeliveryResult:
    success: bool
    status: str           # "sent", "delivered", "mock_delivered", "failed", "queued"
    provider: str         # "mock", "twilio", "fast2sms"
    message_id: Optional[str] = None
    destination_masked: str = ""
    error_message: Optional[str] = None
    timestamp: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# In-memory store for mock SMS in development/testing
_MOCK_SMS_OUTBOX: List[Dict[str, Any]] = []


def get_mock_sms_outbox() -> List[Dict[str, Any]]:
    """Retrieve simulated SMS messages sent via mock provider."""
    return list(_MOCK_SMS_OUTBOX)


def get_last_mock_sms() -> Optional[Dict[str, Any]]:
    """Retrieve the most recent simulated SMS message."""
    return _MOCK_SMS_OUTBOX[-1] if _MOCK_SMS_OUTBOX else None


def clear_mock_sms_outbox() -> None:
    """Clear simulated mock outbox."""
    global _MOCK_SMS_OUTBOX
    _MOCK_SMS_OUTBOX.clear()


class SMSService:
    """
    Central SMS dispatching service with pluggable providers,
    tamper-proof delivery status handling, and production privacy controls.
    """

    def __init__(self):
        self.provider = (getattr(settings, "SMS_PROVIDER", "mock") or "mock").lower()
        self.timeout = getattr(settings, "SMS_TIMEOUT_SECONDS", 8.0)

    def send_otp_sms(
        self,
        phone_number: str,
        plain_otp: str,
        purpose: str = "login_mfa",
    ) -> SMSDeliveryResult:
        """
        Send an OTP code via SMS to the specified destination.
        SECURITY: In production logs, plain_otp is strictly redacted.
        """
        masked = mask_phone_number(phone_number)
        now = time.time()

        if purpose == "registration_verify":
            body_text = f"Your ATO-Detection registration verification code is: {plain_otp}. Valid for {settings.MFA_OTP_EXPIRE_MINUTES} mins."
        else:
            body_text = f"Your ATO-Detection security verification code is: {plain_otp}. Valid for {settings.MFA_OTP_EXPIRE_MINUTES} mins. Do not share."

        # Dispatch based on provider
        if self.provider == "twilio":
            return self._send_via_twilio(phone_number, body_text, masked, now)
        elif self.provider == "fast2sms":
            return self._send_via_fast2sms(phone_number, plain_otp, masked, now)
        else:
            # Default: Mock Provider for offline dev & test
            return self._send_via_mock(phone_number, plain_otp, body_text, masked, purpose, now)

    def _send_via_mock(
        self,
        phone_number: str,
        plain_otp: str,
        body_text: str,
        masked: str,
        purpose: str,
        timestamp: float,
    ) -> SMSDeliveryResult:
        """
        Deterministic Mock SMS provider.
        Does not require external credentials or network connectivity.
        """
        msg_id = f"MOCK-SMS-{uuid.uuid4().hex[:12].upper()}"

        record = {
            "message_id": msg_id,
            "destination": phone_number,
            "destination_masked": masked,
            "otp": plain_otp,
            "body": body_text,
            "purpose": purpose,
            "provider": "mock",
            "status": "mock_delivered",
            "timestamp": timestamp,
        }
        _MOCK_SMS_OUTBOX.append(record)

        # Only print in dev/test, never in production
        if getattr(settings, "APP_ENV", "development") != "production":
            print(f"[MOCK SMS] [{masked}] {purpose} -> Message ID: {msg_id}")

        return SMSDeliveryResult(
            success=True,
            status="mock_delivered",
            provider="mock",
            message_id=msg_id,
            destination_masked=masked,
            timestamp=timestamp,
        )

    def _send_via_twilio(
        self,
        phone_number: str,
        body_text: str,
        masked: str,
        timestamp: float,
    ) -> SMSDeliveryResult:
        """Dispatch real SMS using Twilio REST API."""
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
        msg_service_sid = getattr(settings, "TWILIO_MESSAGING_SERVICE_SID", "")

        if not account_sid or not auth_token:
            return SMSDeliveryResult(
                success=False,
                status="failed",
                provider="twilio",
                destination_masked=masked,
                error_message="Twilio credentials (ACCOUNT_SID or AUTH_TOKEN) not configured.",
                timestamp=timestamp,
            )

        if not from_number and not msg_service_sid:
            return SMSDeliveryResult(
                success=False,
                status="failed",
                provider="twilio",
                destination_masked=masked,
                error_message="Neither TWILIO_FROM_NUMBER nor TWILIO_MESSAGING_SERVICE_SID configured.",
                timestamp=timestamp,
            )

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        payload = {
            "To": phone_number,
            "Body": body_text,
        }
        if msg_service_sid:
            payload["MessagingServiceSid"] = msg_service_sid
        else:
            payload["From"] = from_number

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(
                    url,
                    data=payload,
                    auth=(account_sid, auth_token),
                )

                if resp.status_code in (200, 201):
                    data = resp.json()
                    msg_id = data.get("sid", f"TW-{uuid.uuid4().hex[:8]}")
                    status = data.get("status", "sent")
                    return SMSDeliveryResult(
                        success=True,
                        status=status,
                        provider="twilio",
                        message_id=msg_id,
                        destination_masked=masked,
                        timestamp=timestamp,
                    )
                else:
                    err_detail = resp.text
                    return SMSDeliveryResult(
                        success=False,
                        status="failed",
                        provider="twilio",
                        destination_masked=masked,
                        error_message=f"Twilio API Error ({resp.status_code}): {err_detail}",
                        timestamp=timestamp,
                    )
        except Exception as e:
            return SMSDeliveryResult(
                success=False,
                status="failed",
                provider="twilio",
                destination_masked=masked,
                error_message=f"Twilio connection exception: {str(e)}",
                timestamp=timestamp,
            )

    def _send_via_fast2sms(
        self,
        phone_number: str,
        plain_otp: str,
        masked: str,
        timestamp: float,
    ) -> SMSDeliveryResult:
        """Dispatch real Indian SMS using Fast2SMS API."""
        api_key = getattr(settings, "FAST2SMS_API_KEY", "")
        if not api_key:
            return SMSDeliveryResult(
                success=False,
                status="failed",
                provider="fast2sms",
                destination_masked=masked,
                error_message="Fast2SMS API key not configured.",
                timestamp=timestamp,
            )

        # Fast2SMS expects 10 digit Indian number without +91
        clean_num = "".join(ch for ch in phone_number if ch.isdigit())
        if clean_num.startswith("91") and len(clean_num) == 12:
            clean_num = clean_num[2:]

        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "route": "otp",
            "variables_values": plain_otp,
            "numbers": clean_num,
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=payload, headers=headers)
                data = resp.json() if resp.status_code == 200 else {}
                if data.get("return") is True:
                    req_id = data.get("request_id", f"F2S-{uuid.uuid4().hex[:8]}")
                    return SMSDeliveryResult(
                        success=True,
                        status="sent",
                        provider="fast2sms",
                        message_id=req_id,
                        destination_masked=masked,
                        timestamp=timestamp,
                    )
                else:
                    msg = data.get("message", [resp.text])
                    return SMSDeliveryResult(
                        success=False,
                        status="failed",
                        provider="fast2sms",
                        destination_masked=masked,
                        error_message=f"Fast2SMS error: {msg}",
                        timestamp=timestamp,
                    )
        except Exception as e:
            return SMSDeliveryResult(
                success=False,
                status="failed",
                provider="fast2sms",
                destination_masked=masked,
                error_message=f"Fast2SMS exception: {str(e)}",
                timestamp=timestamp,
            )


# Global singleton instance
sms_service = SMSService()
