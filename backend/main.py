"""Main FastAPI application entrypoint."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.core.rate_limit import limiter
from app.database.init_db import init_db
from app.database.seed import seed_database
from app.ml.model_registry import model_registry
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events: initialize DB, seed sample data, and load ML model."""
    print(f"[{settings.APP_NAME}] Starting up...")
    init_db()
    seed_database()
    model_registry.load_model()

    if not model_registry.model_loaded:
        print("[startup] ML model not found. Training model now...")
        try:
            import sys
            import os
            # Ensure project root is in sys.path
            proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            if proj_root not in sys.path:
                sys.path.insert(0, proj_root)
            from scripts.train_model import train_and_save
            train_and_save()
            model_registry.load_model()
        except Exception as e:
            print(f"[startup] Warning: Could not auto-train model at startup: {e}")

    yield
    print(f"[{settings.APP_NAME}] Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global custom exception handlers
setup_exception_handlers(app)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers (mounted under /api)
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(logins.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(system.router, prefix="/api")


@app.get("/health", tags=["system"])
def root_health():
    """Root health check for quick ping."""
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/api/health", tags=["system"])
def api_health(db=Depends(system.get_db_session)):
    """Health check endpoint meeting spec section 6.1."""
    return system.health_check(db)


@app.get("/api/ml/model-info", tags=["system"])
def api_ml_model_info():
    """ML model information meeting spec section 6.1."""
    return model_registry.health()
