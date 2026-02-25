"""Tool registry — maps tool names to executor functions."""

from app.core.logging import get_logger
from app.services.tools.dashboard import execute_generate_dashboard
from app.services.tools.meeting_notes import execute_search_meeting_notes
from app.services.tools.observations import execute_save_observation
from app.services.tools.tax_engine import (
    execute_compute_tax_position,
    execute_model_salary_sacrifice,
    execute_model_personal_pension,
)

logger = get_logger(__name__)

TOOL_EXECUTORS: dict = {
    "generate_dashboard": execute_generate_dashboard,
    "search_meeting_notes": execute_search_meeting_notes,
    "compute_tax_position": execute_compute_tax_position,
    "model_salary_sacrifice": execute_model_salary_sacrifice,
    "model_personal_pension": execute_model_personal_pension,
    "save_observation": execute_save_observation,
}


async def execute_tool(
    name: str, tool_input: dict, context: dict | None = None
) -> dict:
    """Look up and run a tool executor by name."""
    executor = TOOL_EXECUTORS.get(name)
    if not executor:
        logger.warning("Unknown tool requested", tool=name)
        return {"error": f"Unknown tool: {name}"}
    return await executor(tool_input, context=context)
