"""Pydantic schemas for user endpoints."""
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    mfa_enabled: bool = False
    phone_number: Optional[str] = None
    phone_verified: bool = False


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None
    mfa_enabled: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: str
    is_locked: bool
    failed_login_count: int
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
