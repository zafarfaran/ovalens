"""Tests for Pension Annual Allowance calculator."""

from app.tax.pension_aa import calculate_pension_aa


def test_standard_aa():
    """Below taper thresholds → standard £60k AA."""
    r = calculate_pension_aa(150_000, 150_000, current_year_contributions=20_000)
    assert r.annual_allowance == 60_000
    assert r.is_tapered is False
    assert r.remaining == 40_000
    assert r.mpaa_applies is False


def test_with_carry_forward():
    """3 years of unused AA carried forward."""
    r = calculate_pension_aa(
        150_000, 150_000,
        current_year_contributions=80_000,
        contributions_by_year={
            "2024/25": 20_000,  # AA was 60k → 40k unused
            "2023/24": 30_000,  # AA was 60k → 30k unused
            "2022/23": 10_000,  # AA was 40k → 30k unused
        },
    )
    assert r.annual_allowance == 60_000
    # Total available: 60k (current) + 40k + 30k + 30k = 160k
    assert r.total_available == 160_000
    assert r.remaining == 80_000  # 160k - 80k contributions


def test_tapered_aa():
    """threshold_income > 200k, adjusted > 260k → AA tapered.
    Adjusted: 300k → excess = 300k - 260k = 40k
    Taper: 40k / 2 = 20k reduction
    AA: 60k - 20k = 40k
    """
    r = calculate_pension_aa(300_000, 250_000, current_year_contributions=10_000)
    assert r.is_tapered is True
    assert r.annual_allowance == 40_000
    assert r.remaining == 30_000


def test_mpaa():
    """MPAA triggered → AA = £10k, no carry forward."""
    r = calculate_pension_aa(
        150_000, 150_000,
        current_year_contributions=5_000,
        mpaa_triggered=True,
    )
    assert r.mpaa_applies is True
    assert r.annual_allowance == 10_000
    assert len(r.carry_forward) == 0
    assert r.total_available == 10_000
    assert r.remaining == 5_000


def test_taper_floor_at_10k():
    """Very high income → AA floors at £10k (min tapered AA).
    Adjusted: 500k → excess = 500k - 260k = 240k
    Taper: 240k / 2 = 120k reduction
    AA: max(10k, 60k - 120k) = 10k
    """
    r = calculate_pension_aa(500_000, 400_000, current_year_contributions=5_000)
    assert r.is_tapered is True
    assert r.annual_allowance == 10_000


def test_carry_forward_partial_years():
    """Only some years have contributions."""
    r = calculate_pension_aa(
        150_000, 150_000,
        current_year_contributions=50_000,
        contributions_by_year={
            "2024/25": 60_000,  # Fully used -> 0 unused
            "2023/24": 0,       # None used -> 60k unused
            # 2022/23 not provided -> not included in carry forward
        },
    )
    # carry forward only includes years present in aa_history AND contributions_by_year
    # 2024/25: 60k AA - 60k used = 0 unused
    # 2023/24: 60k AA - 0 used = 60k unused
    # 2022/23: in aa_history but NOT in contributions_by_year, so contribution=0, unused=40k
    assert r.total_available == 60_000 + 0 + 60_000 + 40_000  # current + CF
    assert r.remaining == 110_000  # 160k - 50k


def test_carry_forward_no_history():
    """No carry forward data -> just current year AA."""
    r = calculate_pension_aa(
        150_000, 150_000,
        current_year_contributions=30_000,
        contributions_by_year=None,
    )
    assert r.total_available == 60_000
    assert r.remaining == 30_000
    assert len(r.carry_forward) == 0


def test_carry_forward_tapered_with_history():
    """Tapered AA with carry forward still available."""
    r = calculate_pension_aa(
        300_000, 250_000,
        current_year_contributions=50_000,
        contributions_by_year={
            "2024/25": 10_000,  # 60k AA - 10k = 50k unused
            "2023/24": 10_000,  # 60k AA - 10k = 50k unused
            "2022/23": 10_000,  # 40k AA - 10k = 30k unused
        },
    )
    assert r.is_tapered is True
    assert r.annual_allowance == 40_000
    assert r.total_available == 40_000 + 50_000 + 50_000 + 30_000  # 170k
    assert r.remaining == 120_000  # 170k - 50k
