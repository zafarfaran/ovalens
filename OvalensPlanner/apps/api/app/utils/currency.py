"""Currency formatting utilities."""


def format_gbp(amount: float) -> str:
    """Format amount as GBP currency string."""
    return f"£{amount:,.2f}"


def format_rate(rate: float) -> str:
    """Format a decimal rate as a percentage string."""
    return f"{rate * 100:.1f}%"
