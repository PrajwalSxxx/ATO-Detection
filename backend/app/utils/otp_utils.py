"""OTP generation and verification utilities."""
import secrets
import hashlib


def generate_otp() -> tuple[str, str]:
    """Generate a 6-digit OTP. Returns (plain_otp, hashed_otp)."""
    otp = str(secrets.randbelow(900000) + 100000)
    hashed = hashlib.sha256(otp.encode()).hexdigest()
    return otp, hashed


def verify_otp_hash(plain_otp: str, stored_hash: str) -> bool:
    """Verify OTP against stored hash using constant-time comparison."""
    computed = hashlib.sha256(plain_otp.encode()).hexdigest()
    return secrets.compare_digest(computed, stored_hash)
