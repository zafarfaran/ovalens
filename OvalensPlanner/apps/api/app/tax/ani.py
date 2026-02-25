"""Adjusted Net Income (ANI) calculator.

ANI = Total Income - Gross pension contributions - Gift Aid (grossed up)
Used to determine: PA tapering, HICBC, pension AA taper.
"""

import math

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.types import ANIResult, PAStatus

logger = structlog.get_logger(__name__)


def calculate_adjusted_net_income(
    total_income: float,
    *,
    pension_contributions: float = 0,
    gift_aid: float = 0,
    tax_year: str = "2025/26",
) -> ANIResult:
    """Calculate Adjusted Net Income and derive Personal Allowance."""
    c = get_tax_year_constants(tax_year)
    it = c["income_tax"]
    taper = c["pa_taper"]

    # Gross up gift aid (net donation / 0.8 = gross)
    gift_aid_gross = gift_aid / 0.8 if gift_aid > 0 else 0.0

    ani = max(0.0, total_income - pension_contributions - gift_aid_gross)

    full_pa = float(it["personal_allowance"])

    # PA taper: PA reduces by £1 for every complete £2 of ANI above £100k.
    # HMRC uses floor division — incomplete £2 increments don't count.
    lost_boundary = taper["threshold"] + (full_pa * 2)  # £125,140

    if ani <= taper["threshold"]:
        pa = full_pa
        status = PAStatus.FULL
        in_taper = False
    elif ani >= lost_boundary:
        pa = 0.0
        status = PAStatus.LOST
        in_taper = False
    else:
        excess = ani - taper["threshold"]
        reduction = float(math.floor(excess / 2))
        pa = max(0.0, full_pa - reduction)
        status = PAStatus.TAPERED
        in_taper = True

    pa_lost = full_pa - pa

    logger.info(
        "ANI calculated",
        total_income=total_income,
        ani=ani,
        pa=pa,
        pa_status=status,
    )

    return ANIResult(
        total_income=total_income,
        pension_contributions=pension_contributions,
        gift_aid_gross=gift_aid_gross,
        adjusted_net_income=ani,
        personal_allowance=pa,
        personal_allowance_lost=pa_lost,
        pa_status=status,
        in_taper_zone=in_taper,
    )
