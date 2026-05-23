"""Kuteera Kitchen FastAPI application entry point.

This module creates the FastAPI app, configures middleware, and includes all
domain routers. All business logic lives in the router modules under
backend/routers/ and backend/customer/.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .routers import admin_logs, nl_router, reports
from .routers.auth import router as auth_router
from .routers.city import router as city_router
from .routers.customers import router as customers_router
from .routers.dashboard import router as dashboard_router
from .routers.developer import router as developer_router
from .routers.logistics import router as logistics_router
from .routers.menu import router as menu_router
from .routers.orders import router as orders_router
from .routers.products import router as products_router
from .routers.production import router as production_router
from .routers.rbac import router as rbac_router

# Import db to ensure the shared connection pool is initialised at startup.
from . import db as _db  # noqa: F401
from .db import get_raw_db
from .utils.helpers import _ensure_menu_type_column, get_items_columns


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run schema initialisation once at startup before serving any requests.

    Caches the items table column set and applies any outstanding schema
    migrations (menu_type column guard) so that request handlers never need
    to do schema inspection at runtime.
    """
    db = get_raw_db()
    try:
        cursor = db.cursor(dictionary=True)
        try:
            _ensure_menu_type_column(db)
            get_items_columns(cursor)
        finally:
            cursor.close()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Kuteera Kitchen API",
    description="Backend API for the Kuteera Kitchen meal prep and delivery platform.",
    version="1.0.0",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-existing modular routers
app.include_router(admin_logs.router)
app.include_router(reports.router)
app.include_router(nl_router.router)

# Domain routers
app.include_router(auth_router)
app.include_router(rbac_router)
app.include_router(city_router)
app.include_router(customers_router)
app.include_router(products_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(production_router)
app.include_router(logistics_router)
app.include_router(dashboard_router)
app.include_router(developer_router)


@app.api_route("/health", methods=["GET", "HEAD"], tags=["ops"])
async def health() -> JSONResponse:
    """Health check endpoint.

    Returns 200 OK when the backend process is running and can reach the
    database. Used by the GitLab CI/CD post-deploy check and uptime monitors.

    Returns:
        JSON with status and version fields.
    """
    try:
        db = get_raw_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            db_ok = True
        finally:
            db.close()
    except Exception:
        db_ok = False

    status = "ok" if db_ok else "degraded"
    code = 200 if db_ok else 503
    return JSONResponse({"status": status, "version": app.version}, status_code=code)
