"""Master dashboard schema."""

from pydantic import BaseModel

from app.models.allowances import AllowancesTracker
from app.models.client import ClientInfo
from app.models.observations import Observation
from app.models.scenarios import Scenario
from app.models.tax import AdjustedNetIncome, IncomeSummary, TaxCalculation


class RelevantTaxData(BaseModel):
    """Master response schema sent to the frontend."""

    client: ClientInfo
    income: IncomeSummary
    tax: TaxCalculation
    adjusted_net_income: AdjustedNetIncome
    allowances: AllowancesTracker
    observations: list[Observation] = []
    scenarios: list[Scenario] = []
