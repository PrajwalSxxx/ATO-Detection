"""Database engine and declarative base."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings


def get_connect_args():
    if settings.DATABASE_URL.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


engine = create_engine(
    settings.DATABASE_URL,
    connect_args=get_connect_args(),
    pool_pre_ping=True,
    echo=False,
)

Base = declarative_base()
