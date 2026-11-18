"""Device management API routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, analyst_or_admin_required
from app.core.exceptions import ResourceNotFoundError
from app.models.device import Device
from app.schemas.device import DeviceResponse, DeviceListResponse, DeviceTrustUpdate
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=DeviceListResponse)
def list_devices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    is_trusted: Optional[bool] = None,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """List registered devices with pagination."""
    query = db.query(Device)
    if user_id:
        query = query.filter(Device.user_id == user_id)
    if is_trusted is not None:
        query = query.filter(Device.is_trusted == is_trusted)

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    items = query.order_by(Device.last_seen_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return DeviceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get device details by ID."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise ResourceNotFoundError("Device not found")
    return device


@router.patch("/{device_id}/trust", response_model=DeviceResponse)
def update_device_trust(
    device_id: str,
    body: DeviceTrustUpdate,
    db: Session = Depends(get_db_session),
    current_user=Depends(analyst_or_admin_required),
):
    """Toggle trust status for a device."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise ResourceNotFoundError("Device not found")

    device.is_trusted = body.is_trusted
    if body.is_trusted:
        device.trust_score = max(device.trust_score, 80)
    else:
        device.trust_score = min(device.trust_score, 20)

    write_audit_log(
        db,
        "DEVICE_TRUST_UPDATED",
        user_id=current_user.get("sub"),
        resource_type="Device",
        resource_id=device_id,
        status="success",
        details={"is_trusted": body.is_trusted},
    )
    db.commit()
    db.refresh(device)
    return device
