"""UK tax constants — loaded from data files per tax year.

Single source of truth: app/tax/data/*.yaml (one file per tax year).
Use get_tax_year_constants(tax_year) or get_default_tax_year() for the default.
See docs/TAX_YEAR_UPDATE_PROCESS.md for adding new years.
"""

from app.tax.loader import get_all_tax_years, get_tax_year_constants as _get_constants
from app.utils.tax_year import get_default_tax_year

# Load all years from data/*.yaml
TAX_YEARS: dict = get_all_tax_years()


def get_tax_year_constants(tax_year: str | None = None) -> dict:
    """Get constants for a tax year (e.g. "2025/26"). Uses default tax year if omitted."""
    year = tax_year or get_default_tax_year()
    return _get_constants(year)


# ── Backward-compatible module-level constants (from default tax year) ───────
# These are derived from the default tax year (config or current date), not hardcoded.

def _default_data() -> dict:
    """Data for the default tax year (used by deprecated module-level constants)."""
    return get_tax_year_constants()


def _scottish_bands_from_default() -> list[dict]:
    """Build Scottish bands (lower/upper/rate) from default year's scottish_bands (width/rate)."""
    d = _default_data()
    pa = int(d["income_tax"]["personal_allowance"])
    bands = d["income_tax"].get("scottish_bands") or []
    out = [{"name": "Personal Allowance", "lower": 0, "upper": pa, "rate": 0.00}]
    cursor = pa
    for b in bands:
        width = b.get("width")
        upper = (cursor + int(width)) if width is not None else None
        out.append({"name": b["name"], "lower": cursor + 1, "upper": upper, "rate": b["rate"]})
        if width is not None:
            cursor += int(width)
    return out


_default = _default_data()
TAX_YEAR = get_default_tax_year()

# Income Tax (from default tax year data)
PERSONAL_ALLOWANCE = _default["income_tax"]["personal_allowance"]
BASIC_RATE_LIMIT = _default["income_tax"]["basic_rate_ceiling"]
HIGHER_RATE_LIMIT = _default["income_tax"]["higher_rate_ceiling"]

INCOME_TAX_BANDS = [
    {"name": "Personal Allowance", "lower": 0, "upper": int(_default["income_tax"]["personal_allowance"]), "rate": 0.00},
    {"name": "Basic Rate", "lower": int(_default["income_tax"]["personal_allowance"]) + 1, "upper": _default["income_tax"]["basic_rate_ceiling"], "rate": 0.20},
    {"name": "Higher Rate", "lower": _default["income_tax"]["basic_rate_ceiling"] + 1, "upper": _default["income_tax"]["higher_rate_ceiling"], "rate": 0.40},
    {"name": "Additional Rate", "lower": _default["income_tax"]["higher_rate_ceiling"] + 1, "upper": None, "rate": 0.45},
]

SCOTTISH_INCOME_TAX_BANDS = _scottish_bands_from_default()

# National Insurance
NI_PRIMARY_THRESHOLD = _default["ni"]["class_1"]["primary_threshold"]
NI_UPPER_EARNINGS_LIMIT = _default["ni"]["class_1"]["upper_earnings_limit"]
NI_EMPLOYEE_MAIN_RATE = _default["ni"]["class_1"]["employee_main_rate"]
NI_EMPLOYEE_UPPER_RATE = _default["ni"]["class_1"]["employee_upper_rate"]
NI_EMPLOYER_SECONDARY_THRESHOLD = _default["ni"]["class_1"]["employer_secondary_threshold"]
NI_EMPLOYER_RATE = _default["ni"]["class_1"]["employer_rate"]
NI_CLASS_2_WEEKLY_RATE = _default["ni"]["class_2"]["weekly_rate"]
NI_CLASS_2_PROFIT_THRESHOLD = _default["ni"]["class_2"]["profit_threshold"]
NI_CLASS_4_LOWER_PROFIT_LIMIT = _default["ni"]["class_4"]["lower_profit_limit"]
NI_CLASS_4_UPPER_PROFIT_LIMIT = _default["ni"]["class_4"]["upper_profit_limit"]
NI_CLASS_4_MAIN_RATE = _default["ni"]["class_4"]["main_rate"]
NI_CLASS_4_UPPER_RATE = _default["ni"]["class_4"]["upper_rate"]

