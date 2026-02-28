"""Tests for tax year data loader (YAML → get_tax_year_constants)."""

import pytest

from app.tax.loader import (
    get_all_tax_years,
    get_tax_year_constants,
    list_supported_tax_years,
    reload_tax_data,
)


@pytest.fixture(autouse=True)
def _ensure_loader_loaded():
    """Ensure loader has run (no-op if already loaded)."""
    get_all_tax_years()
    yield
    # Don't clear cache by default so other test modules see same data


class TestLoader:
    """Loader: load YAML data and expose by tax year."""

    def test_list_supported_tax_years_includes_2025_26(self):
        years = list_supported_tax_years()
        assert "2025/26" in years
        assert years == sorted(years)

    def test_get_tax_year_constants_returns_dict_with_expected_sections(self):
        c = get_tax_year_constants("2025/26")
        assert isinstance(c, dict)
        assert "income_tax" in c
        assert "ni" in c
        assert "dividends" in c
        assert "pension" in c
        assert "allowances" in c
        assert "cgt" in c
        assert "iht" in c
        assert "pa_taper" in c
        assert "hicbc" in c
        assert "savings" in c

    def test_get_tax_year_constants_2025_26_values(self):
        c = get_tax_year_constants("2025/26")
        assert c["income_tax"]["personal_allowance"] == 12570
        assert c["income_tax"]["basic_rate_ceiling"] == 50270
        assert c["income_tax"]["higher_rate_ceiling"] == 125140
        assert c["pa_taper"]["threshold"] == 100000
        assert c["pa_taper"]["rate"] == 0.5
        assert c["ni"]["class_1"]["primary_threshold"] == 12570
        assert c["dividends"]["allowance"] == 500
        assert c["pension"]["annual_allowance"] == 60000
        assert c["allowances"]["isa"] == 20000
        assert c["cgt"]["annual_exempt_amount"] == 3000

    def test_get_tax_year_constants_unsupported_year_raises(self):
        with pytest.raises(KeyError) as exc_info:
            get_tax_year_constants("2099/00")
        assert "2099/00" in str(exc_info.value)
        assert "Supported" in str(exc_info.value)

    def test_get_all_tax_years_returns_same_as_loader(self):
        all_years = get_all_tax_years()
        assert isinstance(all_years, dict)
        assert "2025/26" in all_years
        assert all_years["2025/26"] == get_tax_year_constants("2025/26")

    def test_reload_tax_data_clears_cache(self):
        get_tax_year_constants("2025/26")
        reload_tax_data()
        # After reload, data should still load (we didn't remove files)
        c = get_tax_year_constants("2025/26")
        assert c["income_tax"]["personal_allowance"] == 12570
        reload_tax_data()  # leave cache clear for next tests if they rely on fresh load

    def test_income_tax_bands_structure(self):
        c = get_tax_year_constants("2025/26")
        bands = c["income_tax"]["bands"]
        assert len(bands) >= 3
        for b in bands:
            assert "name" in b
            assert "width" in b
            assert "rate" in b
        assert bands[0]["name"] == "Basic Rate"
        assert bands[0]["rate"] == 0.20

    def test_scottish_bands_present(self):
        c = get_tax_year_constants("2025/26")
        scottish = c["income_tax"]["scottish_bands"]
        assert len(scottish) >= 5
        names = [b["name"] for b in scottish]
        assert "Starter Rate" in names
        assert "Top Rate" in names
