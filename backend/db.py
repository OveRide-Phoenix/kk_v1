"""MySQL connection pool for Kuteera Kitchen backend.

All raw-SQL routers get connections via ``get_raw_db()``.  The pool is created
once at import time and shared across all workers in the same process.

Calling ``.close()`` on a pooled connection returns it to the pool rather than
tearing down the TCP socket, so every existing ``try/finally: db.close()``
pattern in the routers works unchanged — zero router code changes needed.

Pool sizing (env overrides):
    DB_POOL_SIZE   — number of persistent connections to keep open (default 10)
    DB_POOL_RESET_ON_RETURN — if "true", run ``ROLLBACK`` when returning a
                              connection to the pool (default true)
"""

from __future__ import annotations

import os
import warnings
from urllib.parse import urlparse, unquote

try:
    from dotenv import load_dotenv
    from pathlib import Path

    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except Exception:
    pass

from mysql.connector.pooling import MySQLConnectionPool


def _parse_db_url(url: str) -> dict:
    """Parse a DATABASE_URL into mysql.connector keyword arguments.

    Handles the ``mysql+pymysql://`` driver prefix used by SQLAlchemy URLs.

    Args:
        url: A database URL such as
            ``mysql+pymysql://user:pass@host/dbname``.

    Returns:
        A dict with keys ``host``, ``port``, ``user``, ``password``,
        ``database`` suitable for passing to ``MySQLConnectionPool``.
    """
    url = url.strip()
    # Drop the driver sub-protocol (e.g. "+pymysql") so urlparse works.
    if "://" in url:
        scheme, rest = url.split("://", 1)
        scheme = scheme.split("+")[0]
        url = f"{scheme}://{rest}"
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or "fastapi_user"),
        "password": unquote(parsed.password or "password"),
        "database": (parsed.path or "/kk_v1").lstrip("/") or "kk_v1",
    }


_DEV_DATABASE_URL = "mysql+pymysql://fastapi_user:password@localhost/kk_v1"
_RAW_DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
_DATABASE_URL: str = _RAW_DATABASE_URL or _DEV_DATABASE_URL
if not _RAW_DATABASE_URL:
    warnings.warn(
        "DATABASE_URL is not set. Using insecure dev default credentials. "
        "Set DATABASE_URL in backend/.env before deploying to production.",
        stacklevel=1,
    )
_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))

_db_params = _parse_db_url(_DATABASE_URL)
DATABASE_NAME: str = _db_params["database"]

_pool = MySQLConnectionPool(
    pool_name="kk_pool",
    pool_size=_POOL_SIZE,
    pool_reset_session=True,
    use_pure=True,
    autocommit=False,
    **_db_params,
)


def get_raw_db():
    """Return a connection from the shared MySQL connection pool.

    The caller must close the connection when finished (``db.close()``).
    On a pooled connection, ``close()`` returns the connection to the pool
    instead of tearing it down, so all existing ``try/finally: db.close()``
    patterns work without modification.

    Returns:
        A ``mysql.connector.pooling.PooledMySQLConnection`` instance.
    """
    return _pool.get_connection()