# Dividends
DIVIDEND_ALLOWANCE = _default["dividends"]["allowance"]
DIVIDEND_BASIC_RATE = _default["dividends"]["basic_rate"]
DIVIDEND_HIGHER_RATE = _default["dividends"]["higher_rate"]
DIVIDEND_ADDITIONAL_RATE = _default["dividends"]["additional_rate"]

# Capital Gains
CGT_ANNUAL_EXEMPT_AMOUNT = _default["cgt"]["annual_exempt_amount"]
CGT_BASIC_RATE = _default["cgt"]["basic_rate"]
CGT_HIGHER_RATE = _default["cgt"]["higher_rate"]
CGT_RESIDENTIAL_BASIC_RATE = _default["cgt"]["residential_basic_rate"]
CGT_RESIDENTIAL_HIGHER_RATE = _default["cgt"]["residential_higher_rate"]
BADR_RATE = _default["cgt"]["badr_rate"]
BADR_LIFETIME_LIMIT = _default["cgt"]["badr_lifetime_limit"]
INVESTORS_RELIEF_RATE = _default["cgt"]["investors_relief_rate"]
INVESTORS_RELIEF_LIMIT = _default["cgt"]["investors_relief_limit"]

# Allowances
ISA_ALLOWANCE = _default["allowances"]["isa"]
LISA_ALLOWANCE = _default["allowances"]["lisa"]
JUNIOR_ISA_ALLOWANCE = _default["allowances"]["junior_isa"]
PENSION_ANNUAL_ALLOWANCE = _default["pension"]["annual_allowance"]
PENSION_MIN_TAPERED_AA = _default["pension"]["min_tapered_aa"]
MONEY_PURCHASE_AA = _default["pension"]["money_purchase_aa"]
PERSONAL_SAVINGS_ALLOWANCE_BASIC = _default["savings"]["psa_basic"]
PERSONAL_SAVINGS_ALLOWANCE_HIGHER = _default["savings"]["psa_higher"]
PERSONAL_SAVINGS_ALLOWANCE_ADDITIONAL = _default["savings"]["psa_additional"]
IHT_ANNUAL_GIFT_EXEMPTION = _default["allowances"]["iht_annual_gift_exemption"]
MARRIAGE_ALLOWANCE_TRANSFER = _default["allowances"]["marriage_allowance_transfer"]
TRADING_ALLOWANCE = _default["allowances"]["trading"]
PROPERTY_ALLOWANCE = _default["allowances"]["property"]
BLIND_PERSONS_ALLOWANCE = _default["allowances"]["blind_persons"]
RENT_A_ROOM_RELIEF = _default["allowances"]["rent_a_room"]

# Key Thresholds
PA_TAPER_THRESHOLD = _default["pa_taper"]["threshold"]
PA_TAPER_RATE = _default["pa_taper"]["rate"]
HICBC_START = _default["hicbc"]["start_threshold"]
HICBC_FULL_CLAWBACK = _default["hicbc"]["full_clawback_threshold"]
PENSION_TAPER_THRESHOLD_INCOME = _default["pension"]["taper_threshold_income"]
PENSION_TAPER_ADJUSTED_INCOME = _default["pension"]["taper_adjusted_income"]

# IHT
IHT_NIL_RATE_BAND = _default["iht"]["nil_rate_band"]
IHT_RESIDENCE_NIL_RATE_BAND = _default["iht"]["residence_nil_rate_band"]
IHT_RATE = _default["iht"]["rate"]
IHT_MAX_TAX_FREE_COUPLE = _default["iht"]["max_tax_free_couple"]

# Pension
PENSION_LUMP_SUM_ALLOWANCE = _default["pension"]["lump_sum_allowance"]
PENSION_LUMP_SUM_DEATH_BENEFIT_ALLOWANCE = _default["pension"]["lump_sum_death_benefit_allowance"]

PENSION_AA_HISTORY = dict(_default["pension"].get("aa_history", {}))
if TAX_YEAR not in PENSION_AA_HISTORY and "annual_allowance" in _default["pension"]:
    PENSION_AA_HISTORY[TAX_YEAR] = _default["pension"]["annual_allowance"]
