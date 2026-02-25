"""Personal pension contribution analysis.

Models the income tax savings from making personal pension contributions
(SIPP / relief at source). Calls compute_full_tax_position twice
(current vs proposed) and diffs. Also identifies optimal contribution
thresholds (PA taper, HICBC, higher rate band).

Key difference from salary sacrifice: personal pension contributions
do NOT save National Insurance -- NI is paid on the full gross salary.
"""

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.engine import compute_full_tax_position
from app.tax.rounding import round_currency
from app.tax.types import IncomeSource, TaxPosition

logger = structlog.get_logger(__name__)


def analyse_personal_pension(
    income_sources: list[IncomeSource],
    proposed_contribution: float,
    *,
    current_contribution: float = 0,
    employer_contributions: float = 0,
    gift_aid: float = 0,
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
    pension_contributions_by_year: dict[str, float] | None = None,
) -> tuple[dict, TaxPosition]:
    """Analyse tax savings from personal pension contributions.

    Computes current and proposed tax positions, returns the diff
    plus optimal contribution thresholds.
    """
    common_kwargs = dict(
        income_sources=income_sources,
        employer_contributions=employer_contributions,
        gift_aid=gift_aid,
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
        pension_contributions_by_year=pension_contributions_by_year,
    )

    # -- Current position ------------------------------------------------------
    current = compute_full_tax_position(
        pension_contributions=current_contribution,
        **common_kwargs,
    )

    # -- Proposed position -----------------------------------------------------
    proposed = compute_full_tax_position(
        pension_contributions=proposed_contribution,
        **common_kwargs,
    )

    # -- Compute savings -------------------------------------------------------
    it_saving = round_currency(current.income_tax - proposed.income_tax)

    current_hicbc = current.hicbc_result.hicbc_charge if current.hicbc_result else 0
    proposed_hicbc = proposed.hicbc_result.hicbc_charge if proposed.hicbc_result else 0
    hicbc_avoided = round_currency(current_hicbc - proposed_hicbc)

    total_saving = round_currency(it_saving + hicbc_avoided)
    additional_contribution = proposed_contribution - current_contribution

    effective_relief = (
        round_currency(total_saving / additional_contribution * 100)
        if additional_contribution > 0
        else 0.0
    )

    # -- Net benefit (includes basic rate relief at source) --------------------
    basic_rate_relief = round_currency(additional_contribution * 0.2)
    net_cost_to_client = round_currency(additional_contribution * 0.8)
    higher_rate_relief = it_saving  # IT saving from BRB extension = the SA claim
    total_tax_relief = round_currency(basic_rate_relief + higher_rate_relief + hicbc_avoided)
    net_cost_after_relief = round_currency(net_cost_to_client - higher_rate_relief - hicbc_avoided)
    net_benefit_value = round_currency(additional_contribution - net_cost_after_relief)

    total_effective_relief = (
        round_currency(total_tax_relief / additional_contribution * 100)
        if additional_contribution > 0
        else 0.0
    )

    effective_cost_ppp = (
        round_currency(net_cost_after_relief / additional_contribution)
        if additional_contribution > 0
        else 0.0
    )

    # -- Total benefit (headline summary) --------------------------------------
    pa_restored = round_currency(
        proposed.personal_allowance - current.personal_allowance
    )
    pa_restoration_value = round_currency(pa_restored * 0.40) if pa_restored > 0 else 0.0
    total_annual_benefit = total_tax_relief  # basic + higher + hicbc (already computed)
    client_out_of_pocket = net_cost_after_relief
    monthly_benefit = round_currency(total_annual_benefit / 12) if total_annual_benefit > 0 else 0.0
    monthly_cost = round_currency(client_out_of_pocket / 12) if client_out_of_pocket > 0 else 0.0

    # -- Threshold analysis ----------------------------------------------------
    current_ani = current.adjusted_net_income
    thresholds = _identify_thresholds(
        current_ani=current_ani,
        current_contribution=current_contribution,
        common_kwargs=common_kwargs,
        current_position=current,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )

    # -- Pension AA warning ----------------------------------------------------
    c = get_tax_year_constants("2025/26")
    aa_limit = c["pension"]["annual_allowance"]
    total_pension = proposed_contribution + employer_contributions
    pension_aa_warning = None
    if pension_contributions_by_year:
        from app.tax.pension_aa import calculate_pension_aa
        aa_check = calculate_pension_aa(
            adjusted_income=0, threshold_income=0,
            current_year_contributions=total_pension,
            contributions_by_year=pension_contributions_by_year,
        )
        if aa_check.remaining < 0:
            pension_aa_warning = (
                f"Proposed total contributions (\u00a3{total_pension:,.0f}) exceed available "
                f"allowance including carry forward (\u00a3{aa_check.total_available:,.0f})."
            )
    elif total_pension > aa_limit:
        pension_aa_warning = (
            f"Proposed total pension contributions (\u00a3{total_pension:,.0f}) "
            f"exceed the annual allowance (\u00a3{aa_limit:,.0f}). "
            f"Check carry-forward availability."
        )

    logger.info(
        "Personal pension analysed",
        it_saving=it_saving,
        hicbc_avoided=hicbc_avoided,
        total=total_saving,
        effective_relief=effective_relief,
        thresholds_found=len(thresholds),
    )

    return {
        "current": {
            "pension_contribution": current_contribution,
            "income_tax": current.income_tax,
            "national_insurance": current.national_insurance,
            "hicbc": current_hicbc,
            "total_tax": current.total_tax,
            "personal_allowance": current.personal_allowance,
            "adjusted_net_income": current.adjusted_net_income,
        },
        "proposed": {
            "pension_contribution": proposed_contribution,
            "income_tax": proposed.income_tax,
            "national_insurance": proposed.national_insurance,
            "hicbc": proposed_hicbc,
            "total_tax": proposed.total_tax,
            "personal_allowance": proposed.personal_allowance,
            "adjusted_net_income": proposed.adjusted_net_income,
        },
        "savings": {
            "income_tax": it_saving,
            "hicbc_avoided": hicbc_avoided,
            "total": total_saving,
        },
        "pa_change": {
            "current": current.personal_allowance,
            "proposed": proposed.personal_allowance,
            "restored": round_currency(
                proposed.personal_allowance - current.personal_allowance
            ),
        },
        "effective_relief_rate": effective_relief,
        "thresholds": thresholds,
        "pension_aa_warning": pension_aa_warning,
        "total_effective_relief_rate": total_effective_relief,
        "net_benefit": {
            "gross_contribution": round_currency(additional_contribution),
            "net_cost_to_client": net_cost_to_client,
            "basic_rate_relief": basic_rate_relief,
            "higher_rate_relief": higher_rate_relief,
            "hicbc_avoided": hicbc_avoided,
            "total_tax_relief": total_tax_relief,
            "net_cost_after_relief": net_cost_after_relief,
            "net_benefit": net_benefit_value,
            "effective_cost_per_pound_in_pension": effective_cost_ppp,
        },
        "total_benefit": {
            "basic_rate_relief": basic_rate_relief,
            "higher_rate_relief": higher_rate_relief,
            "hicbc_avoided": hicbc_avoided,
            "pa_restoration_value": pa_restoration_value,
            "total_annual_benefit": total_annual_benefit,
            "into_pension": round_currency(additional_contribution),
            "client_out_of_pocket": client_out_of_pocket,
            "monthly_benefit": monthly_benefit,
            "monthly_cost": monthly_cost,
        },
    }, proposed


