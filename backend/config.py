# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()  # loads backend/.env

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

ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_SEC  = int(_clean(os.getenv("ACCESS_TOKEN_TTL_SEC",  "86400")))    # 24h
REFRESH_TOKEN_TTL_SEC = int(_clean(os.getenv("REFRESH_TOKEN_TTL_SEC", "604800")))   # 7d

COOKIE_SECURE   = (_clean(os.getenv("COOKIE_SECURE", "false")) or "").lower() == "true"
COOKIE_SAMESITE = _clean(os.getenv("COOKIE_SAMESITE", "Lax")) or "Lax"
COOKIE_DOMAIN   = _clean(os.getenv("BACKEND_DOMAIN")) or None
