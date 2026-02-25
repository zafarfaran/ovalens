"""Tests for the PDF report generation service."""

import io

from app.services.pdf_report import generate_tax_report


# ---------------------------------------------------------------------------
# Shared test fixtures
# ---------------------------------------------------------------------------

def _full_client() -> dict:
    return {
        "first_name": "Sarah",
        "last_name": "Chen",
        "email": "sarah@example.com",
        "ni_number": "QQ 12 34 56 A",
        "utr": "12345 67890",
        "date_of_birth": "1985-06-15",
        "region": "England",
        "employment_status": "Employed",
    }


def _full_tax_position() -> dict:
    return {
        "tax_year": "2024/25",
        "total_income": 95_000,
        "adjusted_net_income": 92_000,
        "taxable_income": 79_430,
        "income_tax": 20_188,
        "national_insurance": 4_964.16,
        "dividend_tax": 0,
        "total_tax": 25_152.16,
        "effective_rate": 26.5,
        "marginal_rate": 40.0,
        "personal_allowance": 12_570,
        "pa_status": "full",
        "hicbc_applies": False,
        "hicbc_charge": 0,
    }


def _full_dashboard_data() -> dict:
    return {
        "incomeSummary": {
            "totalIncome": 95_000,
            "sources": [
                {"type": "employment", "label": "Employment Income", "amount": 85_000},
                {"type": "rental", "label": "Rental Income", "amount": 10_000},
            ],
        },
        "taxCalculation": {
            "totalIncomeTax": 20_188,
            "totalTax": 25_152.16,
            "effectiveRate": 26.5,
            "marginalRate": 40.0,
            "incomeTaxByBand": [
                {"band": "Personal Allowance", "amount": 12_570, "rate": 0, "tax": 0},
                {"band": "Basic Rate", "amount": 37_700, "rate": 0.2, "tax": 7_540},
                {"band": "Higher Rate", "amount": 44_730, "rate": 0.4, "tax": 12_648},
            ],
        },
        "nationalInsurance": {
            "class1": 4_964.16,
            "class2": 0,
            "class4": 0,
        },
        "adjustedNetIncome": {
            "amount": 92_000,
            "personalAllowanceStatus": "full",
        },
        "allowancesTracker": {
            "allowances": [
                {"name": "Personal Allowance", "annualLimit": 12_570, "used": 12_570, "remaining": 0, "status": "fully_used"},
            ],
        },
        "hicbc": {"applies": False},
        "observations": [
            {
                "type": "opportunity",
                "severity": "opportunity",
                "title": "Pension Contribution Opportunity",
                "description": "Consider salary sacrifice to reduce higher-rate tax liability.",
                "potentialSaving": 3_200,
                "action": "Discuss pension sacrifice options with employer.",
            },
            {
                "type": "warning",
                "severity": "warning",
                "title": "Approaching PA Taper Zone",
                "description": "Income above \u00a3100,000 will trigger personal allowance taper.",
                "potentialSaving": None,
                "action": "Monitor total income carefully.",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_generate_pdf_returns_bytes() -> None:
    """Full data generates a valid PDF returned as BytesIO."""
    result = generate_tax_report(
        client=_full_client(),
        tax_position=_full_tax_position(),
        dashboard_data=_full_dashboard_data(),
    )

    assert isinstance(result, io.BytesIO)
    header = result.read(5)
    assert header == b"%PDF-"


def test_generate_pdf_with_hicbc() -> None:
    """PDF generates successfully when HICBC data is included."""
    dashboard = _full_dashboard_data()
    dashboard["hicbc"] = {
        "applies": True,
        "childBenefitAnnual": 2_075,
        "clawbackPercentage": 50,
        "charge": 1_037.50,
        "netBenefit": 1_037.50,
    }

    result = generate_tax_report(
        client=_full_client(),
        tax_position=_full_tax_position(),
        dashboard_data=dashboard,
    )

    assert isinstance(result, io.BytesIO)
    data = result.read()
    assert data[:5] == b"%PDF-"
    assert len(data) > 1000  # non-trivial PDF


def test_generate_pdf_with_scenarios() -> None:
    """PDF generates successfully when scenario comparison data is provided."""
    scenarios = [
        {
            "name": "Sacrifice \u00a310,000",
            "description": "Model salary sacrifice at \u00a310,000",
            "current": {
                "gross_salary": 95_000,
                "sacrifice": 0,
                "income_tax": 20_188,
                "national_insurance": 4_964.16,
                "hicbc": 0,
                "total_tax": 25_152.16,
                "personal_allowance": 12_570,
            },
            "proposed": {
                "gross_salary": 85_000,
                "sacrifice": 10_000,
                "income_tax": 16_188,
                "national_insurance": 4_164.16,
                "hicbc": 0,
                "total_tax": 20_352.16,
                "personal_allowance": 12_570,
            },
            "savings": {
                "income_tax": 4_000,
                "national_insurance": 800,
                "hicbc_avoided": 0,
                "total": 4_800,
            },
            "pa_change": {
                "current": 12_570,
                "proposed": 12_570,
                "restored": 0,
            },
            "extra_into_pension": 10_000,
        },
    ]

    result = generate_tax_report(
        client=_full_client(),
        tax_position=_full_tax_position(),
        dashboard_data=_full_dashboard_data(),
        scenarios=scenarios,
    )

    assert isinstance(result, io.BytesIO)
    data = result.read()
    assert data[:5] == b"%PDF-"
    assert len(data) > 1000


def test_generate_pdf_minimal_data() -> None:
    """PDF generates successfully with minimal client and dashboard data."""
    minimal_client = {"first_name": "Test", "last_name": "User"}
    minimal_tax_position = {
        "tax_year": "2024/25",
        "total_income": 30_000,
        "adjusted_net_income": 30_000,
        "income_tax": 3_486,
        "national_insurance": 0,
        "dividend_tax": 0,
        "total_tax": 3_486,
        "effective_rate": 11.6,
        "marginal_rate": 20.0,
        "personal_allowance": 12_570,
        "pa_status": "full",
        "hicbc_applies": False,
        "hicbc_charge": 0,
    }
    minimal_dashboard = {
        "incomeSummary": {
            "totalIncome": 30_000,
            "sources": [{"label": "Employment", "amount": 30_000}],
        },
        "taxCalculation": {
            "totalIncomeTax": 3_486,
            "totalTax": 3_486,
            "effectiveRate": 11.6,
            "marginalRate": 20.0,
            "incomeTaxByBand": [
                {"band": "Basic Rate", "amount": 17_430, "rate": 0.2, "tax": 3_486},
            ],
        },
        "nationalInsurance": {"class1": 0, "class2": 0, "class4": 0},
        "adjustedNetIncome": {"amount": 30_000, "personalAllowanceStatus": "full"},
        "allowancesTracker": {"allowances": []},
        "hicbc": {"applies": False},
        "observations": [],
    }

    result = generate_tax_report(
        client=minimal_client,
        tax_position=minimal_tax_position,
        dashboard_data=minimal_dashboard,
    )

    assert isinstance(result, io.BytesIO)
    data = result.read()
    assert data[:5] == b"%PDF-"
    assert len(data) > 500
