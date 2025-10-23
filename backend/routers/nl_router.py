from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..nl import get_service
from ..nl.sql_service import SQLGenerationService

router = APIRouter(prefix="/api/nl", tags=["Natural Language"])


class NLQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=500)


class NLSQLQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=500)


RATE_LIMIT_WINDOW = 60.0
RATE_LIMIT_MAX = 30
_request_log: Dict[str, Deque[float]] = defaultdict(deque)
_sql_service = SQLGenerationService()


def _enforce_rate_limit(identifier: str) -> None:
    now = time.monotonic()
    bucket = _request_log[identifier]
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests")
    bucket.append(now)


@router.post("/route")
def route_nl_query(
    payload: NLQuery,
    request: Request,
    db: Session = Depends(get_db),
):
    identifier = request.client.host if request.client else "anonymous"
    _enforce_rate_limit(identifier)
    service = get_service()
    return service.interpret(payload.q, db)


@router.get("/route")
def route_nl_query_get(
    request: Request,
    q: str = Query(..., min_length=1, max_length=500),
    db: Session = Depends(get_db),
):
    identifier = request.client.host if request.client else "anonymous"
    _enforce_rate_limit(identifier)
    service = get_service()
    return service.interpret(q, db)


@router.post("/sql")
def route_nl_sql_query(
    payload: NLSQLQuery,
    request: Request,
    db: Session = Depends(get_db),
):
    identifier = request.client.host if request.client else "anonymous"
    _enforce_rate_limit(identifier)
    try:
        result = _sql_service.handle_query(query=payload.q, db=db)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return result
