"""SQLAlchemy AppSettings model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from app.database.engine import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, default="general")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
