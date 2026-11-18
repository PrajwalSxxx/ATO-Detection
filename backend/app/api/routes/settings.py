"""Application settings API routes."""
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, admin_required, analyst_or_admin_required
from app.core.exceptions import ResourceNotFoundError
from app.models.settings import AppSettings
from app.schemas.settings import SettingItem, SettingUpdate, SettingsMap
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=List[SettingItem])
def list_settings(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """List all system settings."""
    return db.query(AppSettings).order_by(AppSettings.category, AppSettings.key).all()


@router.get("/map", response_model=SettingsMap)
def get_settings_map(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get all settings as key-value dictionary."""
    rows = db.query(AppSettings).all()
    return SettingsMap(settings={r.key: r.value for r in rows})


@router.put("/{key}", response_model=SettingItem)
def update_setting(
    key: str,
    body: SettingUpdate,
    db: Session = Depends(get_db_session),
    current_user=Depends(admin_required),
):
    """Update a specific setting value (admin only)."""
    setting = db.query(AppSettings).filter(AppSettings.key == key).first()
    if not setting:
        raise ResourceNotFoundError(f"Setting '{key}' not found")

    old_val = setting.value
    setting.value = body.value
    db.add(setting)

    write_audit_log(
        db,
        "SETTING_UPDATED",
        user_id=current_user.get("sub"),
        resource_type="AppSettings",
        resource_id=key,
        status="success",
        details={"key": key, "old_value": old_val, "new_value": body.value},
    )
    db.commit()
    db.refresh(setting)
    return setting
