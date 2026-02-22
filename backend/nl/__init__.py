from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from .engine import NLService


@lru_cache()
def get_service() -> NLService:
    base_dir = Path(__file__).resolve().parent
    return NLService(base_dir)


__all__ = ["get_service", "NLService"]
