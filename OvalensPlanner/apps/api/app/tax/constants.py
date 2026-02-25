"""UK tax constants for 2025/26.

Authoritative source of truth — TypeScript constants in packages/shared
mirror these values for frontend display purposes.

New code should use get_tax_year_constants(). Module-level constants
are kept for backward compatibility but are deprecated.
"""

# ── Year-keyed constants ────────────────────────────────────────────────────

TAX_YEARS: dict = {
    "2025/26": {
        "income_tax": {
            "personal_allowance": 12_570,
            "basic_rate_limit": 37_700,  # band WIDTH, not ceiling
            "basic_rate_ceiling": 50_270,
            "higher_rate_ceiling": 125_140,
            "bands": [
                {"name": "Basic Rate", "width": 37_700, "rate": 0.20},
                {"name": "Higher Rate", "width": 74_870, "rate": 0.40},
                {"name": "Additional Rate", "width": None, "rate": 0.45},
            ],
            "scottish_bands": [
                {"name": "Starter Rate", "width": 2_306, "rate": 0.19},
                {"name": "Basic Rate", "width": 11_685, "rate": 0.20},
                {"name": "Intermediate Rate", "width": 17_101, "rate": 0.21},
                {"name": "Higher Rate", "width": 31_338, "rate": 0.42},
                {"name": "Advanced Rate", "width": 50_140, "rate": 0.45},
                {"name": "Top Rate", "width": None, "rate": 0.48},
            ],
        },
        "pa_taper": {
            "threshold": 100_000,
            "rate": 0.5,
        },
        "ni": {
            "class_1": {
                "primary_threshold": 12_570,
                "upper_earnings_limit": 50_270,
                "employee_main_rate": 0.08,
                "employee_upper_rate": 0.02,
                "employer_secondary_threshold": 5_000,
                "employer_rate": 0.15,
            },
            "class_2": {
                "weekly_rate": 3.45,
                "profit_threshold": 12_570,
                "weeks": 52,
            },
            "class_4": {
                "lower_profit_limit": 12_570,
                "upper_profit_limit": 50_270,
                "main_rate": 0.06,
                "upper_rate": 0.02,
            },
        },
        "dividends": {
            "allowance": 500,
            "basic_rate": 0.0875,
            "higher_rate": 0.3375,
            "additional_rate": 0.3935,
        },
        "savings": {
            "psa_basic": 1_000,
            "psa_higher": 500,
            "psa_additional": 0,
            "starting_rate_band": 5_000,
            "starting_rate": 0.0,
        },
        "hicbc": {
            "start_threshold": 60_000,
            "full_clawback_threshold": 80_000,
            "child_benefit_weekly_first": 26.05,
            "child_benefit_weekly_additional": 17.25,
        },
        "pension": {
            "annual_allowance": 60_000,
            "min_tapered_aa": 10_000,
            "money_purchase_aa": 10_000,
            "taper_threshold_income": 200_000,
            "taper_adjusted_income": 260_000,
            "lump_sum_allowance": 268_275,
            "lump_sum_death_benefit_allowance": 1_073_100,
            "aa_history": {
                "2024/25": 60_000,
                "2023/24": 60_000,
                "2022/23": 40_000,
            },
        },
        "allowances": {
            "isa": 20_000,
            "lisa": 4_000,
            "junior_isa": 9_000,
            "marriage_allowance_transfer": 1_260,
            "trading": 1_000,
            "property": 1_000,
            "blind_persons": 3_070,
            "rent_a_room": 7_500,
            "iht_annual_gift_exemption": 3_000,
        },
        "cgt": {
            "annual_exempt_amount": 3_000,
            "basic_rate": 0.18,
            "higher_rate": 0.24,
            "residential_basic_rate": 0.18,
            "residential_higher_rate": 0.24,
            "badr_rate": 0.10,
            "badr_lifetime_limit": 1_000_000,
            "investors_relief_rate": 0.10,
            "investors_relief_limit": 10_000_000,
        },
        "iht": {
            "nil_rate_band": 325_000,
            "residence_nil_rate_band": 175_000,
            "rate": 0.40,
            "max_tax_free_couple": 1_000_000,
        },
    }
}


