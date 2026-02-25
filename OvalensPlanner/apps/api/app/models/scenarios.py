"""Scenario modelling models."""

from pydantic import BaseModel


class Scenario(BaseModel):
    id: str
    name: str
    description: str
    changes: dict[str, float]
    projected_tax: float
    current_tax: float
    saving: float
