"""API routes package."""
from app.api.routes import (
    auth,
    dashboard,
    logins,
    risk,
    users,
    alerts,
    devices,
    settings as settings_router,
    audit,
    system,
)

__all__ = [
    "auth",
    "dashboard",
    "logins",
    "risk",
    "users",
    "alerts",
    "devices",
    "settings_router",
    "audit",
    "system",
]
