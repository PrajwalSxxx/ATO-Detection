"""SQLAlchemy DetectionModelMetadata model (for tracking ML model versions)."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean
from app.database.engine import Base


class DetectionModelMetadata(Base):
    __tablename__ = "detection_model_metadata"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    version = Column(String(50), nullable=False)
    algorithm = Column(String(100), nullable=False)
    
    # Training stats
    train_samples = Column(Integer, nullable=True)
    test_samples = Column(Integer, nullable=True)
    roc_auc = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    
    # Files
    model_path = Column(String(500), nullable=True)
    scaler_path = Column(String(500), nullable=True)
    
    is_active = Column(Boolean, default=False, nullable=False)
    training_notes = Column(Text, nullable=True)
    
    trained_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
