"""Tax engine tool executors — bridge Claude tool calls to the deterministic engine."""

from app.core.logging import get_logger
from app.tax.engine import compute_full_tax_position
from app.tax.salary_sacrifice import analyse_salary_sacrifice
from app.tax.personal_pension import analyse_personal_pension
from app.tax.types import IncomeSource, IncomeType, TaxPosition

logger = get_logger(__name__)


async def execute_compute_tax_position(
    tool_input: dict, *, context: dict | None = None
) -> dict:
    """Execute compute_tax_position tool — runs the deterministic engine."""
    try:
        logger.info(
            "Tax engine tool_input received from LLM",
            tool_input=tool_input,
        )

        raw_sources = tool_input.get("income_sources", [])
        income_sources = [
            IncomeSource(
                source_type=IncomeType(s["source_type"]),
                gross_amount=float(s["gross_amount"]),
                label=s.get("label", ""),
                expenses=float(s.get("expenses", 0)),
            )
            for s in raw_sources
        ]

        pension_contrib = float(tool_input.get("pension_contributions", 0))
        employer_contrib = float(tool_input.get("employer_contributions", 0))
        gift_aid_val = float(tool_input.get("gift_aid", 0))

        if pension_contrib > 0 or employer_contrib > 0 or gift_aid_val > 0:
            logger.warning(
                "BRB-extending inputs passed to engine",
                pension_contributions=pension_contrib,
                employer_contributions=employer_contrib,
                gift_aid=gift_aid_val,
            )

        contributions_by_year = tool_input.get("pension_contributions_by_year")
        if not contributions_by_year and context:
            contributions_by_year = context.get("pension_contributions_by_year")

        position = compute_full_tax_position(
            income_sources=income_sources,
            pension_contributions=pension_contrib,
            employer_contributions=employer_contrib,
            gift_aid=gift_aid_val,
            region=tool_input.get("region", "england"),
            number_of_children=int(tool_input.get("number_of_children", 0)),
            claims_child_benefit=bool(tool_input.get("claims_child_benefit", False)),
            pension_contributions_by_year=contributions_by_year,
            mpaa_triggered=bool(tool_input.get("mpaa_triggered", False)),
            tax_year=tool_input.get("tax_year", "2025/26"),
        )

        dashboard = _position_to_dashboard(position)

        logger.info(
            "Tax engine computed",
            total_income=position.total_income,
            total_tax=position.total_tax,
        )

        return {
            "success": True,
            "taxPosition": _position_to_summary(position),
            "dashboardData": dashboard,
        }

    except Exception as e:
        logger.exception("Tax engine error")
        return {"success": False, "error": str(e)}


async def execute_model_salary_sacrifice(
    tool_input: dict, *, context: dict | None = None
) -> dict:
    """Execute model_salary_sacrifice tool."""
    try:
        # Parse other income sources if provided
        other_sources = None
        raw_other = tool_input.get("other_income_sources", [])
        if raw_other:
            other_sources = [
                IncomeSource(
                    source_type=IncomeType(s["source_type"]),
                    gross_amount=float(s["gross_amount"]),
                    label=s.get("label", ""),
                )
                for s in raw_other
            ]

        contributions_by_year = None
        if context:
            contributions_by_year = context.get("pension_contributions_by_year")

        result, proposed_pos = analyse_salary_sacrifice(
            gross_salary=float(tool_input["gross_salary"]),
            sacrifice_amount=float(tool_input["sacrifice_amount"]),
            current_sacrifice=float(tool_input.get("current_sacrifice", 0)),
            other_income_sources=other_sources,
            region=tool_input.get("region", "england"),
            number_of_children=int(tool_input.get("number_of_children", 0)),
            claims_child_benefit=bool(tool_input.get("claims_child_benefit", False)),
            pension_contributions_by_year=contributions_by_year,
        )

        logger.info(
            "Salary sacrifice modelled",
            total_saving=result["savings"]["total"],
        )

        return {
            "success": True,
            **result,
        }

    except Exception as e:
        logger.exception("Salary sacrifice error")
        return {"success": False, "error": str(e)}


