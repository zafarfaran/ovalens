"""Tests for Adjusted Net Income calculator."""

from app.tax.ani import calculate_adjusted_net_income
from app.tax.types import PAStatus


def test_full_pa_low_income():
    """£40k income → full PA."""
    r = calculate_adjusted_net_income(40_000)
    assert r.personal_allowance == 12_570
    assert r.pa_status == PAStatus.FULL
    assert r.adjusted_net_income == 40_000
    assert r.in_taper_zone is False


def test_full_pa_at_threshold():
    """£100k income → exactly at taper threshold, still full PA."""
    r = calculate_adjusted_net_income(100_000)
    assert r.personal_allowance == 12_570
    assert r.pa_status == PAStatus.FULL
    assert r.adjusted_net_income == 100_000
    assert r.in_taper_zone is False


def test_tapered_pa():
    """£112k income → PA tapered by (112k-100k)*0.5 = £6,000 → PA = £6,570."""
    r = calculate_adjusted_net_income(112_000)
    assert r.personal_allowance == 6_570
    assert r.pa_status == PAStatus.TAPERED
    assert r.in_taper_zone is True
    assert r.personal_allowance_lost == 6_000


def test_lost_pa():
    """£130k income → PA fully lost (well above £125,140)."""
    r = calculate_adjusted_net_income(130_000)
    assert r.personal_allowance == 0
    assert r.pa_status == PAStatus.LOST
    assert r.in_taper_zone is False


def test_pa_exactly_at_lost_boundary():
    """£125,140 income → PA exactly lost (100k + 12570*2 = 125,140)."""
    r = calculate_adjusted_net_income(125_140)
    assert r.personal_allowance == 0
    assert r.pa_status == PAStatus.LOST


def test_pension_reduces_ani():
    """£112k - £12k pension = £100k ANI → full PA restored."""
    r = calculate_adjusted_net_income(112_000, pension_contributions=12_000)
    assert r.adjusted_net_income == 100_000
    assert r.personal_allowance == 12_570
    assert r.pa_status == PAStatus.FULL


def test_gift_aid_grossed_up():
    """£110k income - £8k gift aid (= £10k gross) → ANI £100k → full PA."""
    r = calculate_adjusted_net_income(110_000, gift_aid=8_000)
    assert r.gift_aid_gross == 10_000
    assert r.adjusted_net_income == 100_000
    assert r.personal_allowance == 12_570
    assert r.pa_status == PAStatus.FULL


def test_sarah_mitchell():
    """Sarah: £195,500 total - £18k pension = ANI £177,500 → PA lost."""
    r = calculate_adjusted_net_income(195_500, pension_contributions=18_000)
    assert r.adjusted_net_income == 177_500
    assert r.personal_allowance == 0
    assert r.pa_status == PAStatus.LOST
