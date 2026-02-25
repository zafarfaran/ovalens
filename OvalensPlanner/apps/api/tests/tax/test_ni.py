"""Tests for National Insurance calculator.

NI uses standard rounding (round_currency), NOT HMRC truncation.
"""

from app.tax.national_insurance import (
    calculate_class_1_ni,
    calculate_class_2_ni,
    calculate_class_4_ni,
)


# ── Class 1 ──────────────────────────────────────────────────────────────────

def test_class_1_below_pt():
    """£10k earnings — below primary threshold, no NI."""
    r = calculate_class_1_ni(10_000)
    assert r.total_employee_ni == 0
    assert r.main_ni == 0
    assert r.upper_ni == 0


def test_class_1_basic():
    """£30k earnings — main NI only.
    (30000 - 12570) * 0.08 = 1394.40
    """
    r = calculate_class_1_ni(30_000)
    assert r.main_ni == 1_394.40
    assert r.upper_ni == 0
    assert r.total_employee_ni == 1_394.40


def test_class_1_above_uel():
    """£100k earnings — main + upper NI.
    Main: (50270 - 12570) * 0.08 = 3016.00
    Upper: (100000 - 50270) * 0.02 = 994.60
    Total: 4010.60
    """
    r = calculate_class_1_ni(100_000)
    assert r.main_ni == 3_016.00
    assert r.upper_ni == 994.60
    assert r.total_employee_ni == 4_010.60


def test_class_1_employer():
    """£30k earnings — employer NI (2025/26: 15% above £5,000).
    (30000 - 5000) * 0.15 = 3750.00
    """
    r = calculate_class_1_ni(30_000)
    assert r.total_employer_ni == 3_750.00


# ── Class 4 ──────────────────────────────────────────────────────────────────

def test_class_4_basic():
    """£36k profits — main NI only.
    (36000 - 12570) * 0.06 = 1405.80
    """
    r = calculate_class_4_ni(36_000)
    assert r.main_ni == 1_405.80
    assert r.upper_ni == 0
    assert r.total_ni == 1_405.80


def test_class_4_above_upl():
    """£80k profits — main + upper NI.
    Main: (50270 - 12570) * 0.06 = 2262.00
    Upper: (80000 - 50270) * 0.02 = 594.60
    Total: 2856.60
    """
    r = calculate_class_4_ni(80_000)
    assert r.main_ni == 2_262.00
    assert r.upper_ni == 594.60
    assert r.total_ni == 2_856.60


# ── Class 2 ──────────────────────────────────────────────────────────────────

def test_class_2_flat_rate():
    """£30k profits (above threshold) — flat weekly rate.
    52 * 3.45 = 179.40
    """
    r = calculate_class_2_ni(30_000)
    assert r.qualifies is True
    assert r.annual_ni == 179.40


def test_class_2_below_threshold():
    """£10k profits — below threshold, no Class 2 NI."""
    r = calculate_class_2_ni(10_000)
    assert r.qualifies is False
    assert r.annual_ni == 0