async def execute_model_personal_pension(
    tool_input: dict, *, context: dict | None = None
) -> dict:
    """Execute model_personal_pension tool."""
    try:
        raw_sources = tool_input.get("income_sources", [])
        income_sources = [
            IncomeSource(
                source_type=IncomeType(s["source_type"]),
                gross_amount=float(s["gross_amount"]),
                label=s.get("label", ""),
            )
            for s in raw_sources
        ]

        contributions_by_year = None
        if context:
            contributions_by_year = context.get("pension_contributions_by_year")

        result, proposed_pos = analyse_personal_pension(
            income_sources=income_sources,
            proposed_contribution=float(tool_input["proposed_contribution"]),
            current_contribution=float(tool_input.get("current_contribution", 0)),
            employer_contributions=float(tool_input.get("employer_contributions", 0)),
            gift_aid=float(tool_input.get("gift_aid", 0)),
            region=tool_input.get("region", "england"),
            number_of_children=int(tool_input.get("number_of_children", 0)),
            claims_child_benefit=bool(tool_input.get("claims_child_benefit", False)),
            pension_contributions_by_year=contributions_by_year,
        )

        logger.info(
            "Personal pension modelled",
            total_saving=result["savings"]["total"],
        )

        return {
            "success": True,
            **result,
        }

    except Exception as e:
        logger.exception("Personal pension error")
        return {"success": False, "error": str(e)}


def _position_to_summary(pos: TaxPosition) -> dict:
    """Flat summary of the TaxPosition for Claude's context."""
    return {
        "tax_year": pos.tax_year,
        "total_income": pos.total_income,
        "adjusted_net_income": pos.adjusted_net_income,
        "taxable_income": pos.taxable_income,
        "income_tax": pos.income_tax,
        "national_insurance": pos.national_insurance,
        "dividend_tax": pos.dividend_tax,
        "total_tax": pos.total_tax,
        "effective_rate": pos.effective_rate,
        "marginal_rate": pos.marginal_rate,
        "personal_allowance": pos.personal_allowance,
        "pa_status": pos.pa_status,
        "hicbc_applies": pos.hicbc_applies,
        "hicbc_charge": pos.hicbc_result.hicbc_charge if pos.hicbc_result else 0,
    }


