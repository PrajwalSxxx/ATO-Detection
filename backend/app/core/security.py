"""Security utilities: password hashing, JWT, and auth dependencies."""
from __future__ import annotations

import enum
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import (
    TokenExpiredError,
    TokenInvalidError,
    PermissionDeniedError,
    AccountLockedError,
    AccountDisabledError,
)

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
_ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)

# A dummy hash used for constant-time comparison when user is not found
_DUMMY_HASH = _ph.hash("dummy_password_for_timing_safety")


def hash_password(plain: str) -> str:
    """Hash a password using Argon2id."""
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its hash. Always runs (timing-safe)."""
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def timing_safe_verify(plain: str, hashed: Optional[str]) -> bool:
    """
    Always call verify to prevent timing-based user enumeration.
    If hashed is None (user not found), use dummy hash and return False.
    """
    if hashed is None:
        verify_password(plain, _DUMMY_HASH)
        return False
    return verify_password(plain, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises ATOBaseException on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError()
    except JWTError:
        raise TokenInvalidError()


# ---------------------------------------------------------------------------
# Role enum
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    user = "user"


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


def _extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Extract token from Authorization header or cookie."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    # Try cookie
    return request.cookies.get("access_token")


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
):
    """Dependency: returns decoded JWT payload dict for the current user."""
    token = _extract_token(request, credentials)
    if not token:
        raise TokenInvalidError("No authentication token provided")
    payload = decode_token(token)
    sub = payload.get("sub")
    if not sub:
        raise TokenInvalidError("Token missing subject")
    return payload


def require_role(roles: List[UserRole]):
    """Dependency factory: requires the current user to have one of the given roles."""
    def _check(payload: dict = Depends(get_current_user)):
        user_role = payload.get("role")
        allowed = [r.value if isinstance(r, UserRole) else r for r in roles]
        if user_role not in allowed:
            raise PermissionDeniedError(
                f"Role '{user_role}' is not authorized. Required: {allowed}"
            )
        return payload
    return _check
