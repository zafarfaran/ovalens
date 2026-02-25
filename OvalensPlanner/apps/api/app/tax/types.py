"""Shared types for the deterministic tax engine.

All engine I/O uses frozen dataclasses from this single file.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import StrEnum


# ── Enums ────────────────────────────────────────────────────────────────────

class PAStatus(StrEnum):
    FULL = "full"
    TAPERED = "tapered"
    LOST = "lost"


class IncomeType(StrEnum):
    EMPLOYMENT = "employment"
    SELF_EMPLOYMENT = "self_employment"
    RENTAL = "rental"
    PENSION_INCOME = "pension_income"
    SAVINGS = "savings"
    DIVIDENDS = "dividends"
    OTHER = "other"


NON_SAVINGS_TYPES = frozenset({
    IncomeType.EMPLOYMENT,
    IncomeType.SELF_EMPLOYMENT,
    IncomeType.RENTAL,
    IncomeType.PENSION_INCOME,
    IncomeType.OTHER,
})


# ── Core dataclasses ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class IncomeSource:
    source_type: IncomeType
    gross_amount: float
    label: str = ""
    expenses: float = 0.0

    @property
    def net_amount(self) -> float:
        return self.gross_amount - self.expenses


@dataclass(frozen=True)
class TaxBandResult:
    name: str
    income_in_band: float
    rate: float
    tax: float


@dataclass(frozen=True)
class ANIResult:
    total_income: float
    pension_contributions: float
    gift_aid_gross: float
    adjusted_net_income: float
    personal_allowance: float
    personal_allowance_lost: float
    pa_status: PAStatus
    in_taper_zone: bool


@dataclass(frozen=True)
class IncomeTaxResult:
    non_savings_tax: float
    savings_tax: float
    dividend_tax: float
    total_income_tax: float
    taxable_income: float
    non_savings_bands: list[TaxBandResult]
    savings_bands: list[TaxBandResult]
    dividend_bands: list[TaxBandResult]
    personal_savings_allowance: float
    dividend_allowance_used: float


@dataclass(frozen=True)
class NIClass1Result:
    earnings: float
    primary_threshold: float
    upper_earnings_limit: float
    employee_main_rate: float
    employee_upper_rate: float
    main_ni: float
    upper_ni: float
    total_employee_ni: float
    employer_secondary_threshold: float
    employer_rate: float
    total_employer_ni: float


@dataclass(frozen=True)
class NIClass2Result:
    profits: float
    qualifies: bool
    weekly_rate: float
    weeks: int
    annual_ni: float


@dataclass(frozen=True)
class NIClass4Result:
    profits: float
    lower_profit_limit: float
    upper_profit_limit: float
    main_rate: float
    upper_rate: float
    main_ni: float
    upper_ni: float
    total_ni: float


@dataclass(frozen=True)
class NIResult:
    class_1: NIClass1Result | None
    class_2: NIClass2Result | None
    class_4: NIClass4Result | None
    total_ni: float


@dataclass(frozen=True)
class HICBCResult:
    applies: bool
    child_benefit_annual: float
    clawback_percentage: float
    hicbc_charge: float
    net_benefit: float


@dataclass(frozen=True)
class CarryForwardYear:
    tax_year: str
    annual_allowance: float
    contributions: float
    unused: float


@dataclass(frozen=True)
class PensionAAResult:
    annual_allowance: float
    is_tapered: bool
    carry_forward: list[CarryForwardYear]
    total_available: float
    remaining: float
    current_year_contributions: float
    mpaa_applies: bool


@dataclass(frozen=True)
class SavingsBreakdownItem:
    label: str
    value: str


@dataclass(frozen=True)
class TaxImpactItem:
    label: str
    annual: float
    monthly: float


@dataclass(frozen=True)
class SavingsBreakdown:
    current_state: list[SavingsBreakdownItem]
    recommended_action: list[SavingsBreakdownItem]
    tax_impact: list[TaxImpactItem]
    total_annual: float
    total_monthly: float
    cost_note: str | None = None
    effective_relief: float | None = None
    model_prompt: str | None = None


@dataclass(frozen=True)
class ObservationItem:
    id: str
    title: str
    description: str
    severity: str
    category: str
    potential_saving: float | None = None
    action: str | None = None
    savings_breakdown: SavingsBreakdown | None = None


# ── Master output ────────────────────────────────────────────────────────────

@dataclass
class TaxPosition:
    tax_year: str

    # Summary scalars
    total_income: float
    adjusted_net_income: float
    taxable_income: float
    income_tax: float
    national_insurance: float
    dividend_tax: float
    total_tax: float
    effective_rate: float
    marginal_rate: float
    personal_allowance: float
    pa_status: str

    # Flags
    in_pa_taper_zone: bool
    hicbc_applies: bool
    pension_taper_applies: bool

    # Detailed results
    ani_result: ANIResult
    income_tax_result: IncomeTaxResult
    ni_result: NIResult
    hicbc_result: HICBCResult | None
    pension_aa_result: PensionAAResult | None

    # Sources and observations
    income_sources: list[IncomeSource]
    observations: list[ObservationItem] = field(default_factory=list)
