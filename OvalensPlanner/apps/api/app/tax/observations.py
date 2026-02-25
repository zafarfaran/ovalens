"""Observations detector.

Threshold-based rules that inspect engine output and generate
alerts, warnings, and optimisation opportunities.
"""

from app.tax.types import (
    ANIResult,
    HICBCResult,
    IncomeTaxResult,
    NIResult,
    ObservationItem,
    PAStatus,
    PensionAAResult,
    SavingsBreakdown,
    SavingsBreakdownItem,
    TaxImpactItem,
)


def detect_observations(
    ani: ANIResult,
    income_tax: IncomeTaxResult,
    ni: NIResult,
    hicbc: HICBCResult | None,
    pension_aa: PensionAAResult | None,
    *,
    total_income: float,
    pension_contributions: float = 0,
    gift_aid: float = 0,
    has_dividends: bool = False,
    is_director_or_self_employed: bool = False,
    cgt_gains: float = 0,
) -> list[ObservationItem]:
    """Detect tax observations from engine results."""
    obs: list[ObservationItem] = []

    # PA taper zone
    if ani.pa_status == PAStatus.TAPERED:
        excess = ani.adjusted_net_income - 100_000
        pa_saving = ani.personal_allowance_lost * 0.40
        ni_saving = excess * 0.02 if excess > 0 else 0
        total_annual = pa_saving + ni_saving
        obs.append(ObservationItem(
            id="pa-taper-zone",
            title="Personal Allowance Taper Zone",
            description=(
                f"Your ANI of £{ani.adjusted_net_income:,.0f} is in the PA taper zone "
                f"(£100,000–£125,140). You're losing £{ani.personal_allowance_lost:,.0f} "
                f"of your Personal Allowance, creating an effective 60% marginal rate."
            ),
            severity="warning",
            category="income_tax",
            potential_saving=total_annual,
            action=(
                f"Consider increasing pension contributions by £{excess:,.0f} "
                f"to reduce ANI below £100,000 and restore full PA."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Adjusted Net Income", f"£{ani.adjusted_net_income:,.0f}"),
                    SavingsBreakdownItem("Personal Allowance", f"£{ani.personal_allowance:,.0f} (tapered)"),
                    SavingsBreakdownItem("PA lost", f"£{ani.personal_allowance_lost:,.0f}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Increase pension by", f"£{excess:,.0f}"),
                    SavingsBreakdownItem("ANI drops to", "£100,000"),
                    SavingsBreakdownItem("PA restored", "£12,570 (full)"),
                ],
                tax_impact=[
                    TaxImpactItem("Income tax saved (60% band)", pa_saving, pa_saving / 12),
                    TaxImpactItem("NI saved", ni_saving, ni_saving / 12),
                ],
                total_annual=total_annual,
                total_monthly=total_annual / 12,
                cost_note=f"Net take-home reduces but pension pot grows by £{excess:,.0f} more.",
                model_prompt=f"Model salary sacrifice increase of £{excess:,.0f} to restore my personal allowance",
            ),
        ))

    # PA fully lost
    if ani.pa_status == PAStatus.LOST:
        excess_over_restore = ani.adjusted_net_income - 125_140
        pa_saving = 12_570 * 0.40
        obs.append(ObservationItem(
            id="pa-lost",
            title="Personal Allowance Fully Lost",
            description=(
                f"Your ANI of £{ani.adjusted_net_income:,.0f} exceeds £125,140. "
                f"Your entire £12,570 Personal Allowance has been lost."
            ),
            severity="warning",
            category="income_tax",
            potential_saving=pa_saving,
            action=(
                f"Increase pension contributions by £{excess_over_restore:,.0f} "
                f"to reduce ANI to £125,140 and begin restoring PA."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Adjusted Net Income", f"£{ani.adjusted_net_income:,.0f}"),
                    SavingsBreakdownItem("Personal Allowance", "£0 (fully lost)"),
                    SavingsBreakdownItem("Excess above £125,140", f"£{excess_over_restore:,.0f}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Increase pension by", f"£{excess_over_restore:,.0f}"),
                    SavingsBreakdownItem("ANI drops to", "£125,140"),
                    SavingsBreakdownItem("PA restoration begins", "Up to £12,570"),
                ],
                tax_impact=[
                    TaxImpactItem("Income tax saved (PA restoration)", pa_saving, pa_saving / 12),
                ],
                total_annual=pa_saving,
                total_monthly=pa_saving / 12,
                cost_note=f"Sacrifice £{excess_over_restore:,.0f} more to start restoring PA. Full restoration requires ANI ≤ £100,000.",
                model_prompt=f"Model salary sacrifice increase of £{excess_over_restore:,.0f} to restore my personal allowance",
            ),
        ))

    # HICBC
    if hicbc and hicbc.applies:
        obs.append(ObservationItem(
            id="hicbc-applies",
            title="High Income Child Benefit Charge",
            description=(
                f"HICBC applies at {hicbc.clawback_percentage:.0f}% clawback. "
                f"Charge of £{hicbc.hicbc_charge:,.2f} against "
                f"£{hicbc.child_benefit_annual:,.2f} annual benefit."
            ),
            severity="warning",
            category="child_benefit",
            potential_saving=hicbc.hicbc_charge,
            action=(
                "Salary sacrifice could reduce ANI below £60,000 threshold "
                "and eliminate the HICBC charge."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Adjusted Net Income", f"£{ani.adjusted_net_income:,.0f}"),
                    SavingsBreakdownItem("Child Benefit annual", f"£{hicbc.child_benefit_annual:,.2f}"),
                    SavingsBreakdownItem("Clawback", f"{hicbc.clawback_percentage:.0f}%"),
                    SavingsBreakdownItem("HICBC charge", f"£{hicbc.hicbc_charge:,.2f}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Reduce ANI below", "£60,000"),
                    SavingsBreakdownItem("HICBC charge becomes", "£0"),
                    SavingsBreakdownItem("Benefit retained", f"£{hicbc.child_benefit_annual:,.2f}/yr"),
                ],
                tax_impact=[
                    TaxImpactItem("HICBC charge avoided", hicbc.hicbc_charge, hicbc.hicbc_charge / 12),
                ],
                total_annual=hicbc.hicbc_charge,
                total_monthly=hicbc.hicbc_charge / 12,
                cost_note="Reduce ANI via pension sacrifice or other deductions to eliminate the charge entirely.",
                model_prompt="Model salary sacrifice to reduce ANI below £60,000 to avoid HICBC",
            ),
        ))

    # Pension headroom
    if pension_aa and pension_aa.remaining > 0:
        marginal_rate = _estimate_marginal_rate(ani, income_tax)
        potential = pension_aa.remaining * marginal_rate
        obs.append(ObservationItem(
            id="pension-headroom",
            title="Pension Contribution Headroom",
            description=(
                f"You have £{pension_aa.remaining:,.0f} of unused pension annual "
                f"allowance (including carry forward)."
            ),
            severity="opportunity",
            category="pension",
            potential_saving=potential if potential > 0 else None,
            action=(
                f"Additional pension contributions could save up to "
                f"£{potential:,.0f} in tax at your {marginal_rate:.0%} marginal rate."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Pension AA remaining", f"£{pension_aa.remaining:,.0f}"),
                    SavingsBreakdownItem("Current contributions", f"£{pension_contributions:,.0f}"),
                    SavingsBreakdownItem("Marginal tax rate", f"{marginal_rate:.0%}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Max additional contribution", f"£{pension_aa.remaining:,.0f}"),
                    SavingsBreakdownItem("Tax relief at marginal rate", f"{marginal_rate:.0%}"),
                ],
                tax_impact=[
                    TaxImpactItem("Tax relief on contributions", potential, potential / 12),
                ],
                total_annual=potential,
                total_monthly=potential / 12,
                model_prompt=f"Model increasing pension contributions by £{pension_aa.remaining:,.0f}",
            ) if potential > 0 else None,
        ))

    # Approaching AA limit
    if pension_aa and pension_aa.remaining < 10_000 and pension_contributions > 0:
        obs.append(ObservationItem(
            id="pension-aa-limit",
            title="Approaching Pension Annual Allowance Limit",
            description=(
                f"Only £{pension_aa.remaining:,.0f} remaining of your "
                f"£{pension_aa.total_available:,.0f} total available allowance. "
                f"Exceeding this triggers a tax charge."
            ),
            severity="warning",
            category="pension",
        ))

    # ISA reminder (always an opportunity if income exists)
    if total_income > 0:
        obs.append(ObservationItem(
            id="isa-allowance",
            title="ISA Allowance Available",
            description="You can shelter up to £20,000 in an ISA this tax year.",
            severity="info",
            category="savings",
        ))

    # Marriage Allowance eligibility
    if total_income > 0 and total_income <= 12_570:
        obs.append(ObservationItem(
            id="marriage-allowance",
            title="Marriage Allowance Eligibility",
            description=(
                f"With income of £{total_income:,.0f} (below the Personal Allowance), "
                f"you may be able to transfer £1,260 of unused allowance to a spouse "
                f"or civil partner, saving them up to £252 per year."
            ),
            severity="opportunity",
            category="income_tax",
            potential_saving=252,
            action="Check if your spouse/partner is a basic rate taxpayer to claim Marriage Allowance.",
        ))

    # Savings Allowance tracking
    marginal = _estimate_marginal_rate(ani, income_tax)
    psa_limit = 1_000 if marginal <= 0.20 else (500 if marginal <= 0.40 else 0)
    savings_income = sum(
        b.income_in_band for b in income_tax.savings_bands
    ) if income_tax.savings_bands else 0
    if psa_limit > 0 and savings_income > 0:
        psa_used = min(savings_income, psa_limit)
        psa_remaining = psa_limit - psa_used
        obs.append(ObservationItem(
            id="savings-allowance",
            title="Personal Savings Allowance",
            description=(
                f"Your PSA is £{psa_limit:,} at your tax band. "
                f"£{psa_used:,.0f} used, £{psa_remaining:,.0f} remaining."
            ),
            severity="info",
            category="savings",
        ))

    # Dividend vs Salary flag for directors/self-employed
    if is_director_or_self_employed and has_dividends and total_income > 50_000:
        obs.append(ObservationItem(
            id="dividend-salary-split",
            title="Dividend vs Salary Optimisation",
            description=(
                "As a director/self-employed person with dividends, there may be "
                "opportunities to optimise the split between salary and dividends "
                "to reduce your overall tax and NI liability."
            ),
            severity="opportunity",
            category="income_tax",
            action="Review the salary/dividend mix with your adviser for potential NI savings.",
        ))

    # Gift Aid higher-rate relief
    if gift_aid > 0 and marginal > 0.20:
        extra_relief = gift_aid * 0.25 * (marginal - 0.20)
        obs.append(ObservationItem(
            id="gift-aid-relief",
            title="Gift Aid Higher-Rate Relief",
            description=(
                f"As a {marginal:.0%} rate taxpayer, your £{gift_aid:,.0f} Gift Aid donations "
                f"qualify for additional tax relief of £{extra_relief:,.0f} via your Self Assessment."
            ),
            severity="opportunity",
            category="income_tax",
            potential_saving=extra_relief,
            action="Claim the additional relief on your Self Assessment tax return.",
        ))

    # CGT Annual Exemption reminder
    if cgt_gains > 0:
        aea = 3_000
        if cgt_gains > aea:
            obs.append(ObservationItem(
                id="cgt-aea-exceeded",
                title="CGT Annual Exemption Exceeded",
                description=(
                    f"Your capital gains of £{cgt_gains:,.0f} exceed the £{aea:,} annual exemption. "
                    f"£{cgt_gains - aea:,.0f} is subject to Capital Gains Tax."
                ),
                severity="warning",
                category="capital_gains",
                action="Consider spreading disposals across tax years or using losses to offset gains.",
            ))
        else:
            aea_remaining = aea - cgt_gains
            obs.append(ObservationItem(
                id="cgt-aea-usage",
                title="CGT Annual Exemption Usage",
                description=(
                    f"You have used £{cgt_gains:,.0f} of your £{aea:,} CGT annual exemption. "
                    f"£{aea_remaining:,.0f} remaining this tax year."
                ),
                severity="info",
                category="capital_gains",
            ))

    return obs


def _estimate_marginal_rate(ani: ANIResult, income_tax: IncomeTaxResult) -> float:
    """Estimate marginal tax rate from the highest non-empty band."""
    # Check non-savings bands (most common)
    if income_tax.non_savings_bands:
        highest = income_tax.non_savings_bands[-1]
        rate = highest.rate
        # In PA taper zone, effective rate is higher
        if ani.in_taper_zone:
            return 0.60
        return rate
    return 0.20  # default to basic rate
