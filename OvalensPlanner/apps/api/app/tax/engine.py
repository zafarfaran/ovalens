"""Tax engine orchestrator.

Single entry point: compute_full_tax_position(). Calls all calculators
in the correct order and returns a complete TaxPosition.
"""

import structlog

from app.tax.ani import calculate_adjusted_net_income
from app.tax.hicbc import calculate_hicbc
from app.tax.income_tax import calculate_income_tax
from app.tax.national_insurance import (
    calculate_class_1_ni,
    calculate_class_2_ni,
    calculate_class_4_ni,
)
from app.tax.observations import detect_observations
from app.tax.pension_aa import calculate_pension_aa
from app.tax.rounding import round_currency
from app.tax.types import (
    HICBCResult,
    IncomeSource,
    IncomeType,
    NIResult,
    NON_SAVINGS_TYPES,
    PensionAAResult,
    TaxPosition,
)

logger = structlog.get_logger(__name__)


def compute_full_tax_position(
    income_sources: list[IncomeSource],
    *,
    pension_contributions: float = 0,
    employer_contributions: float = 0,
    gift_aid: float = 0,
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
    pension_contributions_by_year: dict[str, float] | None = None,
    mpaa_triggered: bool = False,
    tax_year: str = "2025/26",
    cgt_gains: float = 0,
) -> TaxPosition:
    """Compute a complete, deterministic tax position.

    pension_contributions: personal contributions (relief at source / SIPP).
        These reduce ANI and extend the basic rate band.
    employer_contributions: employer contributions (including salary sacrifice).
        These do NOT reduce ANI or extend BRB (salary already reduced),
        but DO count toward pension annual allowance.
    """

    is_scottish = region.lower() == "scotland"

    # ── 1. Categorise income ─────────────────────────────────────────────
    non_savings = sum(
        s.net_amount for s in income_sources if s.source_type in NON_SAVINGS_TYPES
    )
    savings = sum(
        s.net_amount for s in income_sources if s.source_type == IncomeType.SAVINGS
    )
    dividends = sum(
        s.net_amount for s in income_sources if s.source_type == IncomeType.DIVIDENDS
    )
    total_income = non_savings + savings + dividends

    # Identify employment vs self-employment for NI
    employment_income = sum(
        s.net_amount for s in income_sources if s.source_type == IncomeType.EMPLOYMENT
    )
    se_income = sum(
        s.net_amount for s in income_sources if s.source_type == IncomeType.SELF_EMPLOYMENT
    )

    # ── 2. ANI ───────────────────────────────────────────────────────────
    # Only personal pension contributions reduce ANI (not employer/sacrifice)
    ani_result = calculate_adjusted_net_income(
        total_income,
        pension_contributions=pension_contributions,
        gift_aid=gift_aid,
        tax_year=tax_year,
    )

    # ── 3. Income Tax ────────────────────────────────────────────────────
    # Personal pension contributions extend BRB (like Gift Aid)
    it_result = calculate_income_tax(
        non_savings_income=non_savings,
        savings_income=savings,
        dividend_income=dividends,
        personal_allowance=ani_result.personal_allowance,
        is_scottish=is_scottish,
        gift_aid=gift_aid,
        pension_contributions=pension_contributions,
        tax_year=tax_year,
    )

    # ── 4. National Insurance ────────────────────────────────────────────
    class_1 = None
    class_2 = None
    class_4 = None

    if employment_income > 0:
        class_1 = calculate_class_1_ni(employment_income, tax_year=tax_year)

    if se_income > 0:
        class_2 = calculate_class_2_ni(se_income, tax_year=tax_year)
        class_4 = calculate_class_4_ni(se_income, tax_year=tax_year)

    total_ni = sum(filter(None, [
        class_1.total_employee_ni if class_1 else None,
        class_2.annual_ni if class_2 else None,
        class_4.total_ni if class_4 else None,
    ]))
    ni_result = NIResult(
        class_1=class_1,
        class_2=class_2,
        class_4=class_4,
        total_ni=round_currency(total_ni),
    )

    # ── 5. HICBC ─────────────────────────────────────────────────────────
    hicbc_result: HICBCResult | None = None
    if claims_child_benefit and number_of_children > 0:
        hicbc_result = calculate_hicbc(
            ani_result.adjusted_net_income,
            number_of_children=number_of_children,
            tax_year=tax_year,
        )

    # ── 6. Pension AA ────────────────────────────────────────────────────
    # Both personal and employer contributions count toward the AA.
    # For the taper test:
    #   threshold_income = total_income - personal_contributions
    #   adjusted_income  = threshold_income + personal_contributions + employer_contributions
    #                    = total_income + employer_contributions
    total_pension = pension_contributions + employer_contributions
    pension_aa_result: PensionAAResult | None = None
    if total_pension > 0:
        pension_aa_result = calculate_pension_aa(
            adjusted_income=total_income + employer_contributions,
            threshold_income=total_income - pension_contributions,
            current_year_contributions=total_pension,
            contributions_by_year=pension_contributions_by_year,
            mpaa_triggered=mpaa_triggered,
            tax_year=tax_year,
        )

    # ── 7. Observations ──────────────────────────────────────────────────
    observations = detect_observations(
        ani_result, it_result, ni_result, hicbc_result, pension_aa_result,
        total_income=total_income,
        pension_contributions=total_pension,
        gift_aid=gift_aid,
        has_dividends=any(s.source_type == IncomeType.DIVIDENDS for s in income_sources),
        is_director_or_self_employed=any(
            s.source_type == IncomeType.SELF_EMPLOYMENT for s in income_sources
        ),
        cgt_gains=cgt_gains,
    )

    # ── 8. Summary ───────────────────────────────────────────────────────
    hicbc_charge = hicbc_result.hicbc_charge if hicbc_result else 0.0
    total_tax = round_currency(
        it_result.total_income_tax + ni_result.total_ni + hicbc_charge
    )
    effective_rate = round_currency(
        (total_tax / total_income * 100) if total_income > 0 else 0.0
    )
    marginal_rate = _compute_marginal_rate(ani_result, it_result, ni_result)

    logger.info(
        "Full tax position computed",
        total_income=total_income,
        total_tax=total_tax,
        effective_rate=effective_rate,
    )

    return TaxPosition(
        tax_year=tax_year,
        total_income=total_income,
        adjusted_net_income=ani_result.adjusted_net_income,
        taxable_income=it_result.taxable_income,
        income_tax=it_result.total_income_tax,
        national_insurance=ni_result.total_ni,
        dividend_tax=it_result.dividend_tax,
        total_tax=total_tax,
        effective_rate=effective_rate,
        marginal_rate=marginal_rate,
        personal_allowance=ani_result.personal_allowance,
        pa_status=str(ani_result.pa_status),
        in_pa_taper_zone=ani_result.in_taper_zone,
        hicbc_applies=hicbc_result.applies if hicbc_result else False,
        pension_taper_applies=pension_aa_result.is_tapered if pension_aa_result else False,
        ani_result=ani_result,
        income_tax_result=it_result,
        ni_result=ni_result,
        hicbc_result=hicbc_result,
        pension_aa_result=pension_aa_result,
        income_sources=income_sources,
        observations=observations,
    )


