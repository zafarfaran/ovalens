"""High Income Child Benefit Charge (HICBC) calculator.

HICBC applies when ANI exceeds £60,000. The charge equals
1% of child benefit for every £200 of income over £60,000,
reaching 100% at £80,000.
"""

import math

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.rounding import round_currency
from app.tax.types import HICBCResult

logger = structlog.get_logger(__name__)


def _compute_child_benefit(number_of_children: int, constants: dict) -> float:
    """Compute annual child benefit from weekly rates."""
    if number_of_children <= 0:
        return 0.0
    hicbc = constants["hicbc"]
    weekly = hicbc["child_benefit_weekly_first"]
    if number_of_children > 1:
        weekly += (number_of_children - 1) * hicbc["child_benefit_weekly_additional"]
    return round_currency(weekly * 52)


def calculate_hicbc(
    adjusted_net_income: float,
    *,
    annual_child_benefit: float = 0,
    number_of_children: int = 0,
    tax_year: str = "2025/26",
) -> HICBCResult:
    """Calculate High Income Child Benefit Charge."""
    c = get_tax_year_constants(tax_year)
    hicbc = c["hicbc"]

    # Determine annual benefit
    if annual_child_benefit > 0:
        benefit = annual_child_benefit
    elif number_of_children > 0:
        benefit = _compute_child_benefit(number_of_children, c)
    else:
        benefit = 0.0

    # No children / no benefit → not applicable
    if benefit <= 0:
        return HICBCResult(
            applies=False,
            child_benefit_annual=0.0,
            clawback_percentage=0.0,
            hicbc_charge=0.0,
            net_benefit=0.0,
        )

    start = hicbc["start_threshold"]
    full = hicbc["full_clawback_threshold"]

    if adjusted_net_income <= start:
        clawback_pct = 0.0
    else:
        # 1% for every complete £200 over threshold (HMRC floors to whole %)
        clawback_pct = min(100.0, float(math.floor((adjusted_net_income - start) / 200.0)))

    charge = round_currency(benefit * clawback_pct / 100.0)
    net = round_currency(benefit - charge)

    applies = clawback_pct > 0

    logger.info(
        "HICBC calculated",
        ani=adjusted_net_income,
        clawback_pct=clawback_pct,
        charge=charge,
    )

    return HICBCResult(
        applies=applies,
        child_benefit_annual=benefit,
        clawback_percentage=clawback_pct,
        hicbc_charge=charge,
        net_benefit=net,
    )
