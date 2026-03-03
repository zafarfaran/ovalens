"""Supabase JWT validation for API authentication."""

from __future__ import annotations

from functools import lru_cache

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient, PyJWTError

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Supabase issues JWTs with audience "authenticated" for logged-in users
SUPABASE_JWT_AUDIENCE = "authenticated"
SUPABASE_JWT_ALGORITHM = "HS256"


def get_bearer_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    return auth[7:].strip() or None


@lru_cache(maxsize=8)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    """Cached JWKS client per issuer URL."""
    return PyJWKClient(jwks_url)


def _verify_asymmetric_supabase_jwt(token: str, algorithm: str) -> dict:
    """Verify Supabase asymmetric JWTs (e.g. ES256) via issuer JWKS."""
    # Parse unverified claims to discover the issuer (Supabase Auth URL).
    unverified = jwt.decode(
        token,
        options={"verify_signature": False, "verify_exp": False, "verify_aud": False},
    )
    issuer = str(unverified.get("iss") or "").strip()
    if not issuer:
        raise HTTPException(status_code=401, detail="Invalid token: missing issuer")

    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
    signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        audience=SUPABASE_JWT_AUDIENCE,
        issuer=issuer,
        algorithms=[algorithm],
    )


def verify_supabase_jwt(token: str) -> dict:
    """Verify a Supabase-issued JWT and return the payload.

    Uses the project JWT secret (HS256). Raises HTTPException 401 on invalid or expired token.
    """
    settings = get_settings()
    is_dev = getattr(settings, "environment", "") == "development"
    header = None
    try:
        header = jwt.get_unverified_header(token)
        alg = str(header.get("alg") or "").upper()
        if is_dev:
            logger.info("JWT verification: token alg=%s", alg or "(none)")
        if alg in {"ES256", "RS256"}:
            payload = _verify_asymmetric_supabase_jwt(token, alg)
        else:
            secret = getattr(settings, "supabase_jwt_secret", None) or (
                getattr(settings, "supabase_jwt_secret_key", None)
            )
            if not secret:
                logger.warning("Supabase JWT secret not configured — rejecting all tokens")
                raise HTTPException(status_code=501, detail="Authentication not configured")
            secret = (secret or "").strip()
            if is_dev:
                logger.info(
                    "JWT verification: using HS256 with configured secret (len=%s)",
                    len(secret),
                )
            payload = jwt.decode(
                token,
                secret,
                audience=SUPABASE_JWT_AUDIENCE,
                algorithms=[SUPABASE_JWT_ALGORITHM],
            )
    except PyJWTError as e:
        err_msg = str(e)
        # Do not log err_msg in the message (redacted when passed as key=error)
        logger.debug("JWT verification failed", error=err_msg)
        if is_dev:
            alg_hint = (header or {}).get("alg") or "(unknown)"
            logger.info(
                "Auth 401: JWT verification failed. Alg was %s. For HS256 use Dashboard "
                "JWT Secret (not anon key). For ES256/RS256 the API uses JWKS from issuer.",
                alg_hint,
            )
            if "Signature" in err_msg or "signature" in err_msg:
                logger.info(
                    "Signature failure usually means: wrong SUPABASE_JWT_SECRET, "
                    "or token from a different project."
                )
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")

    return payload


def get_user_id_from_token(token: str) -> str:
    """Verify JWT and return the user id (sub claim). Raises HTTPException 401 on failure."""
    payload = verify_supabase_jwt(token)
    return str(payload["sub"])
