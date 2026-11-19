"""Phone number validation, normalization (E.164), and masking utilities."""
from __future__ import annotations
from typing import Optional
import phonenumbers
from phonenumbers import PhoneNumberFormat, NumberParseException


def validate_and_normalize_phone(phone_str: Optional[str], default_region: str = "IN") -> str:
    """
    Validate a phone number and normalize to canonical E.164 format (e.g. +919876543210).
    Supports Indian numbers (10-digit, 0-prefixed, or +91) and international numbers (+1, +44, etc.).
    Raises ValueError with a user-friendly message if invalid.
    """
    if not phone_str or not phone_str.strip():
        raise ValueError("Phone number is required.")

    cleaned = phone_str.strip()

    # If starts with + (international format), parse without default region or with default
    try:
        if cleaned.startswith("+"):
            parsed = phonenumbers.parse(cleaned, None)
        else:
            # Handle Indian 10-digit or leading 0 numbers
            parsed = phonenumbers.parse(cleaned, default_region)
    except NumberParseException as e:
        raise ValueError(f"Invalid phone number: {e._msg}")

    if not phonenumbers.is_valid_number(parsed):
        raise ValueError("Invalid phone number: does not match any valid international dialing pattern.")

    # Format into canonical E.164: +<country_code><national_number>
    return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)


def mask_phone_number(phone_str: Optional[str]) -> str:
    """
    Mask a phone number for privacy in API responses, logs, and UI displays.
    Example: '+919876543210' -> '+91 ******3210' or '******3210'.
    Guarantees that raw numbers are never exposed to clients or unauthorized viewers.
    """
    if not phone_str:
        return "******0000"

    raw = phone_str.strip()
    digits = "".join(ch for ch in raw if ch.isdigit())

    if len(digits) < 4:
        return "******" + digits

    last_4 = digits[-4:]

    # If formatted as E.164 with international country code
    if raw.startswith("+"):
        try:
            parsed = phonenumbers.parse(raw, None)
            country_code = parsed.country_code
            return f"+{country_code} ******{last_4}"
        except Exception:
            return f"******{last_4}"

    return f"******{last_4}"
