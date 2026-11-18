"""Risk assessment API routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, analyst_or_admin_required
from app.core.exceptions import ResourceNotFoundError
from app.models.risk import RiskAssessment
from app.schemas.risk import RiskAssessmentSchema, RiskOverviewStats

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/overview", response_model=RiskOverviewStats)
def get_risk_overview(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get high-level risk overview metrics across all assessments."""
    stats = (
        db.query(
            func.count(RiskAssessment.id).label("total"),
            func.count(case((RiskAssessment.risk_level == "low", 1))).label("low"),
            func.count(case((RiskAssessment.risk_level == "medium", 1))).label("medium"),
            func.count(case((RiskAssessment.risk_level == "high", 1))).label("high"),
            func.count(case((RiskAssessment.risk_level == "critical", 1))).label("critical"),
            func.avg(RiskAssessment.risk_score).label("avg_score"),
            func.count(case((RiskAssessment.decision == "allow", 1))).label("allow"),
            func.count(case((RiskAssessment.decision == "mfa", 1))).label("mfa"),
            func.count(case((RiskAssessment.decision == "block", 1))).label("block"),
        )
        .first()
    )

    return RiskOverviewStats(
        total_assessments=stats.total or 0,
        low_risk_count=stats.low or 0,
        medium_risk_count=stats.medium or 0,
        high_risk_count=stats.high or 0,
        critical_risk_count=stats.critical or 0,
        avg_risk_score=round(float(stats.avg_score or 0.0), 2),
        allow_count=stats.allow or 0,
        mfa_count=stats.mfa or 0,
        block_count=stats.block or 0,
    )


@router.get("/{assessment_id}", response_model=RiskAssessmentSchema)
def get_risk_assessment(
    assessment_id: str,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get a specific risk assessment by ID."""
    assessment = db.query(RiskAssessment).filter(RiskAssessment.id == assessment_id).first()
    if not assessment:
        raise ResourceNotFoundError("Risk assessment not found")
    return assessment
