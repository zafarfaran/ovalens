"""Anthropic Claude LLM adapter with tool-calling support."""

import json
from collections.abc import AsyncGenerator

import anthropic

from app.config import get_settings
from app.core.logging import get_logger
from app.services.llm.types import (
    DashboardUpdateEvent,
    DoneEvent,
    ErrorEvent,
    StatusEvent,
    StatusPhase,
    StreamEvent,
    TokenEvent,
    ToolCallEvent,
    ToolResultEvent,
)
from app.services.tools import execute_tool

logger = get_logger(__name__)

MAX_TOOL_ROUNDS = 20

BASE_TOOLS = [
    {
        "name": "search_meeting_notes",
        "description": (
            "Search through the client's meeting notes to find relevant past discussions, "
            "decisions, action items, and context. Use when the adviser asks about previous "
            "meetings, or when you need historical context about the client's situation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Search keywords — e.g. 'pension salary sacrifice', "
                        "'rental property CGT', 'year-end planning'"
                    ),
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 5)",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    }
]

ENGINE_TOOLS = [
    {
        "name": "compute_tax_position",
        "description": (
            "Run the deterministic tax engine to compute a complete UK tax position. "
            "Returns income tax, NI, HICBC, pension AA, and observations. "
            "You MUST use this tool instead of calculating tax numbers yourself."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "income_sources": {
                    "type": "array",
                    "description": "List of income sources",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_type": {
                                "type": "string",
                                "enum": [
                                    "employment", "self_employment", "rental",
                                    "pension_income", "savings", "dividends", "other",
                                ],
                            },
                            "gross_amount": {"type": "number"},
                            "label": {"type": "string"},
                            "expenses": {"type": "number"},
                        },
                        "required": ["source_type", "gross_amount"],
                    },
                },
                "pension_contributions": {
                    "type": "number",
                    "description": (
                        "Annual gross personal pension contributions "
                        "(SIPP / relief at source). Reduces ANI and extends basic rate band."
                    ),
                },
                "employer_contributions": {
                    "type": "number",
                    "description": (
                        "Annual employer pension contributions (including salary sacrifice). "
                        "Counts toward pension AA but does NOT reduce ANI."
                    ),
                },
                "gift_aid": {
                    "type": "number",
                    "description": "Net gift aid donations (will be grossed up)",
                },
                "region": {
                    "type": "string",
                    "enum": ["england", "wales", "northern_ireland", "scotland"],
                },
                "number_of_children": {"type": "integer"},
                "claims_child_benefit": {"type": "boolean"},
                "tax_year": {"type": "string"},
            },
            "required": ["income_sources"],
        },
    },
    {
        "name": "model_salary_sacrifice",
        "description": (
            "Model the tax impact of salary sacrifice. Computes current vs proposed "
            "tax positions and returns the savings breakdown (IT, NI, HICBC avoided). "
            "You MUST call this tool for EVERY salary sacrifice scenario — including "
            "follow-ups. Never extrapolate from a previous result; tax is non-linear."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "gross_salary": {
                    "type": "number",
                    "description": "Current gross salary before any sacrifice",
                },
                "sacrifice_amount": {
                    "type": "number",
                    "description": "Proposed total salary sacrifice amount",
                },
                "current_sacrifice": {
                    "type": "number",
                    "description": "Existing salary sacrifice amount (default 0)",
                },
                "other_income_sources": {
                    "type": "array",
                    "description": "Other income sources beyond the salary",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_type": {"type": "string"},
                            "gross_amount": {"type": "number"},
                            "label": {"type": "string"},
                        },
                        "required": ["source_type", "gross_amount"],
                    },
                },
                "region": {"type": "string"},
                "number_of_children": {"type": "integer"},
                "claims_child_benefit": {"type": "boolean"},
            },
            "required": ["gross_salary", "sacrifice_amount"],
        },
    },
    {
        "name": "model_personal_pension",
        "description": (
            "Model the tax impact of personal pension contributions (SIPP / relief at source). "
            "Computes current vs proposed tax positions and returns savings breakdown "
            "(income tax, HICBC avoided, PA restored) plus optimal contribution thresholds. "
            "You MUST call this tool for EVERY pension contribution scenario — including "
            "follow-ups. Never extrapolate from a previous result; tax is non-linear."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "income_sources": {
                    "type": "array",
                    "description": "List of income sources",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_type": {
                                "type": "string",
                                "enum": [
                                    "employment", "self_employment", "rental",
                                    "pension_income", "savings", "dividends", "other",
                                ],
                            },
                            "gross_amount": {"type": "number"},
                            "label": {"type": "string"},
                        },
                        "required": ["source_type", "gross_amount"],
                    },
                },
                "proposed_contribution": {
                    "type": "number",
                    "description": (
                        "The proposed annual gross personal pension contribution to model"
                    ),
                },
                "current_contribution": {
                    "type": "number",
                    "description": (
                        "Existing annual personal pension contribution (default 0)"
                    ),
                },
                "employer_contributions": {
                    "type": "number",
                    "description": (
                        "Annual employer pension contributions including salary sacrifice "
                        "(for pension AA check only — does not affect tax savings)"
                    ),
                },
                "gift_aid": {
                    "type": "number",
                    "description": "Net gift aid donations (default 0)",
                },
                "region": {"type": "string"},
                "number_of_children": {"type": "integer"},
                "claims_child_benefit": {"type": "boolean"},
            },
            "required": ["income_sources", "proposed_contribution"],
        },
    },
]

