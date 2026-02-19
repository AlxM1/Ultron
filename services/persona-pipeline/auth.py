"""API key authentication and rate limiting for Persona Pipeline."""

import os
import logging
from fastapi import Request, HTTPException, Security
from fastapi.security import APIKeyHeader
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("auth")

API_KEY_HEADER = APIKeyHeader(name="Authorization", auto_error=False)


def get_api_key() -> str | None:
    """Get the configured API key from environment."""
    return os.getenv("PERSONA_API_KEY")


async def require_api_key(request: Request, api_key: str = Security(API_KEY_HEADER)):
    """Dependency that enforces API key authentication.

    Expects: Authorization: Bearer <key>
    """
    expected = get_api_key()
    if not expected:
        logger.warning("PERSONA_API_KEY not set — rejecting all requests. Set this env var to enable access.")
        raise HTTPException(status_code=503, detail="Service not configured: API key not set")

    if not api_key:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Support both "Bearer <key>" and raw "<key>"
    token = api_key.removeprefix("Bearer ").strip()

    if token != expected:
        raise HTTPException(status_code=403, detail="Invalid API key")


# Rate limiter keyed by client IP
limiter = Limiter(key_func=get_remote_address)
