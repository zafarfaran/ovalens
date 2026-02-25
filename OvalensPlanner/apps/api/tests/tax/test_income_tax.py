"""Tests for income tax calculator.

Hand-verified calculations using HMRC truncation (floor per-band).
Band widths from constants: Basic 37,700 / Higher 74,870 / Additional unlimited.
"""

from app.tax.income_tax import calculate_income_tax


def test_basic_rate_only():
    """£30k income, PA=12,570 → taxable 17,430 → all basic at 20%."""
    r = calculate_income_tax(non_savings_income=30_000, personal_allowance=12_570)
    assert r.taxable_income == 17_430
    assert r.total_income_tax == 3_486  # 17430 * 0.20 = 3486.00


def test_higher_rate():
    """£80k income, PA=12,570 → taxable 67,430.
    Basic: 37,700 * 0.20 = 7,540
    Higher: 29,730 * 0.40 = 11,892
    Total: 19,432
    """
    r = calculate_income_tax(non_savings_income=80_000, personal_allowance=12_570)
    assert r.taxable_income == 67_430
    assert r.non_savings_bands[0].tax == 7_540
    assert r.non_savings_bands[1].tax == 11_892
    assert r.total_income_tax == 19_432


def test_additional_rate():
    """£200k income, PA=0 → taxable 200,000.
    Basic: 37,700 * 0.20 = 7,540
    Higher: 74,870 * 0.40 = 29,948
    Additional: 87,430 * 0.45 = 39,343 (truncated from 39343.50)
    Total: 76,831
    """
    r = calculate_income_tax(non_savings_income=200_000, personal_allowance=0)
    assert r.taxable_income == 200_000
    assert r.non_savings_bands[0].tax == 7_540
    assert r.non_savings_bands[1].tax == 29_948
    assert r.non_savings_bands[2].tax == 39_343
    assert r.total_income_tax == 76_831


def test_scottish_basic():
    """Scottish £30k, PA=12,570 → taxable 17,430.
    Starter: 2,306 * 0.19 = 438 (truncated from 438.14)
    Basic: 11,685 * 0.20 = 2,337
    Intermediate: 3,439 * 0.21 = 722 (truncated from 722.19)
    Total: 3,497
    """
    r = calculate_income_tax(
        non_savings_income=30_000, personal_allowance=12_570, is_scottish=True,
    )
    assert r.taxable_income == 17_430
    assert r.non_savings_bands[0].name == "Starter Rate"
    assert r.non_savings_bands[0].tax == 438
    assert r.non_savings_bands[1].tax == 2_337
    assert r.non_savings_bands[2].tax == 722
    assert r.total_income_tax == 3_497


def test_scottish_higher():
    """Scottish £80k, PA=12,570 → taxable 67,430.
    Starter: 2,306 * 0.19 = 438
    Basic: 11,685 * 0.20 = 2,337
    Intermediate: 17,101 * 0.21 = 3,591 (truncated from 3591.21)
    Higher: 31,338 * 0.42 = 13,161 (truncated from 13161.96, band width limit)
    Advanced: 5,000 * 0.45 = 2,250
    Total: 21,777
    """
    r = calculate_income_tax(
        non_savings_income=80_000, personal_allowance=12_570, is_scottish=True,
    )
    assert r.total_income_tax == 21_777


def test_dividends_stacking():
    """Employment £50k + Dividends £20k, PA=12,570.
    Non-savings taxable: 50,000 - 12,570 = 37,430
    All 37,430 in basic band → tax 7,486

    Band cursor after non-savings: 37,430 (basic band width is 37,700 so 270 left)

    Dividends £20k stack on top (DA absorbs across bands):
    - Basic band: 270, DA absorbs 270 → tax 0, DA remaining 230
    - Higher band: 19,730, DA absorbs 230 → taxable 19,500 at 33.75% = 6,581
    Dividend tax: 6,581

    Total: 7,486 + 6,581 = 14,067
    """
    r = calculate_income_tax(
        non_savings_income=50_000,
        dividend_income=20_000,
        personal_allowance=12_570,
    )
    assert r.non_savings_tax == 7_486
    assert r.dividend_tax == 6_581
    assert r.total_income_tax == 14_067


def test_dividends_basic_rate_only():
    """Only dividend income £20k, PA=12,570.
    Taxable dividends: 20,000 - 12,570 = 7,430
    £500 allowance → taxable 6,930
    All in basic band at 8.75% = 606 (truncated from 606.375)
    """
    r = calculate_income_tax(
        dividend_income=20_000,
        personal_allowance=12_570,
    )
    assert r.dividend_allowance_used == 500
    assert r.dividend_tax == 606


def test_savings_with_psa():
    """Employment £30k + Savings £5k, PA=12,570.
    Non-savings taxable: 30,000 - 12,570 = 17,430 (all basic) → tax 3,486
    Cursor at 17,430 in basic band.

    Savings £5k stacks on top:
    - PA already used. Savings gets PSA £1,000 (basic rate taxpayer)
    - £1,000 PSA at 0%
    - £4,000 at 20% = 800
    Savings tax: 800

    Total: 3,486 + 800 = 4,286
    """
    r = calculate_income_tax(
        non_savings_income=30_000,
        savings_income=5_000,
        personal_allowance=12_570,
    )
    assert r.personal_savings_allowance == 1_000
    assert r.savings_tax == 800
    assert r.total_income_tax == 4_286


def test_gift_aid_band_extension():
    """£52k income, PA=12,570, £2k gift aid (= £2,500 gross).
    Basic band extended by £2,500: width becomes 37,700 + 2,500 = 40,200.
    Taxable: 52,000 - 12,570 = 39,430
    All fits in extended basic band → tax 7,886

    Without gift aid: 39,430 taxable, basic takes 37,700 → 7,540,
    then 1,730 at 40% = 692 → total 8,232.
    With gift aid saves £346.
    """
    r = calculate_income_tax(
        non_savings_income=52_000,
        personal_allowance=12_570,
        gift_aid=2_000,
    )
    assert r.total_income_tax == 7_886


def test_zero_income():
    """Zero income → zero tax."""
    r = calculate_income_tax(personal_allowance=12_570)
    assert r.total_income_tax == 0
    assert r.taxable_income == 0
