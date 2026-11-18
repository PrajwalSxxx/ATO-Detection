"""SQLAlchemy RiskAssessment model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.engine import Base


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    login_event_id = Column(String(36), ForeignKey("login_events.id", ondelete="CASCADE"), nullable=True, unique=True)
    
    # Scores
    risk_score = Column(Float, nullable=False, default=0.0)
    risk_level = Column(String(20), nullable=False, default="low")  # low, medium, high, critical
    ml_anomaly_score = Column(Float, nullable=True)
    
    # Decision
    decision = Column(String(50), nullable=False, default="allow")  # allow, mfa, block
    confidence = Column(Float, nullable=True)
    
    # Reasons (JSON array of {factor, points, description})
    reasons = Column(Text, nullable=True)  # stored as JSON string
    
    # Feature snapshot (JSON)
    features_snapshot = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="risk_assessments")
    login_event = relationship("LoginEvent", back_populates="risk_assessment")
