"""Shared FastAPI dependencies."""
from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import get_current_user, require_role, UserRole


get_db_session = get_db


def admin_required(payload: dict = Depends(require_role([UserRole.admin]))):
    return payload


def analyst_or_admin_required(payload: dict = Depends(require_role([UserRole.admin, UserRole.analyst]))):
    return payload


def any_authenticated(payload: dict = Depends(get_current_user)):
    return payload
