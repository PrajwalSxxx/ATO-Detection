"""Pydantic schemas for auth endpoints."""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_fingerprint: Optional[str] = None
    device_category: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Password cannot be empty")
        return v


class LoginResponse(BaseModel):
    decision: str
    risk_score: float
    risk_level: str
    login_event_id: str
    user_id: str
    email: str
    role: str
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    mfa_required: Optional[bool] = None
    blocked: Optional[bool] = None
    message: Optional[str] = None
    dev_otp: Optional[str] = None
    user: Optional[dict] = None


class MFAVerifyRequest(BaseModel):
    login_event_id: Optional[str] = None
    email: Optional[str] = None
    temp_token: Optional[str] = None
    otp: str


class MFAVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    role: str
    user: Optional[dict] = None


class MFAResendRequest(BaseModel):
    login_event_id: Optional[str] = None
    email: Optional[str] = None
    temp_token: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
