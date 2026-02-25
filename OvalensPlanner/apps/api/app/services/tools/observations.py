"""Observation tool — saves AI-generated observations to the client record."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.engine import async_session_factory
from app.db.models import Client, Observation

logger = get_logger(__name__)


async def execute_save_observation(
    tool_input: dict, context: dict | None = None
) -> dict:
    """Save an AI-generated observation to the database."""
    client_id = context.get("client_id") if context else None
    if not client_id:
        return {"error": "No client context available"}

    title = tool_input.get("title", "")
    description = tool_input.get("description", "")
    severity = tool_input.get("severity", "info")
    category = tool_input.get("category", "planning")
    potential_saving = tool_input.get("potential_saving")

    if not title or not description:
        return {"error": "Title and description are required"}

    async with async_session_factory() as session:
        # Verify client exists
        result = await session.execute(
            select(Client).where(Client.id == client_id)
        )
        client = result.scalar_one_or_none()
        if not client:
            return {"error": f"Client {client_id} not found"}

        # Check for duplicate (same title + source=ai for this client)
        existing = await session.execute(
            select(Observation).where(
                Observation.client_id == client_id,
                Observation.title == title,
                Observation.source == "ai",
            )
        )
        if existing.scalar_one_or_none():
            return {"success": True, "message": "Observation already exists", "duplicate": True}

        priority = "high" if severity == "warning" else ("medium" if severity == "opportunity" else "low")

        obs = Observation(
            client_id=client_id,
            title=title,
            description=description,
            severity=severity,
            priority=priority,
            category=category,
            potential_saving=potential_saving,
            source="ai",
        )
        session.add(obs)
        await session.commit()

        logger.info(
            "AI observation saved",
            client_id=client_id,
            title=title,
            severity=severity,
            observation_id=obs.id,
        )

        return {
            "success": True,
            "observation_id": obs.id,
            "message": f"Observation '{title}' saved to client record.",
        }
