"""Vercel serverless entry point — exposes the FastAPI app as a handler."""

from app.main import app

# Vercel's Python runtime picks up the `app` variable as an ASGI handler.
# No additional adapter needed — FastAPI is ASGI-native.
