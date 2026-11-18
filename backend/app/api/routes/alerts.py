"""Security alerts API routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, analyst_or_admin_required
from app.core.exceptions import ResourceNotFoundError
from app.models.alert import SecurityAlert
from app.schemas.alert import AlertResponse, AlertListResponse, AlertUpdate
from app.services.alert_service import update_alert_status
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """List security alerts with pagination and filtering."""
    query = db.query(SecurityAlert)
    if status:
        query = query.filter(SecurityAlert.status == status)
    if severity:
        query = query.filter(SecurityAlert.severity == severity)
    if user_id:
        query = query.filter(SecurityAlert.user_id == user_id)

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    items = query.order_by(SecurityAlert.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return AlertListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/count/unresolved")
def get_unresolved_count(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get unresolved (open or investigating) alert count."""
    count = (
        db.query(SecurityAlert)
        .filter(SecurityAlert.status.in_(["open", "investigating"]))
        .count()
    )
    return {"count": count}


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get security alert by ID."""
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        raise ResourceNotFoundError("Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert(
    alert_id: str,
    body: AlertUpdate,
    db: Session = Depends(get_db_session),
    current_user=Depends(analyst_or_admin_required),
):
    """Update alert status (e.g. resolve or mark as false positive)."""
    user_id = current_user.get("sub")
    alert = update_alert_status(
        db=db,
        alert_id=alert_id,
        new_status=body.status,
        resolved_by=user_id,
        resolution_note=body.resolution_note,
    )
    if not alert:
        raise ResourceNotFoundError("Alert not found")

    write_audit_log(
        db,
        "ALERT_UPDATED",
        user_id=user_id,
        resource_type="SecurityAlert",
        resource_id=alert_id,
        status="success",
        details={"new_status": body.status, "resolution_note": body.resolution_note},
    )
    db.commit()
    db.refresh(alert)
    return alert
