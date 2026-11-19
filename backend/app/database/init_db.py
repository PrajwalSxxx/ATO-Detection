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
                conn.commit()
    except Exception as e:
        print(f"[init_db] Note on schema migration: {e}")