OBSERVATION_TOOLS = [
    {
        "name": "save_observation",
        "description": (
            "Save a tax planning observation or advisory insight to the client's record. "
            "Use this when you identify an actionable insight during the conversation that "
            "the adviser should be aware of — e.g. marriage allowance opportunity, pension "
            "carry-forward reminder, or a planning consideration. These persist on the client's "
            "profile for future reference. Do NOT save trivial or generic observations."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short title for the observation (e.g. 'Marriage Allowance Transfer Opportunity')",
                },
                "description": {
                    "type": "string",
                    "description": "Detailed description with specific numbers and context from the conversation",
                },
                "severity": {
                    "type": "string",
                    "enum": ["info", "warning", "opportunity"],
                    "description": "info = FYI, warning = needs attention, opportunity = potential saving",
                },
                "category": {
                    "type": "string",
                    "description": "Tax area: income_tax, pension, savings, capital_gains, child_benefit, planning, iht",
                },
                "potential_saving": {
                    "type": "number",
                    "description": "Estimated annual tax saving in £ (optional, only if quantifiable)",
                },
            },
            "required": ["title", "description", "severity", "category"],
        },
    }
]

DASHBOARD_TOOLS = [
    {
        "name": "generate_dashboard",
        "description": (
            "Manually update the dashboard layout. NOTE: You usually do NOT need this — "
            "compute_tax_position automatically updates the dashboard with engine results. "
            "Only use this for non-engine dashboard changes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["reset", "iterate"],
                    "description": "reset = create from scratch, iterate = modify existing",
                },
                "relevantTaxData": {
                    "type": "object",
                    "description": "Structured UK tax data for dashboard generation",
                },
            },
            "required": ["mode", "relevantTaxData"],
        },
    }
]


