"""Initialize the database: create all tables and ensure ML model directory exists."""
import os
from app.database.engine import engine, Base
# Import all models to register them
import app.models  # noqa: F401


def init_db() -> None:
    """Create all tables and required directories."""
    Base.metadata.create_all(bind=engine)
    # Ensure ML model directory exists
    os.makedirs("models", exist_ok=True)
    print("[init_db] Database tables created successfully.")
