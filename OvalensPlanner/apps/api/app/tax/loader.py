"""Load tax year constants from data files (YAML per year).

Single source of truth: one file per tax year in app/tax/data/*.yaml.
Adding a new year = add 2026_27.yaml (no calculator code changes).
See docs/TAX_YEAR_UPDATE_PROCESS.md.
"""

from pathlib import Path

import yaml

from app.core.logging import get_logger

logger = get_logger(__name__)

_DATA_DIR = Path(__file__).resolve().parent / "data"
_TAX_YEARS: dict[str, dict] | None = None


def _filename_to_tax_year(filename: str) -> str:
    """Convert 2025_26.yaml -> "2025/26"."""
    base = filename.replace(".yaml", "").replace(".yml", "")
    if "_" in base:
        a, b = base.split("_", 1)
        return f"{a}/{b}"
    return base


def _load_all() -> dict[str, dict]:
    """Load all YAML files in data/ and return map of tax_year -> constants."""
    global _TAX_YEARS
    if _TAX_YEARS is not None:
        return _TAX_YEARS

    _TAX_YEARS = {}
    if not _DATA_DIR.exists():
        logger.warning("Tax data directory missing", path=str(_DATA_DIR))
        return _TAX_YEARS

    for path in sorted(_DATA_DIR.glob("*.yaml")) + list(_DATA_DIR.glob("*.yml")):
        try:
            raw = path.read_text(encoding="utf-8")
            data = yaml.safe_load(raw)
            if not isinstance(data, dict):
                logger.warning("Tax data file not a dict", path=path.name)
                continue
            tax_year = _filename_to_tax_year(path.name)
            _TAX_YEARS[tax_year] = data
            logger.debug("Loaded tax year data", tax_year=tax_year, path=path.name)
        except Exception as e:
            logger.exception("Failed to load tax data file", path=path.name, error=str(e))
            raise

    logger.info("Tax year data loaded", years=list(_TAX_YEARS.keys()), count=len(_TAX_YEARS))
    return _TAX_YEARS


def get_tax_year_constants(tax_year: str) -> dict:
    """Get constants for a specific tax year (e.g. "2025/26"). Raises KeyError if unknown."""
    years = _load_all()
    if tax_year not in years:
        raise KeyError(f"Unsupported tax year: {tax_year}. Supported: {list(years.keys())}")
    return years[tax_year]


def list_supported_tax_years() -> list[str]:
    """Return sorted list of supported tax year keys."""
    return sorted(_load_all().keys())


def get_all_tax_years() -> dict[str, dict]:
    """Return full map of tax_year -> constants (for backward compat and admin)."""
    return _load_all()


def reload_tax_data() -> None:
    """Clear cache so next access reloads from disk (useful for tests or admin)."""
    global _TAX_YEARS
    _TAX_YEARS = None
