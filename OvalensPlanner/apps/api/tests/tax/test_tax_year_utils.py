"""Tests for tax year utilities (get_current_tax_year, get_default_tax_year)."""

from datetime import date
from unittest.mock import patch

import pytest

from app.utils import tax_year as tax_year_module
from app.utils.tax_year import get_current_tax_year, get_default_tax_year, days_until_tax_year_end


def _real_date(*a, **k):
    return date(*a, **k)


class TestGetCurrentTaxYear:
    """get_current_tax_year() is date-based: before 6 April → previous year label."""

    def test_before_april_6_returns_previous_year(self):
        with patch.object(tax_year_module, "date") as mock_date:
            mock_date.today.return_value = date(2026, 4, 5)
            mock_date.side_effect = _real_date
            assert get_current_tax_year() == "2025/26"

    def test_on_april_6_returns_current_year(self):
        with patch.object(tax_year_module, "date") as mock_date:
            mock_date.today.return_value = date(2026, 4, 6)
            mock_date.side_effect = _real_date
            assert get_current_tax_year() == "2026/27"

    def test_mid_year_returns_current_year(self):
        with patch.object(tax_year_module, "date") as mock_date:
            mock_date.today.return_value = date(2025, 8, 15)
            mock_date.side_effect = _real_date
            assert get_current_tax_year() == "2025/26"

    def test_format_has_slash_and_two_digit_second_year(self):
        with patch.object(tax_year_module, "date") as mock_date:
            mock_date.today.return_value = date(2025, 6, 1)
            mock_date.side_effect = _real_date
            result = get_current_tax_year()
            assert "/" in result
            parts = result.split("/")
            assert len(parts) == 2
            assert len(parts[1]) == 2  # e.g. "26" not "2026"


class TestGetDefaultTaxYear:
    """get_default_tax_year() uses config when set, else get_current_tax_year()."""

    def test_when_config_set_returns_config_value(self):
        with patch("app.config.get_settings") as mock_get_settings:
            mock_get_settings.return_value.default_tax_year = "2026/27"
            assert get_default_tax_year() == "2026/27"

    def test_when_config_none_uses_current_tax_year(self):
        with patch("app.config.get_settings") as mock_get_settings:
            mock_get_settings.return_value.default_tax_year = None
            with patch.object(tax_year_module, "get_current_tax_year", return_value="2025/26"):
                assert get_default_tax_year() == "2025/26"

    def test_when_config_raises_falls_back_to_current(self):
        with patch("app.config.get_settings") as mock_get_settings:
            mock_get_settings.side_effect = Exception("no config")
            with patch.object(tax_year_module, "get_current_tax_year", return_value="2025/26"):
                assert get_default_tax_year() == "2025/26"


class TestDaysUntilTaxYearEnd:
    """days_until_tax_year_end() returns positive days until 5 April."""

    def test_before_april_5_returns_positive(self):
        with patch.object(tax_year_module, "date") as mock_date:
            mock_date.today.return_value = date(2026, 1, 1)
            mock_date.side_effect = _real_date
            days = days_until_tax_year_end()
            assert days > 0

    def test_on_april_5_returns_zero(self):
        with patch.object(tax_year_module, "date") as mock_date:
            mock_date.today.return_value = date(2026, 4, 5)
            mock_date.side_effect = _real_date
            assert days_until_tax_year_end() == 0
