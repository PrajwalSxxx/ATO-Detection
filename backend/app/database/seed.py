"""Idempotent database seeder: users, settings, devices, and 500 realistic login events."""
import json
import random
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.user import User
from app.models.login_event import LoginEvent
from app.models.device import Device
from app.models.risk import RiskAssessment
from app.models.alert import SecurityAlert
from app.models.settings import AppSettings
from app.services.telemetry_service import parse_telemetry
from app.services.geo_service import get_geo

SAMPLE_USERS = [
    {"email": "admin@ato-platform.com", "password": "Admin@SecurePass123", "name": "System Admin", "role": "admin", "phone": "+919812345678"},
    {"email": "analyst@ato-platform.com", "password": "Analyst@SecurePass123", "name": "Security Analyst", "role": "analyst", "phone": "+919823456789"},
    {"email": "user1@test.com", "password": "User@SecurePass123", "name": "Alice Johnson", "role": "user", "phone": "+919876543210"},
    {"email": "user2@test.com", "password": "User@SecurePass123", "name": "Bob Smith", "role": "user", "phone": "+919834567890"},
    {"email": "user3@test.com", "password": "User@SecurePass123", "name": "Charlie Davis", "role": "user", "phone": "+919845678901"},
    {"email": "user4@test.com", "password": "User@SecurePass123", "name": "Diana Prince", "role": "user", "phone": "+919856789012"},
    {"email": "user5@test.com", "password": "User@SecurePass123", "name": "Evan Wright", "role": "user", "phone": "+919867890123"},
]

DEFAULT_SETTINGS = [
    {"key": "risk.low_threshold", "value": "30", "description": "Score below this is low risk (allow)", "category": "risk"},
    {"key": "risk.high_threshold", "value": "70", "description": "Score above this is high risk (block)", "category": "risk"},
    {"key": "mfa.otp_expire_minutes", "value": "5", "description": "OTP expiration time in minutes", "category": "mfa"},
    {"key": "mfa.max_attempts", "value": "3", "description": "Maximum failed OTP attempts before lockout", "category": "mfa"},
    {"key": "mfa.cooldown_seconds", "value": "60", "description": "Seconds to wait before OTP resend", "category": "mfa"},
    {"key": "lockout.threshold", "value": "10", "description": "Failed password attempts before account lockout", "category": "security"},
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
]

SUSPICIOUS_USER_AGENTS = [
    "Python-urllib/3.10",
    "curl/7.88.1",
    "Mozilla/5.0 (compatible; EvilBot/1.0)",
]

# Normal IP pools per user to establish baseline
USER_HOME_IPS = {
    "user1@test.com": ("8.12.34.56", "USA"),
    "user2@test.com": ("80.15.22.100", "UK"),
    "user3@test.com": ("31.20.45.67", "Germany"),
    "user4@test.com": ("103.45.67.89", "India"),
    "user5@test.com": ("1.23.45.67", "Australia"),
}

ANOMALOUS_IPS = [
    "37.19.200.5",   # Russia
    "159.253.1.20",  # Russia
    "46.101.50.2",   # China
    "130.211.0.1",   # Brazil
]