def _position_to_dashboard(pos: TaxPosition) -> dict:
    """Map TaxPosition → RelevantTaxData shape the frontend expects (camelCase)."""
    # Income summary
    income_summary = {
        "totalIncome": pos.total_income,
        "sources": [
            {
                "type": s.source_type.value,
                "label": s.label or s.source_type.value.replace("_", " ").title(),
                "amount": s.net_amount,
            }
            for s in pos.income_sources
        ],
    }

    # Tax calculation with bands
    it = pos.income_tax_result
    income_tax_by_band = [
        {
            "band": b.name,
            "amount": b.income_in_band,
            "rate": b.rate,
            "tax": b.tax,
        }
        for b in it.non_savings_bands
    ]
    # Add savings bands
    for b in it.savings_bands:
        income_tax_by_band.append({
            "band": f"Savings - {b.name}",
            "amount": b.income_in_band,
            "rate": b.rate,
            "tax": b.tax,
        })
    # Add dividend bands
    for b in it.dividend_bands:
        income_tax_by_band.append({
            "band": f"Dividends - {b.name}",
            "amount": b.income_in_band,
            "rate": b.rate,
            "tax": b.tax,
        })

    tax_calculation = {
        "totalIncomeTax": it.total_income_tax,
        "totalTax": pos.total_tax,
        "effectiveRate": pos.effective_rate,
        "marginalRate": pos.marginal_rate,
        "incomeTaxByBand": income_tax_by_band,
    }

    # National Insurance
    ni = pos.ni_result
    national_insurance = {
        "class1": ni.class_1.total_employee_ni if ni.class_1 else 0,
        "class2": ni.class_2.annual_ni if ni.class_2 else 0,
        "class4": ni.class_4.total_ni if ni.class_4 else 0,
    }

    # Adjusted Net Income
    adjusted_net_income = {
        "amount": pos.adjusted_net_income,
        "personalAllowanceStatus": pos.pa_status.title(),
    }

    # Allowances tracker
    allowances = [
        {
            "name": "Personal Allowance",
            "annualLimit": 12_570,
            "used": 12_570 - pos.personal_allowance,
            "remaining": pos.personal_allowance,
            "status": _allowance_status(pos.personal_allowance, 12_570),
        },
        {
            "name": "ISA Allowance",
            "annualLimit": 20_000,
            "used": 0,
            "remaining": 20_000,
            "status": "GREEN",
        },
    ]

    # Pension allowance
    if pos.pension_aa_result:
        pa_res = pos.pension_aa_result
        used = pa_res.current_year_contributions
        remaining = max(0, pa_res.total_available - used)
        pension_entry: dict = {
            "name": "Pension Annual Allowance",
            "annualLimit": pa_res.annual_allowance,
            "used": used,
            "remaining": remaining,
            "status": _allowance_status(remaining, pa_res.total_available),
            "totalAvailable": pa_res.total_available,
        }
        if pa_res.carry_forward:
            pension_entry["carryForward"] = [
                {
                    "taxYear": cf.tax_year,
                    "allowance": cf.annual_allowance,
                    "used": cf.contributions,
                    "unused": cf.unused,
                }
                for cf in pa_res.carry_forward
            ]
            pension_entry["totalCarryForward"] = sum(cf.unused for cf in pa_res.carry_forward)
        allowances.append(pension_entry)

    # Dividend allowance
    allowances.append({
        "name": "Dividend Allowance",
        "annualLimit": 500,
        "used": it.dividend_allowance_used,
        "remaining": 500 - it.dividend_allowance_used,
        "status": _allowance_status(500 - it.dividend_allowance_used, 500),
    })

    # CGT allowance
    allowances.append({
        "name": "CGT Annual Exempt Amount",
        "annualLimit": 3_000,
        "used": 0,
        "remaining": 3_000,
        "status": "GREEN",
    })

    allowances_tracker = {"allowances": allowances}

    # Observations
    observations = []
    for o in pos.observations:
        obs_dict = {
            "id": o.id,
            "type": o.severity,
            "title": o.title,
            "description": o.description,
            "category": o.category,
            "potentialSaving": o.potential_saving,
            "action": o.action,
        }
        if o.savings_breakdown:
            sb = o.savings_breakdown
            obs_dict["savingsBreakdown"] = {
                "currentState": [{"label": i.label, "value": i.value} for i in sb.current_state],
                "recommendedAction": [{"label": i.label, "value": i.value} for i in sb.recommended_action],
                "taxImpact": [{"label": i.label, "annual": i.annual, "monthly": i.monthly} for i in sb.tax_impact],
                "totalAnnual": sb.total_annual,
                "totalMonthly": sb.total_monthly,
                "costNote": sb.cost_note,
                "effectiveRelief": sb.effective_relief,
                "modelPrompt": sb.model_prompt,
            }
        observations.append(obs_dict)

    # HICBC section
    hicbc = None
    if pos.hicbc_result and pos.hicbc_result.applies:
        h = pos.hicbc_result
        hicbc = {
            "applies": True,
            "childBenefitAnnual": h.child_benefit_annual,
            "clawbackPercentage": h.clawback_percentage,
            "charge": h.hicbc_charge,
            "netBenefit": h.net_benefit,
        }

    return {
        "incomeSummary": income_summary,
        "adjustedNetIncome": adjusted_net_income,
        "taxCalculation": tax_calculation,
        "nationalInsurance": national_insurance,
        "allowancesTracker": allowances_tracker,
        "observations": observations,
        **({"hicbc": hicbc} if hicbc else {}),
    }


def _allowance_status(remaining: float, total: float) -> str:
    """GREEN / AMBER / RED based on usage."""
    if total <= 0:
        return "RED"
    pct = remaining / total
    if pct > 0.5:
        return "GREEN"
    elif pct > 0:
        return "AMBER"
    return "RED"