class ClaudeProvider:
    def __init__(self):
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.ai_model
        logger.info("Claude provider initialized", model=self.model)

    async def stream_chat(
        self,
        messages: list[dict],
        system_prompt: str,
        tools: list[dict] | None = None,
        tool_context: dict | None = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        logger.info(
            "Starting Claude stream",
            message_count=len(messages),
            model=self.model,
        )

        yield StatusEvent(phase=StatusPhase.UNDERSTANDING)

        first_token = True
        input_tokens = 0
        output_tokens = 0

        try:
            # Build API kwargs — only include tools when provided
            api_kwargs: dict = {
                "model": self.model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": messages,
            }
            if tools:
                api_kwargs["tools"] = tools

            max_rounds = MAX_TOOL_ROUNDS if tools else 1

            for _round in range(max_rounds):
                tool_called = False
                # Track tool_use content blocks being built
                current_tool_id: str | None = None
                current_tool_name: str | None = None
                input_json_parts: list[str] = []
                # Collect full assistant content blocks for the tool-result loop
                assistant_content_blocks: list[dict] = []
                tool_result_contents: list[dict] = []
                current_text_block: str = ""

                async with self.client.messages.stream(**{**api_kwargs, "messages": messages}) as stream:
                    async for event in stream:
                        if event.type == "content_block_start":
                            if event.content_block.type == "tool_use":
                                # Starting a tool_use block
                                current_tool_id = event.content_block.id
                                current_tool_name = event.content_block.name
                                input_json_parts = []
                                tool_status = {
                                    "generate_dashboard": StatusPhase.BUILDING_DASHBOARD,
                                    "search_meeting_notes": StatusPhase.SEARCHING_NOTES,
                                    "compute_tax_position": StatusPhase.COMPUTING_TAX,
                                    "model_salary_sacrifice": StatusPhase.MODELLING_SCENARIO,
                                    "model_personal_pension": StatusPhase.MODELLING_SCENARIO,
                                    "save_observation": StatusPhase.SAVING_OBSERVATION,
                                }
                                yield StatusEvent(
                                    phase=tool_status.get(current_tool_name, StatusPhase.CALCULATING),
                                )
                            elif event.content_block.type == "text":
                                current_text_block = ""

                        elif event.type == "content_block_delta":
                            if hasattr(event.delta, "text"):
                                # Text delta
                                if first_token:
                                    yield StatusEvent(
                                        phase=StatusPhase.GENERATING_RESPONSE,
                                    )
                                    first_token = False
                                current_text_block += event.delta.text
                                yield TokenEvent(content=event.delta.text)
                            elif hasattr(event.delta, "partial_json"):
                                # Tool input JSON delta
                                input_json_parts.append(event.delta.partial_json)

                        elif event.type == "content_block_stop":
                            if current_tool_id and current_tool_name:
                                # Tool block completed — parse input and execute
                                raw_json = "".join(input_json_parts)
                                try:
                                    tool_input = json.loads(raw_json) if raw_json else {}
                                except json.JSONDecodeError:
                                    logger.error(
                                        "Failed to parse tool input JSON",
                                        tool=current_tool_name,
                                        raw=raw_json[:500],
                                    )
                                    tool_input = {}

                                logger.info(
                                    "Tool call detected",
                                    tool=current_tool_name,
                                    tool_id=current_tool_id,
                                    tool_input=tool_input,
                                )

                                yield ToolCallEvent(
                                    tool=current_tool_name,
                                    tool_input=tool_input,
                                )

                                # Execute the tool
                                tool_result = await execute_tool(
                                    current_tool_name, tool_input, context=tool_context
                                )

                                yield ToolResultEvent(
                                    tool=current_tool_name,
                                    result=tool_result,
                                )

                                # Trigger dashboard update from engine or dashboard tool.
                                # compute_tax_position returns dashboardData directly
                                # from the engine — no LLM relay needed.
                                if (
                                    tool_result.get("success")
                                    and "dashboardData" in tool_result
                                    and current_tool_name in (
                                        "generate_dashboard",
                                        "compute_tax_position",
                                    )
                                ):
                                    yield DashboardUpdateEvent(
                                        data=tool_result["dashboardData"],
                                        mode=tool_result.get("mode", "reset"),
                                    )

                                # Record the tool_use block for the continuation message
                                assistant_content_blocks.append({
                                    "type": "tool_use",
                                    "id": current_tool_id,
                                    "name": current_tool_name,
                                    "input": tool_input,
                                })

                                # Append the tool result to messages for the next round
                                # First, add the assistant message with all content blocks so far
                                # (will be done after stream ends)
                                tool_called = True

                                # Collect tool_result for continuation
                                tool_result_contents.append({
                                    "type": "tool_result",
                                    "tool_use_id": current_tool_id,
                                    "content": json.dumps(tool_result),
                                })

                                # Reset
                                current_tool_id = None
                                current_tool_name = None
                                input_json_parts = []
                            else:
                                # Text block completed
                                if current_text_block:
                                    assistant_content_blocks.append({
                                        "type": "text",
                                        "text": current_text_block,
                                    })
                                    current_text_block = ""

                        elif event.type == "message_start":
                            if event.message and event.message.usage:
                                input_tokens += event.message.usage.input_tokens

                        elif event.type == "message_delta":
                            if hasattr(event, "usage") and event.usage:
                                output_tokens += event.usage.output_tokens

                if tool_called:
                    # Continue the conversation with the tool result
                    # Append assistant message with all content blocks
                    messages.append({
                        "role": "assistant",
                        "content": assistant_content_blocks,
                    })
                    # Append all tool results as a user message
                    messages.append({
                        "role": "user",
                        "content": tool_result_contents,
                    })
                    # Reset for next round
                    first_token = True
                    # Emit transitional status so the frontend indicator
                    # properly switches between phases during the gap
                    # while the next API call is being prepared
                    yield StatusEvent(phase=StatusPhase.UNDERSTANDING)
                    logger.info(
                        "Continuing after tool call",
                        round=_round + 1,
                    )
                else:
                    # No tool calls — we're done
                    break
            else:
                # Exhausted all rounds while tools were still being called
                if tool_called:
                    logger.warning(
                        "Max tool rounds exhausted — final response may be incomplete",
                        max_rounds=max_rounds,
                    )

            logger.info(
                "Claude stream completed",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )
            yield StatusEvent(phase=StatusPhase.COMPLETE)

        except anthropic.APIError as e:
            logger.error(
                "Claude API error",
                error=str(e),
                status_code=getattr(e, "status_code", None),
            )
            yield ErrorEvent(error=str(e), code="CLAUDE_API_ERROR")
        except Exception as e:
            logger.exception("Unexpected error during Claude stream")
            yield ErrorEvent(error=str(e), code="LLM_STREAM_ERROR")