def get_tax_year_constants(tax_year: str = "2025/26") -> dict:
    """Get constants for a specific tax year. Raises KeyError for unsupported years."""
    return TAX_YEARS[tax_year]


# ── Backward-compatible module-level constants (deprecated) ─────────────────

_2025_26 = TAX_YEARS["2025/26"]

TAX_YEAR = "2025/26"

# Income Tax
PERSONAL_ALLOWANCE = _2025_26["income_tax"]["personal_allowance"]
BASIC_RATE_LIMIT = _2025_26["income_tax"]["basic_rate_ceiling"]
HIGHER_RATE_LIMIT = _2025_26["income_tax"]["higher_rate_ceiling"]

INCOME_TAX_BANDS = [
    {"name": "Personal Allowance", "lower": 0, "upper": 12_570, "rate": 0.00},
    {"name": "Basic Rate", "lower": 12_571, "upper": 50_270, "rate": 0.20},
    {"name": "Higher Rate", "lower": 50_271, "upper": 125_140, "rate": 0.40},
    {"name": "Additional Rate", "lower": 125_141, "upper": None, "rate": 0.45},
]

SCOTTISH_INCOME_TAX_BANDS = [
    {"name": "Personal Allowance", "lower": 0, "upper": 12_570, "rate": 0.00},
    {"name": "Starter Rate", "lower": 12_571, "upper": 14_876, "rate": 0.19},
    {"name": "Basic Rate", "lower": 14_877, "upper": 26_561, "rate": 0.20},
    {"name": "Intermediate Rate", "lower": 26_562, "upper": 43_662, "rate": 0.21},
    {"name": "Higher Rate", "lower": 43_663, "upper": 75_000, "rate": 0.42},
    {"name": "Advanced Rate", "lower": 75_001, "upper": 125_140, "rate": 0.45},
    {"name": "Top Rate", "lower": 125_141, "upper": None, "rate": 0.48},
]

# National Insurance
NI_PRIMARY_THRESHOLD = _2025_26["ni"]["class_1"]["primary_threshold"]
NI_UPPER_EARNINGS_LIMIT = _2025_26["ni"]["class_1"]["upper_earnings_limit"]
NI_EMPLOYEE_MAIN_RATE = _2025_26["ni"]["class_1"]["employee_main_rate"]
NI_EMPLOYEE_UPPER_RATE = _2025_26["ni"]["class_1"]["employee_upper_rate"]
NI_EMPLOYER_SECONDARY_THRESHOLD = _2025_26["ni"]["class_1"]["employer_secondary_threshold"]
NI_EMPLOYER_RATE = _2025_26["ni"]["class_1"]["employer_rate"]
NI_CLASS_2_WEEKLY_RATE = _2025_26["ni"]["class_2"]["weekly_rate"]
NI_CLASS_2_PROFIT_THRESHOLD = _2025_26["ni"]["class_2"]["profit_threshold"]
NI_CLASS_4_LOWER_PROFIT_LIMIT = _2025_26["ni"]["class_4"]["lower_profit_limit"]
NI_CLASS_4_UPPER_PROFIT_LIMIT = _2025_26["ni"]["class_4"]["upper_profit_limit"]
NI_CLASS_4_MAIN_RATE = _2025_26["ni"]["class_4"]["main_rate"]
NI_CLASS_4_UPPER_RATE = _2025_26["ni"]["class_4"]["upper_rate"]

# Dividends
DIVIDEND_ALLOWANCE = _2025_26["dividends"]["allowance"]
DIVIDEND_BASIC_RATE = _2025_26["dividends"]["basic_rate"]
DIVIDEND_HIGHER_RATE = _2025_26["dividends"]["higher_rate"]
DIVIDEND_ADDITIONAL_RATE = _2025_26["dividends"]["additional_rate"]

