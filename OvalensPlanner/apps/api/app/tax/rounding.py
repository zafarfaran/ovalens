"""HMRC-compliant rounding utilities.

HMRC truncates tax per-band to whole pounds (rounds DOWN), then sums
truncated values. This prevents off-by-£1 errors.
"""

import math


def truncate_tax(amount: float) -> float:
    """Truncate tax to whole pounds (HMRC method)."""
    return float(math.floor(amount))


def round_currency(amount: float, dp: int = 2) -> float:
    """Standard rounding for non-tax amounts (e.g. NI)."""
    return round(amount, dp)
