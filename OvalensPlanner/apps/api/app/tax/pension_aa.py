"""Pension Annual Allowance calculator.

Handles standard AA (£60,000), tapered AA for high earners,
Money Purchase AA (£10,000), and 3-year carry forward.
"""

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.types import CarryForwardYear, PensionAAResult

logger = structlog.get_logger(__name__)


def calculate_pension_aa(
    adjusted_income: float,
    threshold_income: float,
    *,
    current_year_contributions: float = 0,
    contributions_by_year: dict[str, float] | None = None,
    mpaa_triggered: bool = False,
    tax_year: str = "2025/26",
) -> PensionAAResult:
    """Calculate available pension annual allowance."""
    c = get_tax_year_constants(tax_year)
    p = c["pension"]

    standard_aa = float(p["annual_allowance"])
    min_aa = float(p["min_tapered_aa"])
    taper_threshold = p["taper_threshold_income"]
    taper_adjusted = p["taper_adjusted_income"]

    # MPAA override
    if mpaa_triggered:
        aa = float(p["money_purchase_aa"])
        logger.info("Pension AA: MPAA triggered", aa=aa)
        return PensionAAResult(
            annual_allowance=aa,
            is_tapered=False,
            carry_forward=[],
            total_available=aa,
            remaining=aa - current_year_contributions,
            current_year_contributions=current_year_contributions,
            mpaa_applies=True,
        )

    # Taper check
    is_tapered = (
        threshold_income > taper_threshold
        and adjusted_income > taper_adjusted
    )

    if is_tapered:
        excess = adjusted_income - taper_adjusted
        reduction = excess / 2
        aa = max(min_aa, standard_aa - reduction)
    else:
        aa = standard_aa

    # Carry forward: walk 3 prior years
    carry_forward: list[CarryForwardYear] = []
    aa_history = p["aa_history"]

    if contributions_by_year:
        for year, year_aa in aa_history.items():
            contribs = contributions_by_year.get(year, 0.0)
            unused = max(0.0, year_aa - contribs)
            carry_forward.append(CarryForwardYear(
                tax_year=year,
                annual_allowance=year_aa,
                contributions=contribs,
                unused=unused,
            ))

    total_carry_forward = sum(cf.unused for cf in carry_forward)
    total_available = aa + total_carry_forward
    remaining = total_available - current_year_contributions

    logger.info(
        "Pension AA calculated",
        aa=aa,
        is_tapered=is_tapered,
        carry_forward_total=total_carry_forward,
        remaining=remaining,
    )

    return PensionAAResult(
        annual_allowance=aa,
        is_tapered=is_tapered,
        carry_forward=carry_forward,
        total_available=total_available,
        remaining=remaining,
        current_year_contributions=current_year_contributions,
        mpaa_applies=False,
    )
