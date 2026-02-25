"""Tax year utilities."""

from datetime import date


def get_current_tax_year() -> str:
    """Get the current UK tax year label (e.g., '2025/26')."""
    today = date.today()
    year = today.year
    month = today.month
    day = today.day

    if month < 4 or (month == 4 and day < 6):
        start_year = year - 1
    else:
        start_year = year

    return f"{start_year}/{(start_year + 1) % 100:02d}"


def days_until_tax_year_end() -> int:
    """Calculate days remaining until the current tax year ends (April 5)."""
    today = date.today()
    year = today.year
    month = today.month
    day = today.day

    end_year = year
    if month > 4 or (month == 4 and day >= 6):
        end_year = year + 1

    tax_year_end = date(end_year, 4, 5)
    return (tax_year_end - today).days
