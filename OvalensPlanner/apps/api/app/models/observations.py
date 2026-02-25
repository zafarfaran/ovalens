"""Tax observation models."""

from enum import StrEnum

from pydantic import BaseModel


class ObservationSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    OPPORTUNITY = "opportunity"
    ACTION_REQUIRED = "action_required"


class Observation(BaseModel):
    id: str
    title: str
    description: str
    severity: ObservationSeverity
    category: str
    potential_saving: float | None = None
