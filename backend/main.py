"""Kuteera Kitchen FastAPI application entry point.

This module creates the FastAPI app, configures middleware, and includes all
domain routers. All business logic lives in the router modules under
backend/routers/ and backend/customer/.
"""

from __future__ import annotations

import mysql.connector
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Guard against mysql-connector native C-extension segfaults seen on macOS.
_mysql_connect_original = mysql.connector.connect


def _mysql_connect_force_pure(*args, **kwargs):
    kwargs.setdefault("use_pure", True)
    return _mysql_connect_original(*args, **kwargs)


mysql.connector.connect = _mysql_connect_force_pure

app = FastAPI(
    title="Kuteera Kitchen API",
    description="Backend API for the Kuteera Kitchen meal prep and delivery platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",  # swagger same-origin
    ],
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
