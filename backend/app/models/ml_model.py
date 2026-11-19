"""SQLAlchemy MFAVerification model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database.engine import Base


class MFAVerification(Base):
    __tablename__ = "mfa_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    login_event_id = Column(String(36), ForeignKey("login_events.id", ondelete="CASCADE"), nullable=True)
    
    otp_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    is_expired = Column(Boolean, default=False, nullable=False)

    # SMS delivery metadata
    phone_number_masked = Column(String(50), nullable=True)
    delivery_channel = Column(String(20), default="sms", nullable=False)
    delivery_status = Column(String(30), default="pending", nullable=False)
    provider = Column(String(50), nullable=True)
    message_id = Column(String(100), nullable=True)
    purpose = Column(String(30), default="login_mfa", nullable=False)
    
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="mfa_verifications")
