"""Stream event types for LLM responses."""

from dataclasses import dataclass, field
from enum import StrEnum


class StatusPhase(StrEnum):
    UNDERSTANDING = "understanding"
    ANALYZING_INCOME = "analyzing_income"
    CHECKING_ALLOWANCES = "checking_allowances"
    CALCULATING = "calculating"
    COMPUTING_TAX = "computing_tax"
    MODELLING_SCENARIO = "modelling_scenario"
    BUILDING_DASHBOARD = "building_dashboard"
    SEARCHING_NOTES = "searching_notes"
    SAVING_OBSERVATION = "saving_observation"
    GENERATING_RESPONSE = "generating_response"
    COMPLETE = "complete"


STATUS_MESSAGES: dict[StatusPhase, str] = {
    StatusPhase.UNDERSTANDING: "Understanding your question...",
    StatusPhase.ANALYZING_INCOME: "Analysing income sources...",
    StatusPhase.CHECKING_ALLOWANCES: "Checking allowance status...",
    StatusPhase.CALCULATING: "Running tax calculations...",
    StatusPhase.COMPUTING_TAX: "Computing tax position...",
    StatusPhase.MODELLING_SCENARIO: "Modelling salary sacrifice scenario...",
    StatusPhase.BUILDING_DASHBOARD: "Building dashboard...",
    StatusPhase.SEARCHING_NOTES: "Searching meeting notes...",
    StatusPhase.SAVING_OBSERVATION: "Generating observations...",
    StatusPhase.GENERATING_RESPONSE: "Generating response...",
    StatusPhase.COMPLETE: "",
}


@dataclass
class TokenEvent:
    content: str
    type: str = field(default="token", init=False)


@dataclass
class StatusEvent:
    phase: StatusPhase
    message: str = ""
    type: str = field(default="status", init=False)

    def __post_init__(self):
        if not self.message:
            self.message = STATUS_MESSAGES.get(self.phase, "")


@dataclass
class ToolCallEvent:
    tool: str
    tool_input: dict
    type: str = field(default="tool_call", init=False)


@dataclass
class ToolResultEvent:
    tool: str
    result: dict
    type: str = field(default="tool_result", init=False)


@dataclass
class DashboardUpdateEvent:
    data: dict
    mode: str = "reset"
    type: str = field(default="dashboard_update", init=False)


@dataclass
class DoneEvent:
    conversation_id: str
    message_id: str
    input_tokens: int = 0
    output_tokens: int = 0
    type: str = field(default="done", init=False)


@dataclass
class ErrorEvent:
    error: str
    code: str = "LLM_ERROR"
    type: str = field(default="error", init=False)


StreamEvent = (
    TokenEvent
    | StatusEvent
    | ToolCallEvent
    | ToolResultEvent
    | DashboardUpdateEvent
    | DoneEvent
    | ErrorEvent
)
