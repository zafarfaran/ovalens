"""Marriage Allowance calculator.

Allows transfer of £1,260 of Personal Allowance between spouses
when the transferor is a non-taxpayer and the recipient is a basic rate taxpayer.
"""

from app.tax.types import ANIResult


def calculate_marriage_allowance(
    transferor_ani: ANIResult,
    recipient_ani: ANIResult,
) -> dict:
    """Calculate marriage allowance eligibility and benefit."""
    raise NotImplementedError("Marriage allowance — Phase 3")