def _compute_marginal_rate(
    ani_result,
    it_result,
    ni_result,
) -> float:
    """Compute marginal rate, special-casing the 60% trap.

    The 60% trap (£100k-£125,140) is 40% higher rate + 20% effective
    PA loss.  NI is added on top: employees above UEL pay 2% NI → 62%;
    self-employed pay 2% Class 4 → 62%.
    """
    ani = ani_result.adjusted_net_income

    # Determine employee NI marginal rate (used in all cases)
    ni_marginal = 0.0
    if ni_result.class_1:
        if ni_result.class_1.earnings <= ni_result.class_1.upper_earnings_limit:
            ni_marginal = ni_result.class_1.employee_main_rate
        else:
            ni_marginal = ni_result.class_1.employee_upper_rate
    elif ni_result.class_4:
        if ni_result.class_4.profits <= ni_result.class_4.upper_profit_limit:
            ni_marginal = ni_result.class_4.main_rate
        else:
            ni_marginal = ni_result.class_4.upper_rate

    # 60% trap: 40% tax + 20% effective PA loss + NI
    if 100_000 < ani < 125_140:
        return round_currency((0.60 + ni_marginal) * 100)

    # Otherwise: highest income tax band rate + NI rate
    it_marginal = 0.20  # default basic
    if it_result.non_savings_bands:
        it_marginal = it_result.non_savings_bands[-1].rate

    return round_currency((it_marginal + ni_marginal) * 100)
