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
    destination_masked: Optional[str] = None
    delivery_status: Optional[str] = None
    user: Optional[dict] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone_number: str

    @field_validator("password")
    @classmethod
    def password_len(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class RegisterResponse(BaseModel):
    user_id: str
    email: str
    phone_number_masked: str
    phone_verified: bool
    message: str
    delivery_status: Optional[str] = None
    dev_otp: Optional[str] = None


class VerifyRegistrationOTPRequest(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    otp: str


class VerifyRegistrationOTPResponse(BaseModel):
    user_id: str
    email: str
    phone_verified: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"


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
    purpose: Optional[str] = "login_mfa"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
