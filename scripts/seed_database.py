"""Standalone script to seed database from project root."""
import os
import sys

# Add backend directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "..", "backend")
sys.path.insert(0, backend_dir)

from app.database.init_db import init_db
from app.database.seed import seed_database

if __name__ == "__main__":
    print("[seed_database] Initializing tables...")
    init_db()
    print("[seed_database] Seeding data...")
    seed_database()
    print("[seed_database] Done!")
