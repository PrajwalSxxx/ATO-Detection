"""SQLAlchemy Device model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.engine import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint_hash = Column(String(64), nullable=False, index=True)
    
    # Device details
    browser_name = Column(String(100), nullable=True)
    browser_version = Column(String(50), nullable=True)
    os_name = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    device_type = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Trust
    is_trusted = Column(Boolean, default=False, nullable=False)
    trust_score = Column(Integer, default=0, nullable=False)
    
    # Usage stats
    login_count = Column(Integer, default=1, nullable=False)
    last_seen_ip = Column(String(45), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    first_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="devices")
