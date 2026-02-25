"""Income tax calculator.

Computes income tax liability for England/Wales/NI and Scotland,
handling the income ordering rule (non-savings → savings → dividends),
personal allowance allocation, band stacking with a shared cursor,
and HMRC per-band truncation.
"""

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.rounding import truncate_tax
from app.tax.types import IncomeTaxResult, TaxBandResult

logger = structlog.get_logger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _tax_through_bands(
    income: float,
    bands: list[dict],
    start_cursor: float,
) -> tuple[list[TaxBandResult], float, float]:
    """Walk income through bands starting from cursor position.

    Returns (band_results, total_tax, new_cursor).
    """
    results: list[TaxBandResult] = []
    remaining = income
    cursor = start_cursor
    total_tax = 0.0

    for band in bands:
        if remaining <= 0:
            break

        width = band["width"]
        if width is not None:
            # How much of this band is available given the cursor?
            band_start = sum(
                b["width"] for b in bands[:bands.index(band)] if b["width"] is not None
            )
            band_end = band_start + width
            available = max(0.0, band_end - cursor)
        else:
            available = remaining  # unlimited band

        taxed = min(remaining, available)
        if taxed > 0:
            raw_tax = taxed * band["rate"]
            tax = truncate_tax(raw_tax)
            results.append(TaxBandResult(
                name=band["name"],
                income_in_band=taxed,
                rate=band["rate"],
                tax=tax,
            ))
            total_tax += tax
            cursor += taxed
            remaining -= taxed

    return results, total_tax, cursor


def _apply_band_extension(
    bands: list[dict],
    extension: float,
) -> list[dict]:
    """Widen basic rate band by extension amount.

    Used for both grossed-up Gift Aid and gross pension contributions
    (relief at source), which both extend the basic rate band.
    """
    if extension <= 0:
        return bands

    extended = []
    for band in bands:
        if band["name"] == "Basic Rate":
            new_band = dict(band)
            new_band["width"] = band["width"] + extension
            extended.append(new_band)
        else:
            extended.append(band)
    return extended


def _determine_psa(
    non_savings_taxable: float,
    constants: dict,
) -> float:
    """Determine Personal Savings Allowance based on marginal non-savings rate."""
    it = constants["income_tax"]
    savings = constants["savings"]

    basic_ceiling = it["basic_rate_limit"]  # band width = 37,700
    higher_ceiling = basic_ceiling + (it["higher_rate_ceiling"] - it["basic_rate_ceiling"])

    if non_savings_taxable <= basic_ceiling:
        return float(savings["psa_basic"])
    elif non_savings_taxable <= higher_ceiling:
        return float(savings["psa_higher"])
    else:
        return float(savings["psa_additional"])


def _tax_savings_through_bands(
    income: float,
    bands: list[dict],
    start_cursor: float,
    psa: float,
) -> tuple[list[TaxBandResult], float, float]:
    """Tax savings income through bands, applying PSA."""
    results: list[TaxBandResult] = []
    remaining = income
    cursor = start_cursor
    total_tax = 0.0
    psa_remaining = psa

    for band in bands:
        if remaining <= 0:
            break

        width = band["width"]
        if width is not None:
            band_start = sum(
                b["width"] for b in bands[:bands.index(band)] if b["width"] is not None
            )
            band_end = band_start + width
            available = max(0.0, band_end - cursor)
        else:
            available = remaining

        taxed = min(remaining, available)
        if taxed > 0:
            # Apply PSA: zero-rate portion
            psa_used = min(psa_remaining, taxed)
            taxable_in_band = taxed - psa_used
            psa_remaining -= psa_used

            raw_tax = taxable_in_band * band["rate"]
            tax = truncate_tax(raw_tax)
            results.append(TaxBandResult(
                name=band["name"],
                income_in_band=taxed,
                rate=band["rate"],
                tax=tax,
            ))
            total_tax += tax
            cursor += taxed
            remaining -= taxed

    return results, total_tax, cursor


