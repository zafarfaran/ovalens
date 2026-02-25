"""National Insurance contributions calculator.

Handles Class 1 (employees), Class 2 (self-employed flat rate),
and Class 4 (self-employed profits-based) calculations.

NI uses standard rounding (round_currency), NOT HMRC truncation.
"""

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.rounding import round_currency
from app.tax.types import NIClass1Result, NIClass2Result, NIClass4Result

logger = structlog.get_logger(__name__)


def calculate_class_1_ni(
    earnings: float,
    *,
    tax_year: str = "2025/26",
) -> NIClass1Result:
    """Calculate Class 1 employee and employer NICs."""
    c = get_tax_year_constants(tax_year)["ni"]["class_1"]

    pt = c["primary_threshold"]
    uel = c["upper_earnings_limit"]
    main_rate = c["employee_main_rate"]
    upper_rate = c["employee_upper_rate"]
    est = c["employer_secondary_threshold"]
    er_rate = c["employer_rate"]

    # Employee NI
    if earnings <= pt:
        main_ni = 0.0
        upper_ni = 0.0
    elif earnings <= uel:
        main_ni = round_currency((earnings - pt) * main_rate)
        upper_ni = 0.0
    else:
        main_ni = round_currency((uel - pt) * main_rate)
        upper_ni = round_currency((earnings - uel) * upper_rate)

    total_employee = round_currency(main_ni + upper_ni)

    # Employer NI
    if earnings <= est:
        total_employer = 0.0
    else:
        total_employer = round_currency((earnings - est) * er_rate)

    logger.info(
        "Class 1 NI calculated",
        earnings=earnings,
        employee_ni=total_employee,
        employer_ni=total_employer,
    )

    return NIClass1Result(
        earnings=earnings,
        primary_threshold=pt,
        upper_earnings_limit=uel,
        employee_main_rate=main_rate,
        employee_upper_rate=upper_rate,
        main_ni=main_ni,
        upper_ni=upper_ni,
        total_employee_ni=total_employee,
        employer_secondary_threshold=est,
        employer_rate=er_rate,
        total_employer_ni=total_employer,
    )


def calculate_class_2_ni(
    profits: float,
    *,
    tax_year: str = "2025/26",
) -> NIClass2Result:
    """Calculate Class 2 self-employed NI (flat weekly rate)."""
    c = get_tax_year_constants(tax_year)["ni"]["class_2"]

    threshold = c["profit_threshold"]
    weekly_rate = c["weekly_rate"]
    weeks = c["weeks"]

    qualifies = profits >= threshold
    annual_ni = round_currency(weeks * weekly_rate) if qualifies else 0.0

    return NIClass2Result(
        profits=profits,
        qualifies=qualifies,
        weekly_rate=weekly_rate,
        weeks=weeks,
        annual_ni=annual_ni,
    )


def calculate_class_4_ni(
    profits: float,
    *,
    tax_year: str = "2025/26",
) -> NIClass4Result:
    """Calculate Class 4 self-employed NI (profits-based)."""
    c = get_tax_year_constants(tax_year)["ni"]["class_4"]

    lpl = c["lower_profit_limit"]
    upl = c["upper_profit_limit"]
    main_rate = c["main_rate"]
    upper_rate = c["upper_rate"]

    if profits <= lpl:
        main_ni = 0.0
        upper_ni = 0.0
    elif profits <= upl:
        main_ni = round_currency((profits - lpl) * main_rate)
        upper_ni = 0.0
    else:
        main_ni = round_currency((upl - lpl) * main_rate)
        upper_ni = round_currency((profits - upl) * upper_rate)

    total = round_currency(main_ni + upper_ni)

    logger.info("Class 4 NI calculated", profits=profits, total_ni=total)

    return NIClass4Result(
        profits=profits,
        lower_profit_limit=lpl,
        upper_profit_limit=upl,
        main_rate=main_rate,
        upper_rate=upper_rate,
        main_ni=main_ni,
        upper_ni=upper_ni,
        total_ni=total,
    )
