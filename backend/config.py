# backend/config.py
import os
import warnings
from pathlib import Path
from dotenv import load_dotenv

# Load from backend/.env relative to this file, regardless of working directory.
load_dotenv(dotenv_path=Path(__file__).parent / ".env")


def _clean(s: str | None) -> str | None:
    if s is None:
        return None
    s = s.strip()
    # strip matching wrapping quotes: "secret" or 'secret'
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    return s


SECRET_KEY = _clean(os.getenv("SECRET_KEY", "dev-secret"))
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is empty after cleaning")
if SECRET_KEY == "dev-secret":
    warnings.warn(
        "SECRET_KEY is set to the insecure default 'dev-secret'. "
        "Set a strong SECRET_KEY in backend/.env before deploying to production.",
        stacklevel=1,
    )

ALGORITHM = "HS256"


def _access_token_ttl() -> int:
    """Resolve access token TTL from env.

    Supports two env var names for backward compatibility:
    - ACCESS_TOKEN_TTL_SEC (seconds, takes priority)
    - ACCESS_TOKEN_EXPIRE_MINUTES (minutes, converted to seconds)

    Defaults to 900 seconds (15 minutes) if neither is set.
    """
    if val := _clean(os.getenv("ACCESS_TOKEN_TTL_SEC")):
        return int(val)
    if val := _clean(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")):
        return int(val) * 60
    return 900  # 15 minutes


def _refresh_token_ttl() -> int:
    """Resolve refresh token TTL from env.

    Supports two env var names for backward compatibility:
    - REFRESH_TOKEN_TTL_SEC (seconds, takes priority)
    - REFRESH_TOKEN_EXPIRE_DAYS (days, converted to seconds)

    Defaults to 604800 seconds (7 days) if neither is set.
    """
    if val := _clean(os.getenv("REFRESH_TOKEN_TTL_SEC")):
        return int(val)
    if val := _clean(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")):
        return int(val) * 86400
    return 604800  # 7 days


ACCESS_TOKEN_TTL_SEC = _access_token_ttl()
REFRESH_TOKEN_TTL_SEC = _refresh_token_ttl()

COOKIE_SECURE = (_clean(os.getenv("COOKIE_SECURE", "false")) or "").lower() == "true"
COOKIE_SAMESITE = _clean(os.getenv("COOKIE_SAMESITE", "Lax")) or "Lax"
COOKIE_DOMAIN = _clean(os.getenv("BACKEND_DOMAIN")) or None
