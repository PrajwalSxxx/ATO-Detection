"""SQLAlchemy LoginEvent model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.engine import Base


class LoginEvent(Base):
    __tablename__ = "login_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Request metadata
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    fingerprint_hash = Column(String(64), nullable=True)
    
    # Geo info
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Outcome
    success = Column(Boolean, nullable=False, default=False)
    failure_reason = Column(String(100), nullable=True)
    
    # Auth decision
    mfa_required = Column(Boolean, default=False, nullable=False)
    mfa_completed = Column(Boolean, default=False, nullable=False)
    mfa_phone_masked = Column(String(50), nullable=True)
    mfa_delivery_status = Column(String(30), nullable=True)
    
    # Device flags
    is_new_device = Column(Boolean, default=False, nullable=False)
    is_new_ip = Column(Boolean, default=False, nullable=False)
    device_category = Column(String(50), nullable=True)  # desktop, mobile, tablet

    # IP Intelligence & Threat indicators
    is_vpn = Column(Boolean, default=False, nullable=False)
    is_proxy = Column(Boolean, default=False, nullable=False)
    is_tor = Column(Boolean, default=False, nullable=False)
    is_datacenter = Column(Boolean, default=False, nullable=False)
    isp = Column(String(150), nullable=True)
    asn = Column(String(100), nullable=True)

    # Location comparison & travel
    prev_country = Column(String(100), nullable=True)
    prev_city = Column(String(100), nullable=True)
    geo_distance_km = Column(Float, default=0.0, nullable=True)
    impossible_travel = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="login_events")
    risk_assessment = relationship("RiskAssessment", back_populates="login_event", uselist=False, cascade="all, delete-orphan")
