"""Dashboard analytics routes using aggregate SQL queries."""
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, analyst_or_admin_required
from app.models.login_event import LoginEvent
from app.models.risk import RiskAssessment
from app.models.alert import SecurityAlert
from app.models.user import User
import json
from app.schemas.dashboard import (
    DashboardSummary,
    DashboardOverview,
    HourlyLoginStat,
    DecisionDistribution,
    RiskDistribution,
    RecentAlertItem,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get high-level summary KPIs and overview for dashboard."""
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # Logins today
    total_logins = (
        db.query(func.count(LoginEvent.id))
        .filter(LoginEvent.created_at >= today_start)
        .scalar()
        or 0
    )
    failed_logins = (
        db.query(func.count(LoginEvent.id))
        .filter(LoginEvent.created_at >= today_start, LoginEvent.success == False)
        .scalar()
        or 0
    )
    successful_logins = max(0, total_logins - failed_logins)
    mfa_challenges = (
        db.query(func.count(LoginEvent.id))
        .filter(LoginEvent.created_at >= today_start, LoginEvent.mfa_required == True)
        .scalar()
        or 0
    )

    # Blocks today from risk assessments
    blocks_today = (
        db.query(func.count(RiskAssessment.id))
        .filter(RiskAssessment.created_at >= today_start, RiskAssessment.decision == "block")
        .scalar()
        or 0
    )

    # Suspicious and high risk logins today
    suspicious_logins = (
        db.query(func.count(RiskAssessment.id))
        .filter(RiskAssessment.created_at >= today_start, RiskAssessment.risk_level.in_(["medium", "high"]))
        .scalar()
        or 0
    )
    high_risk_logins = (
        db.query(func.count(RiskAssessment.id))
        .filter(RiskAssessment.created_at >= today_start, RiskAssessment.risk_level.in_(["high", "critical"]))
        .scalar()
        or 0
    )

    # Alerts
    open_alerts = (
        db.query(func.count(SecurityAlert.id))
        .filter(SecurityAlert.status.in_(["open", "investigating"]))
        .scalar()
        or 0
    )
    critical_alerts = (
        db.query(func.count(SecurityAlert.id))
        .filter(
            SecurityAlert.severity == "critical",
            SecurityAlert.status.in_(["open", "investigating"]),
        )
        .scalar()
        or 0
    )

    # Active users count
    active_users = (
        db.query(func.count(User.id))
        .filter(User.is_active == True)
        .scalar()
        or 0
    )

    # Average risk score today
    avg_risk = (
        db.query(func.avg(RiskAssessment.risk_score))
        .filter(RiskAssessment.created_at >= today_start)
        .scalar()
        or 0.0
    )

    # Decision breakdown
    decision_counts = (
        db.query(
            func.count(case((RiskAssessment.decision == "allow", 1))).label("allow"),
            func.count(case((RiskAssessment.decision == "mfa", 1))).label("mfa"),
            func.count(case((RiskAssessment.decision == "block", 1))).label("block"),
        )
        .first()
    )
    decision_breakdown = [
        {"name": "ALLOW", "value": decision_counts.allow or 0},
        {"name": "REQUIRE_MFA", "value": decision_counts.mfa or 0},
        {"name": "BLOCK", "value": decision_counts.block or 0},
    ]

    # Recent 10 login events
    recent_events_rows = (
        db.query(LoginEvent, RiskAssessment, User.email)
        .outerjoin(RiskAssessment, LoginEvent.id == RiskAssessment.login_event_id)
        .outerjoin(User, LoginEvent.user_id == User.id)
        .order_by(LoginEvent.created_at.desc())
        .limit(10)
        .all()
    )

    recent_events = []
    for evt, risk, user_email in recent_events_rows:
        reasons_list = []
        if risk and risk.reasons:
            try:
                reasons_list = json.loads(risk.reasons)
            except Exception:
                reasons_list = []

        dec_str = "ALLOW"
        if risk and risk.decision:
            if risk.decision == "block":
                dec_str = "BLOCK"
            elif risk.decision in ("mfa", "require_mfa"):
                dec_str = "REQUIRE_MFA"
            else:
                dec_str = "ALLOW"
        elif not evt.success:
            dec_str = "BLOCK"

        recent_events.append({
            "id": evt.id,
            "user_id": evt.user_id,
            "username": user_email or evt.user_id,
            "user_email": user_email or "",
            "timestamp": evt.created_at.isoformat() if evt.created_at else "",
            "created_at": evt.created_at.isoformat() if evt.created_at else "",
            "ip_address": evt.ip_address,
            "ip": evt.ip_address,
            "location": f"{evt.city}, {evt.country}" if (evt.city and evt.country) else (evt.country or "Unknown"),
            "city": evt.city or "",
            "country": evt.country or "",
            "browser": "Chrome",
            "os": "Windows",
            "risk_score": float(risk.risk_score) if (risk and risk.risk_score is not None) else (0.0 if evt.success else 50.0),
            "risk_level": risk.risk_level if risk else ("low" if evt.success else "medium"),
            "decision": dec_str,
            "is_simulated": False,
            "anomaly_score": float(risk.ml_anomaly_score) if (risk and risk.ml_anomaly_score is not None) else 0.0,
            "reasons": reasons_list,
        })

    return {
        "total_users": active_users,
        "logins_today": total_logins,
        "successful_logins": successful_logins,
        "failed_logins": failed_logins,
        "suspicious_logins": suspicious_logins,
        "high_risk_logins": high_risk_logins,
        "mfa_challenges": mfa_challenges,
        "blocked_logins": blocks_today,
        "total_logins_today": total_logins,
        "failed_logins_today": failed_logins,
        "mfa_challenges_today": mfa_challenges,
        "blocks_today": blocks_today,
        "open_alerts_count": open_alerts,
        "critical_alerts_count": critical_alerts,
        "active_users_count": active_users,
        "avg_risk_score_today": round(float(avg_risk), 2),
        "decision_breakdown": decision_breakdown,
        "recent_events": recent_events,
    }


@router.get("/decisions", response_model=DecisionDistribution)
def get_decision_distribution(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Aggregate distribution of decisions across all risk assessments."""
    counts = (
        db.query(
            func.count(case((RiskAssessment.decision == "allow", 1))).label("allow"),
            func.count(case((RiskAssessment.decision == "mfa", 1))).label("mfa"),
            func.count(case((RiskAssessment.decision == "block", 1))).label("block"),
        )
        .first()
    )

    return DecisionDistribution(
        allow=counts.allow or 0,
        mfa=counts.mfa or 0,
        block=counts.block or 0,
    )


@router.get("/risk-distribution", response_model=RiskDistribution)
def get_risk_distribution(
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Distribution of risk levels across all risk assessments."""
    counts = (
        db.query(
            func.count(case((RiskAssessment.risk_level == "low", 1))).label("low"),
            func.count(case((RiskAssessment.risk_level == "medium", 1))).label("medium"),
            func.count(case((RiskAssessment.risk_level == "high", 1))).label("high"),
            func.count(case((RiskAssessment.risk_level == "critical", 1))).label("critical"),
        )
        .first()
    )

    return RiskDistribution(
        low=counts.low or 0,
        medium=counts.medium or 0,
        high=counts.high or 0,
        critical=counts.critical or 0,
    )


@router.get("/recent-alerts", response_model=List[RecentAlertItem])
def get_recent_alerts(
    limit: int = 5,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get most recent alerts."""
    alerts = (
        db.query(SecurityAlert, User.email)
        .outerjoin(User, SecurityAlert.user_id == User.id)
        .order_by(SecurityAlert.created_at.desc())
        .limit(limit)
        .all()
    )

    items = []
    for alert, user_email in alerts:
        items.append(
            RecentAlertItem(
                id=alert.id,
                user_email=user_email,
                alert_type=alert.alert_type,
                severity=alert.severity,
                title=alert.title,
                created_at=alert.created_at.isoformat() if alert.created_at else "",
                risk_score=alert.risk_score,
                status=alert.status,
            )
        )
    return items


@router.get("/hourly-activity", response_model=List[HourlyLoginStat])
def get_hourly_activity(
    hours: int = 24,
    db: Session = Depends(get_db_session),
    _auth=Depends(analyst_or_admin_required),
):
    """Get hourly login activity for the last N hours using SQL aggregation."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)

    events = (
        db.query(
            func.strftime("%Y-%m-%d %H:00", LoginEvent.created_at).label("hour_str"),
            func.count(LoginEvent.id).label("total"),
            func.count(case((LoginEvent.success == True, 1))).label("successful"),
            func.count(case((LoginEvent.success == False, 1))).label("failed"),
        )
        .filter(LoginEvent.created_at >= since)
        .group_by("hour_str")
        .order_by("hour_str")
        .all()
    )

    return [
        HourlyLoginStat(
            hour=row.hour_str,
            total=row.total,
            successful=row.successful,
            failed=row.failed,
        )
        for row in events
    ]
