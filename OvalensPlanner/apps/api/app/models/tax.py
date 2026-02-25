"""Tax calculation models."""

from pydantic import BaseModel


class TaxBand(BaseModel):
    name: str
    lower_limit: float
    upper_limit: float | None
    rate: float


class IncomeSummary(BaseModel):
    employment: float = 0
    self_employment: float = 0
    pension: float = 0
    rental: float = 0
    savings: float = 0
    dividends: float = 0
    other: float = 0

    @property
    def total_income(self) -> float:
        return (
            self.employment
            + self.self_employment
            + self.pension
            + self.rental
            + self.savings
            + self.dividends
            + self.other
        )


class TaxCalculation(BaseModel):
    taxable_income: float
    income_tax: float
    national_insurance: float
    total_tax: float
    effective_rate: float
    marginal_rate: float
    bands: list[TaxBand] = []


class AdjustedNetIncome(BaseModel):
    total_income: float
    pension_contributions: float = 0
    gift_aid: float = 0
    adjusted_net_income: float = 0
