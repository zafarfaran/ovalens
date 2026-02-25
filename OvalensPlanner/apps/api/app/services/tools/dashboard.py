"""Dashboard tool executor — validates and passes through Claude-structured tax data."""

from app.core.logging import get_logger

logger = get_logger(__name__)


async def execute_generate_dashboard(tool_input: dict, *, context: dict | None = None) -> dict:
    """Execute the generate_dashboard tool.

    This is a pass-through — Claude provides structured tax data,
    we validate the basic shape and return it as the dashboard payload.
    """
    mode = tool_input.get("mode", "reset")
    tax_data = tool_input.get("taxData") or tool_input.get("relevantTaxData", {})

    if not tax_data:
        logger.warning("generate_dashboard called with empty relevantTaxData")
        return {"success": False, "error": "relevantTaxData is required"}

    logger.info(
        "generate_dashboard executed",
        mode=mode,
        tax_data_keys=list(tax_data.keys()),
    )

    return {
        "success": True,
        "mode": mode,
        "dashboardData": tax_data,
        "message": f"Dashboard {'created' if mode == 'reset' else 'updated'} successfully",
    }
