import pytest

from app.tax.constants import get_tax_year_constants


@pytest.fixture
def constants():
    return get_tax_year_constants("2025/26")