def _identify_thresholds(
    *,
    current_ani: float,
    current_contribution: float,
    common_kwargs: dict,
    current_position,
    number_of_children: int,
    claims_child_benefit: bool,
) -> list[dict]:
    """Identify optimal contribution thresholds and compute savings for each."""
    c = get_tax_year_constants("2025/26")
    aa_limit = c["pension"]["annual_allowance"]
    employer_contributions = common_kwargs.get("employer_contributions", 0)

    targets = [
        ("Avoid PA taper (ANI <= 100,000)", c["pa_taper"]["threshold"]),
        ("Drop to basic rate (ANI <= 50,270)", c["income_tax"]["basic_rate_ceiling"]),
    ]

    # Only include HICBC threshold if client has children and claims CB
    if claims_child_benefit and number_of_children > 0:
        targets.append(
            ("Avoid HICBC (ANI <= 60,000)", c["hicbc"]["start_threshold"]),
        )

    current_hicbc = (
        current_position.hicbc_result.hicbc_charge
        if current_position.hicbc_result
        else 0
    )

    thresholds = []
    for name, target_ani in targets:
        contribution_needed = current_ani - target_ani
        if contribution_needed <= current_contribution:
            # Already below this threshold, skip
            continue

        # Run engine at this contribution level
        position_at_threshold = compute_full_tax_position(
            pension_contributions=contribution_needed,
            **common_kwargs,
        )

        hicbc_at_threshold = (
            position_at_threshold.hicbc_result.hicbc_charge
            if position_at_threshold.hicbc_result
            else 0
        )
        it_saving = round_currency(
            current_position.income_tax - position_at_threshold.income_tax
        )
        hicbc_saving = round_currency(current_hicbc - hicbc_at_threshold)
        annual_saving = round_currency(it_saving + hicbc_saving)

        additional = contribution_needed - current_contribution
        relief_rate = (
            round_currency(annual_saving / additional * 100)
            if additional > 0
            else 0.0
        )

        total_pension = contribution_needed + employer_contributions
        feasible = total_pension <= aa_limit

        thresholds.append({
            "name": name,
            "contribution_needed": round_currency(contribution_needed),
            "additional_over_current": round_currency(additional),
            "annual_saving": annual_saving,
            "effective_relief": relief_rate,
            "feasible": feasible,
        })

    # Sort by contribution_needed ascending
    thresholds.sort(key=lambda t: t["contribution_needed"])
    return thresholds
