"""Tests for the exports router."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


PAYLOAD = {
    "client": {
        "first_name": "Sarah",
        "last_name": "Chen",
        "email": "sarah@example.com",
    },
    "tax_position": {
        "tax_year": "2024/25",
        "total_income": 95000,
        "adjusted_net_income": 92000,
        "taxable_income": 79470,
        "income_tax": 20188,
        "national_insurance": 4964.16,
        "dividend_tax": 0,
        "total_tax": 25152.16,
        "effective_rate": 26.5,
        "marginal_rate": 40.0,
        "personal_allowance": 12570,
        "pa_status": "full",
        "hicbc_applies": False,
        "hicbc_charge": 0,
    },
    "dashboard_data": {
        "incomeSummary": {
            "totalIncome": 95000,
            "sources": [{"type": "employment", "label": "Employment", "amount": 95000}],
        },
        "taxCalculation": {
            "totalIncomeTax": 20188,
            "totalTax": 25152.16,
            "effectiveRate": 26.5,
            "marginalRate": 40.0,
            "incomeTaxByBand": [{"band": "Basic Rate", "amount": 37700, "rate": 0.2, "tax": 7540}],
        },
        "nationalInsurance": {"class1": 4964.16, "class2": 0, "class4": 0},
        "adjustedNetIncome": {"amount": 92000, "personalAllowanceStatus": "full"},
        "allowancesTracker": {"allowances": []},
        "observations": [],
    },
}


@pytest.mark.asyncio
async def test_export_returns_pdf(client):
    """POST /api/exports/tax-report returns a PDF."""
    res = await client.post("/api/exports/tax-report", json=PAYLOAD)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment" in res.headers.get("content-disposition", "")
    assert res.content[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_export_missing_fields(client):
    """POST with missing required fields returns 422."""
    res = await client.post("/api/exports/tax-report", json={"client": {"first_name": "Test"}})
    assert res.status_code == 422
