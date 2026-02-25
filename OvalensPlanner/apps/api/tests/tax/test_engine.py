"""Integration tests for the tax engine orchestrator."""

from app.tax.engine import compute_full_tax_position
from app.tax.types import IncomeSource, IncomeType


def test_sarah_mitchell():
    """Full scenario: £195,500 income, £18k pension, 2 children, HICBC."""
    r = compute_full_tax_position(
        income_sources=[
            IncomeSource(IncomeType.EMPLOYMENT, 145_000, "Employment"),
            IncomeSource(IncomeType.DIVIDENDS, 32_500, "Dividends"),
            IncomeSource(IncomeType.RENTAL, 18_000, "Rental"),
        ],
        pension_contributions=18_000,
        region="england",
        number_of_children=2,
        claims_child_benefit=True,
    )
    assert r.total_income == 195_500
    assert r.adjusted_net_income == 177_500  # 195500 - 18000
    assert r.personal_allowance == 0
    assert r.pa_status == "lost"
    assert r.hicbc_applies is True
    assert r.hicbc_result is not None
    assert r.hicbc_result.hicbc_charge > 0
    assert r.total_tax > 0
    assert r.income_tax > 0
    assert r.national_insurance > 0
    assert len(r.observations) > 0


def test_basic_employee():
    """£35k employee, no complications."""
    r = compute_full_tax_position(
        income_sources=[
            IncomeSource(IncomeType.EMPLOYMENT, 35_000, "Salary"),
        ],
        region="england",
    )
    assert r.personal_allowance == 12_570
    assert r.pa_status == "full"
    assert r.hicbc_applies is False
    assert r.in_pa_taper_zone is False
    # Tax: (35000-12570) * 0.20 = 4,486
    assert r.income_tax == 4_486
    # NI: (35000-12570) * 0.08 = 1,794.40
    assert r.national_insurance == 1_794.40


def test_scottish_taxpayer():
    """Scottish rates applied to non-savings only."""
    r_eng = compute_full_tax_position(
        income_sources=[IncomeSource(IncomeType.EMPLOYMENT, 50_000)],
        region="england",
    )
    r_sco = compute_full_tax_position(
        income_sources=[IncomeSource(IncomeType.EMPLOYMENT, 50_000)],
        region="scotland",
    )
    # Scottish and English should differ for same income
    assert r_sco.income_tax != r_eng.income_tax
    # NI should be the same (NI is UK-wide)
    assert r_sco.national_insurance == r_eng.national_insurance


def test_determinism():
    """Same inputs → identical outputs."""
    kwargs = dict(
        income_sources=[
            IncomeSource(IncomeType.EMPLOYMENT, 145_000),
            IncomeSource(IncomeType.DIVIDENDS, 32_500),
            IncomeSource(IncomeType.RENTAL, 18_000),
        ],
        pension_contributions=18_000,
        region="england",
        number_of_children=2,
        claims_child_benefit=True,
    )
    r1 = compute_full_tax_position(**kwargs)
    r2 = compute_full_tax_position(**kwargs)
    assert r1.total_tax == r2.total_tax
    assert r1.income_tax == r2.income_tax
    assert r1.national_insurance == r2.national_insurance
    assert r1.adjusted_net_income == r2.adjusted_net_income


def test_self_employed():
    """Self-employed gets Class 2 + Class 4 NI, no Class 1."""
    r = compute_full_tax_position(
        income_sources=[
            IncomeSource(IncomeType.SELF_EMPLOYMENT, 50_000, "Freelancing"),
        ],
        region="england",
    )
    assert r.ni_result.class_1 is None
    assert r.ni_result.class_2 is not None
    assert r.ni_result.class_4 is not None
    assert r.ni_result.class_2.qualifies is True
    assert r.ni_result.total_ni > 0
