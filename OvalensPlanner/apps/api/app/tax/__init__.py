"""UK tax calculation engine.

Source of truth for all tax computations. Each module handles
a specific area of UK tax law for the 2025/26 tax year.
"""

from app.tax.engine import compute_full_tax_position

__all__ = ["compute_full_tax_position"]
