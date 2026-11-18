"""System health, version, and ML control API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.dependencies import get_db_session, admin_required
from app.ml.model_registry import model_registry

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health")
def health_check(db: Session = Depends(get_db_session)):
    """Health check endpoint for container probes and monitoring."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "ml_model": model_registry.health(),
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }


@router.get("/ml/status")
def ml_model_status():
    """Detailed ML model metadata and registry status."""
    return model_registry.health()


@router.post("/ml/reload")
def reload_ml_model(_auth=Depends(admin_required)):
    """Reload the ML model from disk into the registry singleton (admin only)."""
    model_registry.load_model()
    return {
        "message": "Model reloaded",
        "status": model_registry.health(),
    }
