"""SQLAlchemy SecurityAlert model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.engine import Base


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    login_event_id = Column(String(36), ForeignKey("login_events.id", ondelete="SET NULL"), nullable=True)
    
    # Alert info
    alert_type = Column(String(100), nullable=False)  # e.g. HIGH_RISK_LOGIN, IMPOSSIBLE_TRAVEL
    severity = Column(String(20), nullable=False, default="medium")  # low, medium, high, critical
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(String(50), nullable=False, default="open")  # open, investigating, resolved, false_positive
    resolved_by = Column(String(36), nullable=True)  # user_id of resolver
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_note = Column(Text, nullable=True)
    
    # Risk context
    risk_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="alerts")
