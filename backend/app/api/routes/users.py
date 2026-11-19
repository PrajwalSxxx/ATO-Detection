"""Users API routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, admin_required, analyst_or_admin_required
from app.core.exceptions import ResourceNotFoundError, UserAlreadyExistsError
from app.core.security import hash_password
from app.models.user import User
from app.models.login_event import LoginEvent
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.schemas.login import LoginEventSchema

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """List users with pagination."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    items = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=UserResponse)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db_session),
    _auth=Depends(admin_required),
):
    """Create a new user (admin only)."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise UserAlreadyExistsError()

    normalized_phone = None
    if body.phone_number:
        from app.utils.phone_utils import validate_and_normalize_phone
        from fastapi import HTTPException
        try:
            normalized_phone = validate_and_normalize_phone(body.phone_number)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # Check duplicate phone
        existing_phone = db.query(User).filter(User.phone_number == normalized_phone).first()
        if existing_phone:
            raise HTTPException(status_code=409, detail="A user with this mobile number already exists.")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        is_active=body.is_active,
        mfa_enabled=body.mfa_enabled,
        phone_number=normalized_phone,
        phone_verified=body.phone_verified if normalized_phone else False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ResourceNotFoundError("User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db_session),
    _auth=Depends(admin_required),
):
    """Update user attributes (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ResourceNotFoundError("User not found")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_locked is not None:
        user.is_locked = body.is_locked
        if not body.is_locked:
            user.failed_login_count = 0
            user.locked_until = None
    if body.mfa_enabled is not None:
        user.mfa_enabled = body.mfa_enabled
    if body.password is not None:
        user.hashed_password = hash_password(body.password)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}/logins")
def get_user_login_history(
    user_id: str,
    limit: int = 20,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get recent login history for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ResourceNotFoundError("User not found")

    events = (
        db.query(LoginEvent)
        .filter(LoginEvent.user_id == user_id)
        .order_by(LoginEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "ip_address": e.ip_address,
            "country": e.country,
            "city": e.city,
            "success": e.success,
            "mfa_required": e.mfa_required,
            "is_new_device": e.is_new_device,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]