def _tax_dividends_through_bands(
    income: float,
    uk_bands: list[dict],
    start_cursor: float,
    dividend_allowance: float,
    dividend_rates: dict,
) -> tuple[list[TaxBandResult], float, float, float]:
    """Tax dividends through bands using dividend-specific rates.

    Returns (band_results, total_tax, new_cursor, allowance_used).
    """
    results: list[TaxBandResult] = []
    remaining = income
    cursor = start_cursor
    total_tax = 0.0
    allowance_remaining = dividend_allowance
    allowance_used = 0.0

    # Map UK band names to dividend rates
    rate_map = {
        "Basic Rate": dividend_rates["basic_rate"],
        "Starter Rate": dividend_rates["basic_rate"],  # Scottish starter → basic div rate
        "Intermediate Rate": dividend_rates["basic_rate"],
        "Higher Rate": dividend_rates["higher_rate"],
        "Advanced Rate": dividend_rates["higher_rate"],
        "Additional Rate": dividend_rates["additional_rate"],
        "Top Rate": dividend_rates["additional_rate"],
    }

    for band in uk_bands:
        if remaining <= 0:
            break

        width = band["width"]
        if width is not None:
            band_start = sum(
                b["width"] for b in uk_bands[:uk_bands.index(band)] if b["width"] is not None
            )
            band_end = band_start + width
            available = max(0.0, band_end - cursor)
        else:
            available = remaining

        taxed = min(remaining, available)
        if taxed > 0:
            # Apply dividend allowance
            da_used = min(allowance_remaining, taxed)
            taxable_in_band = taxed - da_used
            allowance_remaining -= da_used
            allowance_used += da_used

            div_rate = rate_map.get(band["name"], dividend_rates["additional_rate"])
            raw_tax = taxable_in_band * div_rate
            tax = truncate_tax(raw_tax)
            results.append(TaxBandResult(
                name=band["name"],
                income_in_band=taxed,
                rate=div_rate,
                tax=tax,
            ))
            total_tax += tax
            cursor += taxed
            remaining -= taxed

    return results, total_tax, cursor, allowance_used


# ── Main function ────────────────────────────────────────────────────────────

def calculate_income_tax(
    non_savings_income: float = 0,
    savings_income: float = 0,
    dividend_income: float = 0,
    *,
    personal_allowance: float = 12_570,
    is_scottish: bool = False,
    gift_aid: float = 0,
    pension_contributions: float = 0,
    tax_year: str = "2025/26",
) -> IncomeTaxResult:
    """Calculate income tax with proper income ordering and band stacking.

    Both Gift Aid and relief-at-source pension contributions extend the
    basic rate band, giving higher/additional rate relief.
    """
    c = get_tax_year_constants(tax_year)
    it = c["income_tax"]

    # Gross up gift aid for band extension
    gift_aid_gross = gift_aid / 0.8 if gift_aid > 0 else 0.0

    # Total BRB extension: grossed-up Gift Aid + gross pension contributions
    brb_extension = gift_aid_gross + pension_contributions

    # UK bands are always used for savings and dividends
    uk_bands = list(it["bands"])
    if brb_extension > 0:
        uk_bands = _apply_band_extension(uk_bands, brb_extension)

    # Non-savings bands: Scottish if applicable, else UK
    if is_scottish:
        ns_bands = list(it["scottish_bands"])
        if brb_extension > 0:
            ns_bands = _apply_band_extension(ns_bands, brb_extension)
    else:
        ns_bands = uk_bands

    # ── Allocate PA (non-savings first, then savings, then dividends) ────
    pa_remaining = personal_allowance
    ns_after_pa = max(0.0, non_savings_income - pa_remaining)
    pa_remaining = max(0.0, pa_remaining - non_savings_income)

    sav_after_pa = max(0.0, savings_income - pa_remaining)
    pa_remaining = max(0.0, pa_remaining - savings_income)

    div_after_pa = max(0.0, dividend_income - pa_remaining)
    pa_remaining = max(0.0, pa_remaining - dividend_income)

    # ── Non-savings through bands ────────────────────────────────────────
    ns_results, ns_tax, cursor = _tax_through_bands(ns_after_pa, ns_bands, 0.0)

    # For savings/dividends, cursor must be in UK band space
    # If Scottish, map cursor to UK space (same position by amount consumed)
    uk_cursor = ns_after_pa  # amount of band space consumed

    # ── Determine PSA ────────────────────────────────────────────────────
    psa = _determine_psa(ns_after_pa, c)

    # ── Savings through UK bands ─────────────────────────────────────────
    sav_results, sav_tax, uk_cursor = _tax_savings_through_bands(
        sav_after_pa, uk_bands, uk_cursor, psa,
    )

    # ── Dividends through UK bands ───────────────────────────────────────
    div_results, div_tax, uk_cursor, da_used = _tax_dividends_through_bands(
        div_after_pa, uk_bands, uk_cursor, c["dividends"]["allowance"], c["dividends"],
    )

    total_tax = ns_tax + sav_tax + div_tax
    taxable_income = ns_after_pa + sav_after_pa + div_after_pa

    logger.info(
        "Income tax calculated",
        non_savings_tax=ns_tax,
        savings_tax=sav_tax,
        dividend_tax=div_tax,
        total=total_tax,
    )

    return IncomeTaxResult(
        non_savings_tax=ns_tax,
        savings_tax=sav_tax,
        dividend_tax=div_tax,
        total_income_tax=total_tax,
        taxable_income=taxable_income,
        non_savings_bands=ns_results,
        savings_bands=sav_results,
        dividend_bands=div_results,
        personal_savings_allowance=psa,
        dividend_allowance_used=da_used,
    )