# Capital Gains
CGT_ANNUAL_EXEMPT_AMOUNT = _2025_26["cgt"]["annual_exempt_amount"]
CGT_BASIC_RATE = _2025_26["cgt"]["basic_rate"]
CGT_HIGHER_RATE = _2025_26["cgt"]["higher_rate"]
CGT_RESIDENTIAL_BASIC_RATE = _2025_26["cgt"]["residential_basic_rate"]
CGT_RESIDENTIAL_HIGHER_RATE = _2025_26["cgt"]["residential_higher_rate"]
BADR_RATE = _2025_26["cgt"]["badr_rate"]
BADR_LIFETIME_LIMIT = _2025_26["cgt"]["badr_lifetime_limit"]
INVESTORS_RELIEF_RATE = _2025_26["cgt"]["investors_relief_rate"]
INVESTORS_RELIEF_LIMIT = _2025_26["cgt"]["investors_relief_limit"]

# Allowances
ISA_ALLOWANCE = _2025_26["allowances"]["isa"]
LISA_ALLOWANCE = _2025_26["allowances"]["lisa"]
JUNIOR_ISA_ALLOWANCE = _2025_26["allowances"]["junior_isa"]
PENSION_ANNUAL_ALLOWANCE = _2025_26["pension"]["annual_allowance"]
PENSION_MIN_TAPERED_AA = _2025_26["pension"]["min_tapered_aa"]
MONEY_PURCHASE_AA = _2025_26["pension"]["money_purchase_aa"]
PERSONAL_SAVINGS_ALLOWANCE_BASIC = _2025_26["savings"]["psa_basic"]
PERSONAL_SAVINGS_ALLOWANCE_HIGHER = _2025_26["savings"]["psa_higher"]
PERSONAL_SAVINGS_ALLOWANCE_ADDITIONAL = _2025_26["savings"]["psa_additional"]
IHT_ANNUAL_GIFT_EXEMPTION = _2025_26["allowances"]["iht_annual_gift_exemption"]
MARRIAGE_ALLOWANCE_TRANSFER = _2025_26["allowances"]["marriage_allowance_transfer"]
TRADING_ALLOWANCE = _2025_26["allowances"]["trading"]
PROPERTY_ALLOWANCE = _2025_26["allowances"]["property"]
BLIND_PERSONS_ALLOWANCE = _2025_26["allowances"]["blind_persons"]
RENT_A_ROOM_RELIEF = _2025_26["allowances"]["rent_a_room"]

# Key Thresholds
PA_TAPER_THRESHOLD = _2025_26["pa_taper"]["threshold"]
PA_TAPER_RATE = _2025_26["pa_taper"]["rate"]
HICBC_START = _2025_26["hicbc"]["start_threshold"]
HICBC_FULL_CLAWBACK = _2025_26["hicbc"]["full_clawback_threshold"]
PENSION_TAPER_THRESHOLD_INCOME = _2025_26["pension"]["taper_threshold_income"]
PENSION_TAPER_ADJUSTED_INCOME = _2025_26["pension"]["taper_adjusted_income"]

# IHT
IHT_NIL_RATE_BAND = _2025_26["iht"]["nil_rate_band"]
IHT_RESIDENCE_NIL_RATE_BAND = _2025_26["iht"]["residence_nil_rate_band"]
IHT_RATE = _2025_26["iht"]["rate"]
IHT_MAX_TAX_FREE_COUPLE = _2025_26["iht"]["max_tax_free_couple"]

# Pension
PENSION_LUMP_SUM_ALLOWANCE = _2025_26["pension"]["lump_sum_allowance"]
PENSION_LUMP_SUM_DEATH_BENEFIT_ALLOWANCE = _2025_26["pension"]["lump_sum_death_benefit_allowance"]

PENSION_AA_HISTORY = {
    "2025/26": 60_000,
    "2024/25": 60_000,
    "2023/24": 60_000,
    "2022/23": 40_000,
    "2021/22": 40_000,
}
