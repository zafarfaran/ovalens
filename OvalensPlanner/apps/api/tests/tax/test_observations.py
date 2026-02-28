"""Tests for observations detector."""

from app.tax.ani import calculate_adjusted_net_income
from app.tax.hicbc import calculate_hicbc
from app.tax.income_tax import calculate_income_tax
from app.tax.national_insurance import calculate_class_1_ni
from app.tax.observations import detect_observations
from app.tax.types import NIResult


def _make_ni(earnings: float) -> NIResult:
    c1 = calculate_class_1_ni(earnings)
    return NIResult(class_1=c1, class_2=None, class_4=None, total_ni=c1.total_employee_ni)


def test_pa_taper_observation():
    """ANI in taper zone triggers warning."""
    ani = calculate_adjusted_net_income(112000)
    it = calculate_income_tax(non_savings_income=112000, personal_allowance=ani.personal_allowance)
    ni = _make_ni(112000)
    obs = detect_observations(ani, it, ni, None, None, total_income=112000)
    ids = [o.id for o in obs]
    assert "pa-taper-zone" in ids


def test_pa_lost_observation():
    """ANI above £125,140 triggers PA lost warning."""
    ani = calculate_adjusted_net_income(150000)
    it = calculate_income_tax(non_savings_income=150000, personal_allowance=0)
    ni = _make_ni(150000)
    obs = detect_observations(ani, it, ni, None, None, total_income=150000)
    ids = [o.id for o in obs]
    assert "pa-lost" in ids
    assert "pa-taper-zone" not in ids  # lost, not tapered


def test_hicbc_observation():
    """HICBC triggers warning when applicable."""
    ani = calculate_adjusted_net_income(70000)
    it = calculate_income_tax(non_savings_income=70000, personal_allowance=ani.personal_allowance)
    ni = _make_ni(70000)
    hicbc = calculate_hicbc(ani.adjusted_net_income, number_of_children=2)
    obs = detect_observations(ani, it, ni, hicbc, None, total_income=70000)
    ids = [o.id for o in obs]
    assert "hicbc-applies" in ids


def test_no_hicbc_observation_below_threshold():
    """No HICBC observation when below threshold."""
    ani = calculate_adjusted_net_income(50000)
    it = calculate_income_tax(non_savings_income=50000, personal_allowance=ani.personal_allowance)
    ni = _make_ni(50000)
    hicbc = calculate_hicbc(ani.adjusted_net_income, number_of_children=2)
    obs = detect_observations(ani, it, ni, hicbc, None, total_income=50000)
    ids = [o.id for o in obs]
    assert "hicbc-applies" not in ids


def test_isa_always_present():
    """ISA observation always present when income > 0."""
    ani = calculate_adjusted_net_income(30000)
    it = calculate_income_tax(non_savings_income=30000, personal_allowance=ani.personal_allowance)
    ni = _make_ni(30000)
    obs = detect_observations(ani, it, ni, None, None, total_income=30000)
    ids = [o.id for o in obs]
    assert "isa-allowance" in ids
