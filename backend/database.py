"""SQLAlchemy engine and session factory for Kuteera Kitchen backend.

Used by the ORM-based routers (admin_logs, reports, nl_router).
The engine is configured with a connection pool so SQLAlchemy reuses
persistent TCP connections rather than opening a new one per request.

Pool settings (env overrides):
    DB_SA_POOL_SIZE       — persistent connections in pool (default 5)
    DB_SA_MAX_OVERFLOW    — extra connections allowed above pool_size (default 10)
    DB_SA_POOL_RECYCLE    — seconds before a connection is recycled (default 1800)
"""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://fastapi_user:password@localhost/kk_v1")

engine = create_engine(
    DATABASE_URL,
    pool_size=int(os.getenv("DB_SA_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_SA_MAX_OVERFLOW", "10")),
    pool_recycle=int(os.getenv("DB_SA_POOL_RECYCLE", "1800")),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    """Yield a SQLAlchemy session, closing it when the request is done.

    Intended for use as a FastAPI ``Depends`` target.

    Yields:
        A ``sqlalchemy.orm.Session`` instance bound to the shared engine pool.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
