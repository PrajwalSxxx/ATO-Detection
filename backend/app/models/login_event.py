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
    ip_source = Column(String(30), default="direct", nullable=False)  # direct, trusted_proxy, client_reported, loopback_dev
    ip_trust_status = Column(String(30), default="verified", nullable=False)  # verified, unverified, loopback
    user_agent = Column(Text, nullable=True)
    fingerprint_hash = Column(String(64), nullable=True)

    # Client & Browser telemetry
    browser = Column(String(100), nullable=True)
    browser_version = Column(String(50), nullable=True)
    os = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    
    # Geo info
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geo_provider = Column(String(50), nullable=True)  # ip-api, mock, local, unavailable
    geo_status = Column(String(30), nullable=True)    # success, local_network, failed, simulated, unavailable
    
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
    vpn_status = Column(String(30), default="not_detected", nullable=False)  # confirmed, suspected, not_detected, unavailable
    is_proxy = Column(Boolean, default=False, nullable=False)
    proxy_status = Column(String(30), default="not_detected", nullable=False)  # detected, not_detected, unavailable
    is_tor = Column(Boolean, default=False, nullable=False)
    tor_status = Column(String(30), default="not_detected", nullable=False)  # detected, not_detected, unavailable
    is_datacenter = Column(Boolean, default=False, nullable=False)
    datacenter_status = Column(String(30), default="not_detected", nullable=False)  # detected, not_detected, unavailable
    isp = Column(String(150), nullable=True)
    asn = Column(String(100), nullable=True)

    # Location comparison & travel
    prev_country = Column(String(100), nullable=True)
    prev_city = Column(String(100), nullable=True)
    geo_distance_km = Column(Float, default=0.0, nullable=True)
    impossible_travel = Column(Boolean, default=False, nullable=False)

    # Simulation flag
    is_simulated = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="login_events")
    risk_assessment = relationship("RiskAssessment", back_populates="login_event", uselist=False, cascade="all, delete-orphan")
