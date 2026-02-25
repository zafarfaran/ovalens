"""Allowance tracking models."""

from pydantic import BaseModel


class AllowanceItem(BaseModel):
    name: str
    annual_limit: float
    used: float = 0
    remaining: float = 0
    carry_forward: float | None = None


class AllowancesTracker(BaseModel):
    personal_allowance: AllowanceItem
    isa_allowance: AllowanceItem
    pension_annual_allowance: AllowanceItem
    cgt_annual_exempt: AllowanceItem
    dividend_allowance: AllowanceItem