def seed_database(db: Session = None) -> None:
    """Seed users, default settings, and 500 historical login events."""
    from app.database.init_db import init_db
    init_db()

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. Seed Settings (idempotent)
        for s in DEFAULT_SETTINGS:
            existing = db.query(AppSettings).filter(AppSettings.key == s["key"]).first()
            if not existing:
                setting = AppSettings(
                    id=str(uuid.uuid4()),
                    key=s["key"],
                    value=s["value"],
                    description=s["description"],
                    category=s["category"],
                )
                db.add(setting)
        db.flush()

        # 2. Seed Users (idempotent)
        user_objs = {}
        for u in SAMPLE_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    id=str(uuid.uuid4()),
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    full_name=u["name"],
                    role=u["role"],
                    is_active=True,
                    is_locked=False,
                    mfa_enabled=(u["role"] in ("admin", "analyst")),
                    phone_number=u.get("phone"),
                    phone_verified=True,
                )
                db.add(user)
                db.flush()
                user_objs[u["email"]] = user
            else:
                if not existing.phone_number and u.get("phone"):
                    existing.phone_number = u.get("phone")
                    existing.phone_verified = True
                    db.add(existing)
                user_objs[u["email"]] = existing

        # 3. Seed 500 Historical Login Events (only if < 100 exist)
        existing_events_count = db.query(LoginEvent).count()
        if existing_events_count < 100:
            print(f"[seed] Generating 500 historical login events...")
            now = datetime.now(timezone.utc)
            test_users = [u for u in user_objs.values() if u.role == "user"]
            all_users = list(user_objs.values())

            # Seed devices for each user first
            user_devices = {}
            for u in all_users:
                existing_dev = db.query(Device).filter(Device.user_id == u.id).first()
                ua = USER_AGENTS[0]
                tel = parse_telemetry(ua)
                if existing_dev:
                    user_devices[u.id] = (existing_dev, tel)
                else:
                    ip, _ = USER_HOME_IPS.get(u.email, ("8.8.8.8", "USA"))
                    dev = Device(
                        id=str(uuid.uuid4()),
                        user_id=u.id,
                        fingerprint_hash=tel.fingerprint_hash,
                        browser_name=tel.browser_name,
                        browser_version=tel.browser_version,
                        os_name=tel.os_name,
                        os_version=tel.os_version,
                        device_type=tel.device_type,
                        user_agent=ua,
                        is_trusted=True,
                        trust_score=90,
                        login_count=50,
                        last_seen_ip=ip,
                        last_seen_at=now,
                        first_seen_at=now - timedelta(days=35),
                    )
                    db.add(dev)
                    user_devices[u.id] = (dev, tel)
            db.flush()

            # Generate 500 events over last 30 days
            random.seed(42)  # Deterministic seed for reproducibility
            events_to_create = 500

            for i in range(events_to_create):
                # Pick user (users 1-5 get 90% of logins, admin/analyst get 10%)
                if random.random() < 0.9 and test_users:
                    user = random.choice(test_users)
                else:
                    user = random.choice(all_users)

                home_ip, home_country = USER_HOME_IPS.get(user.email, ("8.8.8.8", "USA"))
                dev, tel = user_devices[user.id]

                # Days ago: 0 to 30
                days_ago = random.uniform(0.05, 30.0)
                event_time = now - timedelta(days=days_ago)

                # Hour: mostly 8am to 8pm
                if random.random() < 0.85:
                    hour = random.randint(8, 20)
                else:
                    hour = random.choice([1, 2, 3, 4, 5, 22, 23])
                event_time = event_time.replace(hour=hour, minute=random.randint(0, 59))

                # Decide if normal (92%) or suspicious/anomalous (8%)
                is_suspicious = random.random() < 0.08

                if is_suspicious:
                    # Anomalous event
                    ip = random.choice(ANOMALOUS_IPS)
                    geo = get_geo(ip)
                    ua = random.choice(SUSPICIOUS_USER_AGENTS + USER_AGENTS[2:])
                    tel_anom = parse_telemetry(ua)
                    success = random.choice([True, False, False])  # ATOs often fail
                    failure_reason = None if success else "INVALID_PASSWORD"
                    risk_score = round(random.uniform(65.0, 95.0), 1)
                    risk_level = "critical" if risk_score >= 70 else "high"
                    decision = "block" if risk_score >= 70 else "mfa"
                    ml_score = round(random.uniform(0.6, 0.95), 3)
                    reasons = [
                        {"factor": "new_device", "points": 15, "description": "Login from unseen device"},
                        {"factor": "location_change", "points": 12, "description": f"Login from {geo.get('country')}"},
                        {"factor": "ml_anomaly_signal", "points": round(ml_score * 30, 1), "description": f"ML anomaly score: {ml_score:.2f}"},
                    ]
                else:
                    # Normal event
                    ip = home_ip
                    geo = get_geo(ip)
                    ua = USER_AGENTS[0]
                    success = True
                    failure_reason = None
                    risk_score = round(random.uniform(5.0, 25.0), 1)
                    risk_level = "low"
                    decision = "allow"
                    ml_score = round(random.uniform(0.01, 0.15), 3)
                    reasons = [
                        {"factor": "trust_reduction", "points": -5, "description": "Known device and usual hour"},
                    ]

                login_event = LoginEvent(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    ip_address=ip,
                    user_agent=ua,
                    fingerprint_hash=tel.fingerprint_hash if not is_suspicious else tel_anom.fingerprint_hash,
                    country=geo.get("country"),
                    region=geo.get("region"),
                    city=geo.get("city"),
                    latitude=geo.get("latitude"),
                    longitude=geo.get("longitude"),
                    success=success,
                    failure_reason=failure_reason,
                    mfa_required=(decision == "mfa"),
                    mfa_completed=(decision == "mfa" and success),
                    is_new_device=is_suspicious,
                    is_new_ip=is_suspicious,
                    created_at=event_time,
                )
                db.add(login_event)
                db.flush()

                # Risk assessment
                risk_rec = RiskAssessment(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    login_event_id=login_event.id,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    ml_anomaly_score=ml_score,
                    decision=decision,
                    confidence=0.85 if is_suspicious else 0.95,
                    reasons=json.dumps(reasons),
                    features_snapshot=json.dumps({"ip": ip, "country": geo.get("country")}),
                    created_at=event_time,
                )
                db.add(risk_rec)

                # If high/critical, create an alert
                if risk_level in ("high", "critical"):
                    alert = SecurityAlert(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        login_event_id=login_event.id,
                        alert_type="HIGH_RISK_LOGIN" if risk_level == "high" else "CRITICAL_RISK_LOGIN",
                        severity=risk_level,
                        title=f"{risk_level.capitalize()} Risk Login Detected (score: {risk_score:.0f})",
                        description=f"Suspicious login from {geo.get('country')} using IP {ip}",
                        status=random.choice(["open", "investigating", "resolved"]),
                        risk_score=risk_score,
                        created_at=event_time,
                    )
                    db.add(alert)

            db.commit()
            print(f"[seed] Database seeded with 500 events successfully.")
        else:
            db.commit()
            print(f"[seed] Database already contains {existing_events_count} events. Skipping event generation.")

    except Exception as e:
        db.rollback()
        print(f"[seed] Error seeding database: {e}")
        raise
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_database()
