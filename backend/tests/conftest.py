"""Pytest test configuration and fixtures."""
import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database.engine import Base
from app.database.session import get_db
from app.core.dependencies import get_db_session
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.settings import AppSettings
from app.database.seed import DEFAULT_SETTINGS
from main import app

# In-memory SQLite for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in memory once for the test session."""
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture
def db_session():
    """Yield a new isolated database session for a test, with seeded settings and users."""
    session = TestingSessionLocal()
    try:
        # Seed default settings
        for s in DEFAULT_SETTINGS:
            if not session.query(AppSettings).filter(AppSettings.key == s["key"]).first():
                session.add(AppSettings(key=s["key"], value=s["value"], category=s["category"]))

        # Seed test admin & test regular user if missing
        if not session.query(User).filter(User.email == "admin@ato-platform.com").first():
            admin = User(
                email="admin@ato-platform.com",
                hashed_password=hash_password("Admin@SecurePass123"),
                full_name="Admin User",
                role="admin",
                is_active=True,
            )
            session.add(admin)

        if not session.query(User).filter(User.email == "testuser@test.com").first():
            user = User(
                email="testuser@test.com",
                hashed_password=hash_password("User@SecurePass123"),
                full_name="Test User",
                role="user",
                is_active=True,
            )
            session.add(user)

        session.commit()
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Provide a TestClient with the test DB injected."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_session] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers(db_session):
    """Return Authorization headers for an admin user."""
    admin = db_session.query(User).filter(User.email == "admin@ato-platform.com").first()
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(db_session):
    """Return Authorization headers for a regular user."""
    user = db_session.query(User).filter(User.email == "testuser@test.com").first()
    token = create_access_token({"sub": user.id, "email": user.email, "role": "user"})
    return {"Authorization": f"Bearer {token}"}
