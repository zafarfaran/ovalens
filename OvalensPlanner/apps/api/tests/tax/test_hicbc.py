"""Tests for High Income Child Benefit Charge calculator."""

from app.tax.hicbc import calculate_hicbc


def test_no_hicbc_below_60k():
    """ANI £55k, 2 children → no HICBC."""
    r = calculate_hicbc(55_000, number_of_children=2)
    assert r.applies is False
    assert r.hicbc_charge == 0
    assert r.clawback_percentage == 0


def test_partial_clawback_70k():
    """ANI £70k, 2 children → 50% clawback.
    Clawback pct: (70000 - 60000) / 200 = 50%
    """
    r = calculate_hicbc(70_000, number_of_children=2)
    assert r.applies is True
    assert r.clawback_percentage == 50.0
    assert r.hicbc_charge > 0
    assert r.net_benefit > 0  # still some benefit remaining


def test_full_clawback_80k():
    """ANI £80k, 2 children → 100% clawback."""
    r = calculate_hicbc(80_000, number_of_children=2)
    assert r.applies is True
    assert r.clawback_percentage == 100.0
    assert r.hicbc_charge == r.child_benefit_annual
    assert r.net_benefit == 0


def test_no_children():
    """ANI £80k, 0 children → no HICBC regardless of income."""
    r = calculate_hicbc(80_000, number_of_children=0)
    assert r.applies is False
    assert r.hicbc_charge == 0


def test_one_child_vs_two():
    """One child has lower benefit (and therefore lower charge) than two."""
    r1 = calculate_hicbc(80_000, number_of_children=1)
    r2 = calculate_hicbc(80_000, number_of_children=2)
    assert r1.child_benefit_annual < r2.child_benefit_annual
    assert r1.hicbc_charge < r2.hicbc_charge
