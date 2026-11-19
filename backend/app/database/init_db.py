"""Initialize the database: create all tables and ensure ML model directory exists."""
import os
from app.database.engine import engine, Base
# Import all models to register them
import app.models  # noqa: F401


def init_db() -> None:
    """Create all tables, migrate any missing columns, and ensure ML model directory exists."""
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    # Ensure ML model directory exists
    os.makedirs("models", exist_ok=True)
    print("[init_db] Database tables created successfully.")


def _migrate_schema() -> None:
    """Idempotently add new columns to SQLite/PostgreSQL if they don't already exist."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Check SQLite table info
            result = conn.execute(text("PRAGMA table_info(login_events)")).fetchall()
            if result:
                existing_cols = {row[1] for row in result}
                new_columns = [
                    ("is_vpn", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("is_proxy", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("is_tor", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("is_datacenter", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("isp", "VARCHAR(150)"),
                    ("asn", "VARCHAR(100)"),
                    ("device_category", "VARCHAR(50)"),
                    ("prev_country", "VARCHAR(100)"),
                    ("prev_city", "VARCHAR(100)"),
                    ("geo_distance_km", "FLOAT DEFAULT 0.0"),
                    ("impossible_travel", "BOOLEAN DEFAULT 0 NOT NULL"),
                ]
                for col_name, col_def in new_columns:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE login_events ADD COLUMN {col_name} {col_def}"))

                # Check and add MFA tracking columns to login_events
                login_mfa_cols = [
                    ("mfa_phone_masked", "VARCHAR(50)"),
                    ("mfa_delivery_status", "VARCHAR(30)"),
                ]
                for col_name, col_def in login_mfa_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE login_events ADD COLUMN {col_name} {col_def}"))

                # Check and add telemetry, client IP, and threat status columns
                additional_login_cols = [
                    ("browser", "VARCHAR(100)"),
                    ("browser_version", "VARCHAR(50)"),
                    ("os", "VARCHAR(100)"),
                    ("os_version", "VARCHAR(50)"),
                    ("ip_source", "VARCHAR(30) DEFAULT 'direct' NOT NULL"),
                    ("ip_trust_status", "VARCHAR(30) DEFAULT 'verified' NOT NULL"),
                    ("geo_provider", "VARCHAR(50)"),
                    ("geo_status", "VARCHAR(30)"),
                    ("vpn_status", "VARCHAR(30) DEFAULT 'not_detected' NOT NULL"),
                    ("proxy_status", "VARCHAR(30) DEFAULT 'not_detected' NOT NULL"),
                    ("tor_status", "VARCHAR(30) DEFAULT 'not_detected' NOT NULL"),
                    ("datacenter_status", "VARCHAR(30) DEFAULT 'not_detected' NOT NULL"),
                    ("is_simulated", "BOOLEAN DEFAULT 0 NOT NULL"),
                ]
                for col_name, col_def in additional_login_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE login_events ADD COLUMN {col_name} {col_def}"))

                # Backfill existing records that have user_agent but missing browser / os
                try:
                    from user_agents import parse as ua_parse
                    rows = conn.execute(text("SELECT id, user_agent, ip_address, is_vpn, is_tor, is_proxy, is_datacenter FROM login_events WHERE browser IS NULL AND user_agent IS NOT NULL")).fetchall()
                    for r in rows:
                        row_id, raw_ua, ip_addr, is_vpn, is_tor, is_proxy, is_dc = r[0], r[1], r[2], r[3], r[4], r[5], r[6]
                        p = ua_parse(raw_ua or "")
                        b_name = p.browser.family or "Unknown"
                        b_ver = p.browser.version_string or "0"
                        o_name = p.os.family or "Unknown"
                        o_ver = p.os.version_string or "0"
                        cat = "mobile" if p.is_mobile else "tablet" if p.is_tablet else "desktop"
                        ip_src = "loopback_dev" if ip_addr in ("127.0.0.1", "::1", "localhost") else "direct"
                        ip_trust = "loopback" if ip_addr in ("127.0.0.1", "::1", "localhost") else "verified"
                        vpn_st = "confirmed" if (is_vpn and (is_tor or is_proxy)) else "suspected" if (is_vpn or is_dc) else "not_detected"

                        conn.execute(
                            text(
                                "UPDATE login_events SET browser = :b, browser_version = :bv, os = :o, os_version = :ov, "
                                "device_category = COALESCE(device_category, :cat), ip_source = :src, ip_trust_status = :trust, "
                                "vpn_status = :vst WHERE id = :id"
                            ),
                            {"b": b_name, "bv": b_ver, "o": o_name, "ov": o_ver, "cat": cat, "src": ip_src, "trust": ip_trust, "vst": vpn_st, "id": row_id}
                        )
                except Exception as bf_err:
                    print(f"[init_db] Note on telemetry backfill: {bf_err}")

            # Check users table
            user_cols_res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            if user_cols_res:
                existing_user_cols = {row[1] for row in user_cols_res}
                user_new_cols = [
                    ("phone_number", "VARCHAR(30)"),
                    ("phone_verified", "BOOLEAN DEFAULT 0 NOT NULL"),
                ]
                for col_name, col_def in user_new_cols:
                    if col_name not in existing_user_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))

            # Check mfa_verifications table
            mfa_cols_res = conn.execute(text("PRAGMA table_info(mfa_verifications)")).fetchall()
            if mfa_cols_res:
                existing_mfa_cols = {row[1] for row in mfa_cols_res}
                mfa_new_cols = [
                    ("phone_number_masked", "VARCHAR(50)"),
                    ("delivery_channel", "VARCHAR(20) DEFAULT 'sms' NOT NULL"),
                    ("delivery_status", "VARCHAR(30) DEFAULT 'pending' NOT NULL"),
                    ("provider", "VARCHAR(50)"),
                    ("message_id", "VARCHAR(100)"),
                    ("purpose", "VARCHAR(30) DEFAULT 'login_mfa' NOT NULL"),
                ]
                for col_name, col_def in mfa_new_cols:
                    if col_name not in existing_mfa_cols:
                        conn.execute(text(f"ALTER TABLE mfa_verifications ADD COLUMN {col_name} {col_def}"))

            conn.commit()
    except Exception as e:
        print(f"[init_db] Note on schema migration: {e}")


if __name__ == "__main__":
    init_db()
