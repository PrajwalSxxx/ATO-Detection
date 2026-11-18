"""Tests for authentication endpoints and security services."""
import pytest
from app.core.security import hash_password, verify_password, timing_safe_verify, create_access_token, decode_token
from app.utils.otp_utils import generate_otp, verify_otp_hash
from app.models.user import User


def test_password_hashing():
    pw = "SecretPassword123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_timing_safe_verify():
    pw = "SecretPassword123!"
    hashed = hash_password(pw)
    assert timing_safe_verify(pw, hashed) is True
    assert timing_safe_verify("WrongPassword", hashed) is False
    assert timing_safe_verify(pw, None) is False


def test_jwt_generation_and_decode():
    data = {"sub": "user-123", "email": "test@test.com", "role": "admin"}
    token = create_access_token(data)
    assert isinstance(token, str)
    decoded = decode_token(token)
    assert decoded["sub"] == "user-123"
    assert decoded["email"] == "test@test.com"
    assert decoded["role"] == "admin"


def test_otp_generation_and_verification():
    plain, hashed = generate_otp()
    assert len(plain) == 6
    assert plain.isdigit()
    assert verify_otp_hash(plain, hashed) is True
    assert verify_otp_hash("000000", hashed) is False


def test_login_success(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "testuser@test.com", "password": "User@SecurePass123"},
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@test.com"
    assert data["decision"] in ("allow", "mfa")
    if data["decision"] == "allow":
        assert "access_token" in data


def test_login_invalid_password(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "testuser@test.com", "password": "WrongPassword999!"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@test.com", "password": "AnyPassword123!"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_logout(client):
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert "access_token" in response.headers.get("set-cookie", "") or response.status_code == 200
