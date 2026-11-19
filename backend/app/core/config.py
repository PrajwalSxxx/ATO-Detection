from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB = (BASE_DIR / "ato_detection.db").as_posix()


class Settings(BaseSettings):
    # Database - absolute path so it works regardless of working directory
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB}"

    # Auth
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # App
    APP_ENV: str = "development"
    APP_NAME: str = "AI-ATO Detection Platform"
    APP_VERSION: str = "1.0.0"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ML
    ML_MODEL_PATH: str = str(BASE_DIR / "backend" / "models" / "model.joblib")
    SCALER_PATH: str = str(BASE_DIR / "backend" / "models" / "scaler.joblib")
    METADATA_PATH: str = str(BASE_DIR / "backend" / "models" / "model_metadata.json")

    # Risk thresholds
    RISK_LOW_THRESHOLD: int = 30
    RISK_HIGH_THRESHOLD: int = 70

    # MFA
    MFA_OTP_EXPIRE_MINUTES: int = 5
    MFA_MAX_ATTEMPTS: int = 3
    MFA_RESEND_COOLDOWN_SECONDS: int = 60

    # Rate limiting
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_OTP: str = "5/minute"

    # IP Intelligence & Geolocation
    IP_INTELLIGENCE_PROVIDER: str = "ip-api"  # ip-api, ipinfo, ipdata, mock
    IP_INTELLIGENCE_API_KEY: str = ""
    IP_INTELLIGENCE_TIMEOUT_SECONDS: float = 3.0
    IP_INTELLIGENCE_CACHE_TTL_SECONDS: int = 3600  # 1 hour
    TRUSTED_PROXIES: List[str] = ["127.0.0.1", "::1"]

    # SMS Service
    SMS_PROVIDER: str = "mock"  # mock, twilio, fast2sms
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_MESSAGING_SERVICE_SID: str = ""
    FAST2SMS_API_KEY: str = ""
    SMS_TIMEOUT_SECONDS: float = 8.0

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
