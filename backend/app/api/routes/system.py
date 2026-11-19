"""System health, version, and ML control API routes."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.dependencies import get_db_session, admin_required
from app.ml.model_registry import model_registry

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/client-ip")
def get_client_ip_info(request: Request):
    """
    Client IP discovery endpoint.
    In local development, discovers the active public WAN / VPN exit IP if requested.
    """
    from app.core.ip_resolver import resolve_client_ip
    info = resolve_client_ip(request)

    discovered_public_ip = None
    if info.is_loopback and getattr(settings, "DEV_PUBLIC_IP_DISCOVERY", True):
        import httpx
        try:
            with httpx.Client(timeout=2.5) as client:
                res = client.get("https://api64.ipify.org?format=json")
                if res.status_code == 200:
                    discovered_public_ip = res.json().get("ip")
        except Exception:
            discovered_public_ip = None

    return {
        "ip": info.ip,
        "source": info.source,
        "trust_status": info.trust_status,
        "is_public": info.is_public,
        "is_loopback": info.is_loopback,
        "discovered_public_ip": discovered_public_ip,
    }
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
