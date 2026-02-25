# PDF Export Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a server-side PDF generation service that produces professional, colored tax advisory reports, wired to the existing Export buttons in the frontend.

**Architecture:** New FastAPI router (`exports.py`) accepts dashboard + client data via POST, delegates to a ReportLab-based PDF service (`pdf_report.py`) that generates an in-memory A4 report. Frontend Export buttons POST data and trigger a browser download of the returned PDF blob.

**Tech Stack:** ReportLab (Python PDF generation), FastAPI StreamingResponse, fetch + Blob URL on frontend

---

### Task 1: Install ReportLab dependency

**Files:**
- Modify: `helio/apps/api/pyproject.toml:10-22`

**Step 1: Add reportlab to dependencies**

In `helio/apps/api/pyproject.toml`, add `"reportlab>=4.1.0"` to the `dependencies` list (after `"httpx>=0.27.0"`):

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.6.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "aiosqlite>=0.20.0",
    "anthropic>=0.39.0",
    "openai>=1.55.0",
    "structlog>=24.4.0",
    "python-multipart>=0.0.12",
    "httpx>=0.27.0",
    "reportlab>=4.1.0",
]
```

**Step 2: Install the dependency**

Run from the API directory:
```bash
cd helio/apps/api && pip install -e ".[dev]"
```
Expected: Successfully installed reportlab

**Step 3: Verify import works**

```bash
cd helio/apps/api && python -c "import reportlab; print(reportlab.Version)"
```
Expected: Prints version number (e.g. `4.1.0` or later)

**Step 4: Commit**

```bash
git add helio/apps/api/pyproject.toml
git commit -m "feat(api): add reportlab dependency for PDF export"
```

---

### Task 2: PDF Report Service — Core generation

**Files:**
- Create: `helio/apps/api/app/services/pdf_report.py`
- Create: `helio/apps/api/tests/test_pdf_report.py`

This is the core PDF generation service. It takes structured data and produces a professional, colored, multi-section A4 PDF in-memory.

**Step 1: Write the test**

Create `helio/apps/api/tests/test_pdf_report.py`:

```python
"""Tests for the PDF report generation service."""

import io

import pytest


# ── Fixtures ──

SAMPLE_CLIENT = {
    "first_name": "Sarah",
    "last_name": "Chen",
    "email": "sarah@example.com",
    "ni_number": "QQ 12 34 56 A",
    "utr": "12345 67890",
    "date_of_birth": "1985-06-15",
    "region": "England",
    "employment_status": "Employed",
}

SAMPLE_TAX_POSITION = {
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
}

SAMPLE_DASHBOARD_DATA = {
    "incomeSummary": {
        "totalIncome": 95000,
        "sources": [
            {"type": "employment", "label": "Employment income", "amount": 85000},
            {"type": "rental", "label": "Rental income", "amount": 10000},
        ],
    },
    "taxCalculation": {
        "totalIncomeTax": 20188,
        "totalTax": 25152.16,
        "effectiveRate": 26.5,
        "marginalRate": 40.0,
        "incomeTaxByBand": [
            {"band": "Personal Allowance", "amount": 12570, "rate": 0, "tax": 0},
            {"band": "Basic Rate", "amount": 37700, "rate": 0.2, "tax": 7540},
            {"band": "Higher Rate", "amount": 41730, "rate": 0.4, "tax": 16692},
        ],
    },
    "nationalInsurance": {"class1": 4964.16, "class2": 0, "class4": 0},
    "adjustedNetIncome": {"amount": 92000, "personalAllowanceStatus": "full"},
    "allowancesTracker": {
        "allowances": [
            {"name": "Personal Allowance", "annualLimit": 12570, "used": 12570, "remaining": 0, "status": "fully_used"},
            {"name": "Dividend Allowance", "annualLimit": 500, "used": 0, "remaining": 500, "status": "available"},
        ]
    },
    "observations": [
        {
            "type": "opportunity",
            "title": "Pension contribution opportunity",
            "description": "Consider increasing pension contributions to reduce higher-rate tax.",
            "potentialSaving": 3200,
            "action": "Review pension strategy",
        },
    ],
}


def test_generate_pdf_returns_bytes():
    """PDF service returns non-empty bytes from a BytesIO buffer."""
    from app.services.pdf_report import generate_tax_report

    buf = generate_tax_report(
        client=SAMPLE_CLIENT,
        tax_position=SAMPLE_TAX_POSITION,
        dashboard_data=SAMPLE_DASHBOARD_DATA,
    )
    assert isinstance(buf, io.BytesIO)
    content = buf.getvalue()
    assert len(content) > 500  # a real PDF is at least a few KB
    assert content[:5] == b"%PDF-"  # valid PDF header


def test_generate_pdf_with_hicbc():
    """PDF generates without error when HICBC data is present."""
    from app.services.pdf_report import generate_tax_report

    dash = {**SAMPLE_DASHBOARD_DATA}
    dash["hicbc"] = {
        "applies": True,
        "childBenefitAnnual": 2075,
        "clawbackPercentage": 60,
        "charge": 1245,
        "netBenefit": 830,
    }
    pos = {**SAMPLE_TAX_POSITION, "hicbc_applies": True, "hicbc_charge": 1245}

    buf = generate_tax_report(
        client=SAMPLE_CLIENT,
        tax_position=pos,
        dashboard_data=dash,
    )
    assert buf.getvalue()[:5] == b"%PDF-"


def test_generate_pdf_with_scenarios():
    """PDF generates with scenario comparison section."""
    from app.services.pdf_report import generate_tax_report

    scenarios = [
        {
            "name": "Sacrifice £5,000",
            "description": "Model salary sacrifice at £5,000",
            "current": {
                "gross_salary": 95000,
                "sacrifice": 0,
                "income_tax": 20188,
                "national_insurance": 4964.16,
                "hicbc": 0,
                "total_tax": 25152.16,
                "personal_allowance": 12570,
            },
            "proposed": {
                "gross_salary": 90000,
                "sacrifice": 5000,
                "income_tax": 18188,
                "national_insurance": 4364.16,
                "hicbc": 0,
                "total_tax": 22552.16,
                "personal_allowance": 12570,
            },
            "savings": {
                "income_tax": 2000,
                "national_insurance": 600,
                "hicbc_avoided": 0,
                "total": 2600,
            },
            "pa_change": {"current": 12570, "proposed": 12570, "restored": 0},
            "extra_into_pension": 5000,
        }
    ]

    buf = generate_tax_report(
        client=SAMPLE_CLIENT,
        tax_position=SAMPLE_TAX_POSITION,
        dashboard_data=SAMPLE_DASHBOARD_DATA,
        scenarios=scenarios,
    )
    assert buf.getvalue()[:5] == b"%PDF-"


def test_generate_pdf_minimal_data():
    """PDF generates with minimal required data (no optional fields)."""
    from app.services.pdf_report import generate_tax_report

    minimal_client = {"first_name": "John", "last_name": "Doe"}
    minimal_pos = {
        "tax_year": "2024/25",
        "total_income": 50000,
        "adjusted_net_income": 50000,
        "taxable_income": 37430,
        "income_tax": 7486,
        "national_insurance": 2964,
        "dividend_tax": 0,
        "total_tax": 10450,
        "effective_rate": 20.9,
        "marginal_rate": 20.0,
        "personal_allowance": 12570,
        "pa_status": "full",
        "hicbc_applies": False,
        "hicbc_charge": 0,
    }
    minimal_dash = {
        "incomeSummary": {"totalIncome": 50000, "sources": [{"type": "employment", "label": "Employment", "amount": 50000}]},
        "taxCalculation": {
            "totalIncomeTax": 7486,
            "totalTax": 10450,
            "effectiveRate": 20.9,
            "marginalRate": 20.0,
            "incomeTaxByBand": [{"band": "Basic Rate", "amount": 37430, "rate": 0.2, "tax": 7486}],
        },
        "nationalInsurance": {"class1": 2964, "class2": 0, "class4": 0},
        "adjustedNetIncome": {"amount": 50000, "personalAllowanceStatus": "full"},
        "allowancesTracker": {"allowances": []},
        "observations": [],
    }

    buf = generate_tax_report(client=minimal_client, tax_position=minimal_pos, dashboard_data=minimal_dash)
    assert buf.getvalue()[:5] == b"%PDF-"
```

**Step 2: Run tests to verify they fail**

```bash
cd helio/apps/api && python -m pytest tests/test_pdf_report.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.pdf_report'`

**Step 3: Implement the PDF report service**

Create `helio/apps/api/app/services/pdf_report.py`:

```python
"""PDF report generation service using ReportLab.

Generates professional, coloured A4 tax advisory reports.
All data is passed in — no database access needed.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


# ═══════════════════════════════════════════════════
# Brand colours
# ═══════════════════════════════════════════════════

BRAND = colors.HexColor("#5C7CFA")
BRAND_DARK = colors.HexColor("#364FC7")
BRAND_LIGHT = colors.HexColor("#DBE4FF")
BRAND_BG = colors.HexColor("#EDF2FF")
GREEN = colors.HexColor("#40C057")
GREEN_LIGHT = colors.HexColor("#EBFBEE")
AMBER = colors.HexColor("#FD7E14")
AMBER_LIGHT = colors.HexColor("#FFF4E6")
RED = colors.HexColor("#FA5252")
RED_LIGHT = colors.HexColor("#FFF5F5")
GREY_50 = colors.HexColor("#F8F9FA")
GREY_100 = colors.HexColor("#F1F3F5")
GREY_200 = colors.HexColor("#E9ECEF")
GREY_500 = colors.HexColor("#868E96")
GREY_700 = colors.HexColor("#495057")
GREY_900 = colors.HexColor("#212529")
WHITE = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm


# ═══════════════════════════════════════════════════
# Styles
# ═══════════════════════════════════════════════════

def _build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Title"],
            fontSize=28, leading=34, textColor=GREY_900,
            fontName="Helvetica-Bold",
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle", parent=base["Normal"],
            fontSize=14, leading=18, textColor=GREY_500,
            fontName="Helvetica",
        ),
        "cover_client": ParagraphStyle(
            "cover_client", parent=base["Normal"],
            fontSize=20, leading=26, textColor=BRAND_DARK,
            fontName="Helvetica-Bold",
        ),
        "section_heading": ParagraphStyle(
            "section_heading", parent=base["Heading2"],
            fontSize=13, leading=18, textColor=WHITE,
            fontName="Helvetica-Bold", alignment=TA_LEFT,
            spaceBefore=14, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontSize=10, leading=14, textColor=GREY_900,
            fontName="Helvetica",
        ),
        "body_small": ParagraphStyle(
            "body_small", parent=base["Normal"],
            fontSize=9, leading=12, textColor=GREY_700,
            fontName="Helvetica",
        ),
        "body_right": ParagraphStyle(
            "body_right", parent=base["Normal"],
            fontSize=10, leading=14, textColor=GREY_900,
            fontName="Courier", alignment=TA_RIGHT,
        ),
        "body_right_bold": ParagraphStyle(
            "body_right_bold", parent=base["Normal"],
            fontSize=10, leading=14, textColor=GREY_900,
            fontName="Courier-Bold", alignment=TA_RIGHT,
        ),
        "body_brand": ParagraphStyle(
            "body_brand", parent=base["Normal"],
            fontSize=10, leading=14, textColor=BRAND_DARK,
            fontName="Courier-Bold", alignment=TA_RIGHT,
        ),
        "total_label": ParagraphStyle(
            "total_label", parent=base["Normal"],
            fontSize=11, leading=15, textColor=GREY_900,
            fontName="Helvetica-Bold",
        ),
        "total_value": ParagraphStyle(
            "total_value", parent=base["Normal"],
            fontSize=12, leading=16, textColor=GREY_900,
            fontName="Courier-Bold", alignment=TA_RIGHT,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"],
            fontSize=7, leading=9, textColor=GREY_500,
            fontName="Helvetica", alignment=TA_CENTER,
        ),
        "obs_title": ParagraphStyle(
            "obs_title", parent=base["Normal"],
            fontSize=10, leading=13, textColor=GREY_900,
            fontName="Helvetica-Bold",
        ),
        "obs_body": ParagraphStyle(
            "obs_body", parent=base["Normal"],
            fontSize=9, leading=12, textColor=GREY_700,
            fontName="Helvetica",
        ),
        "saving": ParagraphStyle(
            "saving", parent=base["Normal"],
            fontSize=10, leading=13, textColor=GREEN,
            fontName="Courier-Bold", alignment=TA_RIGHT,
        ),
    }


# ═══════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════

def _fmt(n: float | int) -> str:
    return f"\u00a3{n:,.0f}"


def _fmt2(n: float | int) -> str:
    return f"\u00a3{n:,.2f}"


def _pct(n: float | int) -> str:
    return f"{n:.1f}%"


def _section_header(title: str, styles: dict) -> Table:
    """Coloured section header bar."""
    t = Table(
        [[Paragraph(title, styles["section_heading"])]],
        colWidths=[PAGE_W - 2 * MARGIN],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    return t


def _kv_table(rows: list[tuple[str, str]], styles: dict, bold_last: bool = False) -> Table:
    """Two-column key-value table with alternating row shading."""
    col_w = (PAGE_W - 2 * MARGIN) / 2
    data = []
    for label, value in rows:
        data.append([
            Paragraph(label, styles["body"]),
            Paragraph(value, styles["body_right"]),
        ])
    if bold_last and data:
        last_label, last_value = rows[-1]
        data[-1] = [
            Paragraph(last_label, styles["total_label"]),
            Paragraph(last_value, styles["body_brand"]),
        ]

    t = Table(data, colWidths=[col_w, col_w])
    style_cmds: list = [
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, GREY_200),
    ]
    # Alternating row shading
    for i in range(len(data)):
        if i % 2 == 1:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), GREY_50))
    t.setStyle(TableStyle(style_cmds))
    return t


# ═══════════════════════════════════════════════════
# Main generator
# ═══════════════════════════════════════════════════

def generate_tax_report(
    *,
    client: dict,
    tax_position: dict,
    dashboard_data: dict,
    scenarios: list[dict] | None = None,
) -> io.BytesIO:
    """Generate a professional tax report PDF and return it as a BytesIO buffer.

    All parameters are plain dicts matching the frontend data shapes.
    No database access is performed.
    """
    buf = io.BytesIO()
    styles = _build_styles()
    now = datetime.now(tz=timezone.utc).strftime("%d %B %Y, %H:%M UTC")
    tax_year = tax_position.get("tax_year", "2024/25")
    client_name = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip() or "Client"

    # ── Page templates ──
    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(GREY_500)
        canvas.drawCentredString(
            PAGE_W / 2, 1.2 * cm,
            f"Generated by Helio \u00b7 {now}  |  Page {doc.page}"
        )
        canvas.drawCentredString(
            PAGE_W / 2, 0.8 * cm,
            "This report is for advisory purposes only and does not constitute tax advice."
        )
        canvas.restoreState()

    def _cover_footer(canvas, doc):
        _footer(canvas, doc)

    body_frame = Frame(MARGIN, 2 * cm, PAGE_W - 2 * MARGIN, PAGE_H - 4 * cm, id="body")
    cover_frame = Frame(MARGIN, 2 * cm, PAGE_W - 2 * MARGIN, PAGE_H - 4 * cm, id="cover")

    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=2 * cm,
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=_cover_footer),
        PageTemplate(id="body", frames=[body_frame], onPage=_footer),
    ])

    elements: list = []

    # ═══════════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════════

    elements.append(Spacer(1, 5 * cm))

    # Brand name
    elements.append(Paragraph("HELIO", ParagraphStyle(
        "brand", fontName="Helvetica-Bold", fontSize=16, leading=20,
        textColor=BRAND, spaceAfter=4,
    )))
    elements.append(Paragraph("Tax Advisory Report", styles["cover_title"]))
    elements.append(Spacer(1, 1 * cm))
    elements.append(Paragraph(client_name, styles["cover_client"]))
    elements.append(Spacer(1, 0.5 * cm))
    elements.append(Paragraph(f"Tax Year {tax_year}", styles["cover_subtitle"]))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(f"Generated {now}", styles["cover_subtitle"]))
    elements.append(Spacer(1, 3 * cm))

    # Confidential notice
    elements.append(Paragraph(
        "CONFIDENTIAL \u2014 This document is prepared for the named individual and their adviser.",
        ParagraphStyle("conf", fontName="Helvetica", fontSize=8, leading=10, textColor=GREY_500, alignment=TA_CENTER),
    ))

    elements.append(NextPageTemplate("body"))
    elements.append(PageBreak())

    # ═══════════════════════════════════════════════
    # SECTION 1: Client Information
    # ═══════════════════════════════════════════════

    elements.append(_section_header("Client Information", styles))
    elements.append(Spacer(1, 4 * mm))

    client_rows = [
        ("Name", client_name),
    ]
    if client.get("email"):
        client_rows.append(("Email", client["email"]))
    if client.get("ni_number"):
        client_rows.append(("National Insurance Number", client["ni_number"]))
    if client.get("utr"):
        client_rows.append(("Unique Taxpayer Reference", client["utr"]))
    if client.get("date_of_birth"):
        client_rows.append(("Date of Birth", client["date_of_birth"]))
    if client.get("region"):
        client_rows.append(("Region", client["region"]))
    if client.get("employment_status"):
        client_rows.append(("Employment Status", client["employment_status"]))

    elements.append(_kv_table(client_rows, styles))
    elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 2: Income Summary
    # ═══════════════════════════════════════════════

    elements.append(_section_header("Income Summary", styles))
    elements.append(Spacer(1, 4 * mm))

    income_rows = []
    for src in dashboard_data.get("incomeSummary", {}).get("sources", []):
        income_rows.append((src.get("label", src.get("type", "Income")), _fmt(src["amount"])))
    income_rows.append(("Total Gross Income", _fmt(tax_position["total_income"])))

    elements.append(_kv_table(income_rows, styles, bold_last=True))
    elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 3: Tax Computation
    # ═══════════════════════════════════════════════

    elements.append(_section_header("Income Tax Breakdown", styles))
    elements.append(Spacer(1, 4 * mm))

    # Band table — 4 columns
    tc = dashboard_data.get("taxCalculation", {})
    bands = tc.get("incomeTaxByBand", [])
    active_bands = [b for b in bands if b.get("amount", 0) > 0]

    if active_bands:
        band_header = [
            Paragraph("Band", ParagraphStyle("bh", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_500)),
            Paragraph("Income", ParagraphStyle("bh2", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_500, alignment=TA_RIGHT)),
            Paragraph("Rate", ParagraphStyle("bh3", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_500, alignment=TA_RIGHT)),
            Paragraph("Tax", ParagraphStyle("bh4", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_500, alignment=TA_RIGHT)),
        ]
        band_data = [band_header]
        for b in active_bands:
            rate_pct = b["rate"] * 100 if b["rate"] < 1 else b["rate"]
            band_data.append([
                Paragraph(b["band"], styles["body"]),
                Paragraph(_fmt(b["amount"]), styles["body_right"]),
                Paragraph(f"{rate_pct:.0f}%", styles["body_right"]),
                Paragraph(_fmt(b["tax"]), styles["body_right"]),
            ])
        # Total row
        band_data.append([
            Paragraph("Total Income Tax", styles["total_label"]),
            Paragraph("", styles["body"]),
            Paragraph("", styles["body"]),
            Paragraph(_fmt2(tax_position["income_tax"]), styles["body_brand"]),
        ])

        avail_w = PAGE_W - 2 * MARGIN
        band_table = Table(band_data, colWidths=[avail_w * 0.4, avail_w * 0.22, avail_w * 0.16, avail_w * 0.22])
        band_style_cmds = [
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, GREY_200),
            ("LINEABOVE", (0, -1), (-1, -1), 0.5, GREY_200),
        ]
        for i in range(1, len(band_data) - 1):
            if i % 2 == 0:
                band_style_cmds.append(("BACKGROUND", (0, i), (-1, i), GREY_50))
        band_table.setStyle(TableStyle(band_style_cmds))
        elements.append(band_table)

    if tax_position.get("dividend_tax", 0) > 0:
        elements.append(Spacer(1, 2 * mm))
        elements.append(_kv_table([("Of which dividend tax", _fmt2(tax_position["dividend_tax"]))], styles))

    elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 4: National Insurance
    # ═══════════════════════════════════════════════

    ni = dashboard_data.get("nationalInsurance", {})
    total_ni = ni.get("class1", 0) + ni.get("class2", 0) + ni.get("class4", 0)

    if total_ni > 0:
        elements.append(_section_header("National Insurance", styles))
        elements.append(Spacer(1, 4 * mm))

        ni_rows = []
        if ni.get("class1", 0) > 0:
            ni_rows.append(("Class 1 (Employee)", _fmt2(ni["class1"])))
        if ni.get("class2", 0) > 0:
            ni_rows.append(("Class 2 (Self-employed)", _fmt2(ni["class2"])))
        if ni.get("class4", 0) > 0:
            ni_rows.append(("Class 4 (Self-employed)", _fmt2(ni["class4"])))
        ni_rows.append(("Total National Insurance", _fmt2(total_ni)))

        elements.append(_kv_table(ni_rows, styles, bold_last=True))
        elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 5: Adjusted Net Income
    # ═══════════════════════════════════════════════

    elements.append(_section_header("Adjusted Net Income & Personal Allowance", styles))
    elements.append(Spacer(1, 4 * mm))

    ani = dashboard_data.get("adjustedNetIncome", {})
    pa_status = tax_position.get("pa_status", "full")
    pa_label = f"\u00a3{tax_position.get('personal_allowance', 12570):,.0f} ({pa_status.capitalize()})"

    ani_rows = [
        ("Total Income", _fmt(tax_position["total_income"])),
    ]
    if tax_position["total_income"] != tax_position["adjusted_net_income"]:
        diff = tax_position["total_income"] - tax_position["adjusted_net_income"]
        ani_rows.append(("Less deductions (pension, Gift Aid)", f"\u2212{_fmt(diff)}"))
    ani_rows.append(("Adjusted Net Income", _fmt(tax_position["adjusted_net_income"])))
    ani_rows.append(("Personal Allowance", pa_label))

    elements.append(_kv_table(ani_rows, styles, bold_last=False))
    elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 6: HICBC
    # ═══════════════════════════════════════════════

    hicbc = dashboard_data.get("hicbc")
    if hicbc and hicbc.get("applies"):
        elements.append(_section_header("High Income Child Benefit Charge", styles))
        elements.append(Spacer(1, 4 * mm))

        hicbc_rows = [
            ("Annual Child Benefit", _fmt2(hicbc.get("childBenefitAnnual", 0))),
            ("Clawback Percentage", f"{hicbc.get('clawbackPercentage', 0):.0f}%"),
            ("HICBC Charge", _fmt2(hicbc.get("charge", 0))),
            ("Net Benefit Retained", _fmt2(hicbc.get("netBenefit", 0))),
        ]

        elements.append(_kv_table(hicbc_rows, styles))
        elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 7: Tax Summary
    # ═══════════════════════════════════════════════

    elements.append(_section_header("Tax Summary", styles))
    elements.append(Spacer(1, 4 * mm))

    summary_rows = [
        ("Income Tax", _fmt2(tax_position["income_tax"])),
    ]
    if total_ni > 0:
        summary_rows.append(("National Insurance", _fmt2(total_ni)))
    if hicbc and hicbc.get("applies"):
        summary_rows.append(("HICBC Charge", _fmt2(hicbc.get("charge", 0))))
    summary_rows.append(("Total Tax", _fmt2(tax_position["total_tax"])))

    elements.append(_kv_table(summary_rows, styles, bold_last=True))
    elements.append(Spacer(1, 3 * mm))

    # Rates row
    rates_data = [[
        Paragraph(f"Effective Rate: {_pct(tax_position['effective_rate'])}", styles["body"]),
        Paragraph(f"Marginal Rate: {_pct(tax_position['marginal_rate'])}", styles["body"]),
    ]]
    rates_t = Table(rates_data, colWidths=[(PAGE_W - 2 * MARGIN) / 2] * 2)
    rates_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_BG),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(rates_t)
    elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 8: Observations
    # ═══════════════════════════════════════════════

    observations = dashboard_data.get("observations", [])
    if observations:
        elements.append(_section_header("Observations & Recommendations", styles))
        elements.append(Spacer(1, 4 * mm))

        for obs in observations:
            obs_type = obs.get("type", "info")
            badge_color = (
                RED if obs_type == "critical"
                else AMBER if obs_type == "warning"
                else GREEN if obs_type == "opportunity"
                else GREY_500
            )
            badge_bg = (
                RED_LIGHT if obs_type == "critical"
                else AMBER_LIGHT if obs_type == "warning"
                else GREEN_LIGHT if obs_type == "opportunity"
                else GREY_50
            )

            title_text = obs.get("title", "Observation")
            desc_text = obs.get("description", "")
            saving = obs.get("potentialSaving", 0)
            action = obs.get("action", "")

            # Observation card as a table
            card_rows = []
            card_rows.append([Paragraph(title_text, styles["obs_title"])])
            if desc_text:
                card_rows.append([Paragraph(desc_text, styles["obs_body"])])
            if saving and saving > 0:
                card_rows.append([Paragraph(f"Potential saving: {_fmt(saving)}", styles["saving"])])
            if action:
                card_rows.append([Paragraph(f"Action: {action}", styles["obs_body"])])

            card = Table(card_rows, colWidths=[PAGE_W - 2 * MARGIN - 8 * mm])
            card.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), badge_bg),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (0, 0), 8),
                ("BOTTOMPADDING", (0, -1), (0, -1), 8),
                ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                ("LINEBELOW", (0, 0), (-1, 0), 1, badge_color),
            ]))

            # Wrap card in outer table with left accent
            outer = Table([[card]], colWidths=[PAGE_W - 2 * MARGIN])
            outer.setStyle(TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            elements.append(outer)
            elements.append(Spacer(1, 3 * mm))

        elements.append(Spacer(1, 3 * mm))

    # ═══════════════════════════════════════════════
    # SECTION 9: Scenario Comparisons
    # ═══════════════════════════════════════════════

    if scenarios:
        elements.append(_section_header("Scenario Comparisons", styles))
        elements.append(Spacer(1, 4 * mm))

        for scenario in scenarios:
            elements.append(Paragraph(scenario.get("name", "Scenario"), styles["obs_title"]))
            elements.append(Spacer(1, 2 * mm))

            current = scenario.get("current", {})
            proposed = scenario.get("proposed", {})
            savings = scenario.get("savings", {})

            # Comparison table header
            avail_w = PAGE_W - 2 * MARGIN
            cmp_header = [
                Paragraph("", styles["body"]),
                Paragraph("Current", ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_500, alignment=TA_RIGHT)),
                Paragraph("Proposed", ParagraphStyle("ch2", fontName="Helvetica-Bold", fontSize=9, textColor=GREY_500, alignment=TA_RIGHT)),
                Paragraph("Saving", ParagraphStyle("ch3", fontName="Helvetica-Bold", fontSize=9, textColor=GREEN, alignment=TA_RIGHT)),
            ]

            cmp_rows = [cmp_header]
            fields = [
                ("Gross Salary", "gross_salary", None),
                ("Sacrifice", "sacrifice", None),
                ("Income Tax", "income_tax", "income_tax"),
                ("National Insurance", "national_insurance", "national_insurance"),
                ("HICBC", "hicbc", "hicbc_avoided"),
                ("Total Tax", "total_tax", "total"),
            ]
            for label, key, sav_key in fields:
                cur_val = current.get(key, 0)
                pro_val = proposed.get(key, 0)
                sav_val = savings.get(sav_key, 0) if sav_key else ""
                cmp_rows.append([
                    Paragraph(label, styles["body"]),
                    Paragraph(_fmt(cur_val), styles["body_right"]),
                    Paragraph(_fmt(pro_val), styles["body_right"]),
                    Paragraph(_fmt(sav_val) if isinstance(sav_val, (int, float)) and sav_val > 0 else "", styles["saving"]),
                ])

            cmp_table = Table(cmp_rows, colWidths=[avail_w * 0.34, avail_w * 0.22, avail_w * 0.22, avail_w * 0.22])
            cmp_style_cmds = [
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, GREY_200),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, GREY_200),
                ("BACKGROUND", (0, -1), (-1, -1), GREEN_LIGHT),
            ]
            for i in range(1, len(cmp_rows) - 1):
                if i % 2 == 0:
                    cmp_style_cmds.append(("BACKGROUND", (0, i), (-1, i), GREY_50))
            cmp_table.setStyle(TableStyle(cmp_style_cmds))
            elements.append(cmp_table)

            # Extra into pension
            extra = scenario.get("extra_into_pension", 0)
            if extra > 0:
                elements.append(Spacer(1, 2 * mm))
                elements.append(Paragraph(
                    f"Extra directed into pension: {_fmt(extra)}",
                    ParagraphStyle("extra", fontName="Helvetica-Bold", fontSize=10, textColor=GREEN),
                ))

            elements.append(Spacer(1, 6 * mm))

    # ═══════════════════════════════════════════════
    # BUILD
    # ═══════════════════════════════════════════════

    doc.build(elements)
    buf.seek(0)
    return buf
```

**Step 4: Run tests to verify they pass**

```bash
cd helio/apps/api && python -m pytest tests/test_pdf_report.py -v
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add helio/apps/api/app/services/pdf_report.py helio/apps/api/tests/test_pdf_report.py
git commit -m "feat(api): add PDF report generation service with ReportLab"
```

---

### Task 3: Exports API Router

**Files:**
- Create: `helio/apps/api/app/routers/exports.py`
- Modify: `helio/apps/api/app/main.py:13,62`
- Create: `helio/apps/api/tests/test_exports.py`

**Step 1: Write the test**

Create `helio/apps/api/tests/test_exports.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

```bash
cd helio/apps/api && python -m pytest tests/test_exports.py -v
```
Expected: FAIL — 404 (route doesn't exist yet)

**Step 3: Create the exports router**

Create `helio/apps/api/app/routers/exports.py`:

```python
"""Export endpoints — generate PDF reports."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.pdf_report import generate_tax_report

router = APIRouter(tags=["exports"])


class ExportRequest(BaseModel):
    client: dict[str, Any]
    tax_position: dict[str, Any]
    dashboard_data: dict[str, Any]
    scenarios: list[dict[str, Any]] | None = None


@router.post("/exports/tax-report")
async def export_tax_report(req: ExportRequest) -> StreamingResponse:
    """Generate and return a PDF tax report."""
    client_name = f"{req.client.get('first_name', '')}_{req.client.get('last_name', '')}".strip("_") or "client"
    tax_year = req.tax_position.get("tax_year", "2024-25").replace("/", "-")

    buf = generate_tax_report(
        client=req.client,
        tax_position=req.tax_position,
        dashboard_data=req.dashboard_data,
        scenarios=req.scenarios,
    )

    filename = f"helio-tax-report-{client_name}-{tax_year}.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

**Step 4: Register the router in main.py**

In `helio/apps/api/app/main.py`:

- Line 13: Add `exports` to the import:
  ```python
  from app.routers import chat, clients, context, documents, exports, health
  ```

- After line 62, add:
  ```python
  app.include_router(exports.router, prefix="/api")
  ```

**Step 5: Run tests to verify they pass**

```bash
cd helio/apps/api && python -m pytest tests/test_exports.py -v
```
Expected: 2 tests PASS

**Step 6: Commit**

```bash
git add helio/apps/api/app/routers/exports.py helio/apps/api/tests/test_exports.py helio/apps/api/app/main.py
git commit -m "feat(api): add exports router with POST /api/exports/tax-report"
```

---

### Task 4: Wire Frontend Export Buttons

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:794-799,1152-1154`

Wire the two existing Export buttons to POST data to the API and trigger a browser PDF download.

**Step 1: Add the export handler function**

In `helio/apps/web/src/app/chat/page.tsx`, inside the `ChatPage` component (after the existing state declarations around line ~340), add an export handler:

```typescript
  /* ── PDF export ── */
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (isExporting || !dashboardData) return;
    setIsExporting(true);

    try {
      // Build client info from clientDetail
      const clientInfo = clientDetail
        ? {
            first_name: clientDetail.first_name,
            last_name: clientDetail.last_name,
            email: clientDetail.email,
            ni_number: clientDetail.ni_number,
            date_of_birth: clientDetail.date_of_birth,
          }
        : { first_name: "Client", last_name: "" };

      const res = await fetch(`${API_BASE}/api/exports/tax-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: clientInfo,
          tax_position: dashboardData.taxPosition || {
            tax_year: clientDetail?.tax_profile ? "2024/25" : "2024/25",
            total_income: dashboardData.incomeSummary?.totalIncome || 0,
            adjusted_net_income: dashboardData.adjustedNetIncome?.amount || 0,
            taxable_income: 0,
            income_tax: dashboardData.taxCalculation?.totalIncomeTax || 0,
            national_insurance:
              (dashboardData.nationalInsurance?.class1 || 0) +
              (dashboardData.nationalInsurance?.class2 || 0) +
              (dashboardData.nationalInsurance?.class4 || 0),
            dividend_tax: 0,
            total_tax: dashboardData.taxCalculation?.totalTax || 0,
            effective_rate: dashboardData.taxCalculation?.effectiveRate || 0,
            marginal_rate: dashboardData.taxCalculation?.marginalRate || 0,
            personal_allowance: 12570,
            pa_status: dashboardData.adjustedNetIncome?.personalAllowanceStatus || "full",
            hicbc_applies: !!dashboardData.hicbc?.applies,
            hicbc_charge: dashboardData.hicbc?.charge || 0,
          },
          dashboard_data: dashboardData,
          scenarios: scenariosList.length > 0 ? scenariosList : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || "helio-tax-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, dashboardData, clientDetail, scenariosList]);
```

**Step 2: Wire the client card Export button (line ~797)**

Replace the client card "Export summary" button (around line 797-799):

From:
```tsx
<button className="flex-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 py-2 rounded-lg transition-colors text-center">
  Export summary
</button>
```

To:
```tsx
<button
  onClick={handleExport}
  disabled={isExporting || !dashboardData}
  className="flex-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 py-2 rounded-lg transition-colors text-center disabled:opacity-40"
>
  {isExporting ? "Exporting..." : "Export summary"}
</button>
```

**Step 3: Wire the panel header Export button (line ~1152)**

Replace the panel header "Export" button (around line 1152-1154):

From:
```tsx
<button className="text-[11px] font-light text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors">
  Export <IconArrowRight className="w-2.5 h-2.5" />
</button>
```

To:
```tsx
<button
  onClick={handleExport}
  disabled={isExporting || !dashboardData}
  className="text-[11px] font-light text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors disabled:opacity-40"
>
  {isExporting ? "Exporting..." : "Export"} <IconArrowRight className="w-2.5 h-2.5" />
</button>
```

**Step 4: Test manually**

1. Start the API: `cd helio/apps/api && uvicorn app.main:app --reload`
2. Start the web app: `cd helio/apps/web && npm run dev`
3. Open the chat, select a client, ask a tax question to generate dashboard data
4. Click either Export button — a PDF should download
5. Open the PDF — verify it has the cover page, all sections, colors, and proper formatting

**Step 5: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): wire export buttons to PDF generation API"
```

---

### Task 5: Handle tax computation message data for export

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx`

The `dashboardData` from `useChat` has the dashboard shape, but the Export also needs `taxPosition` data (which comes from `computationData` on chat messages). Ensure the export can use the most recent computation data from messages.

**Step 1: Update the export handler to prefer computationData**

In the `handleExport` function, before building `tax_position`, find the latest message with `computationData`:

```typescript
  const handleExport = useCallback(async () => {
    if (isExporting || !dashboardData) return;
    setIsExporting(true);

    try {
      const clientInfo = clientDetail
        ? {
            first_name: clientDetail.first_name,
            last_name: clientDetail.last_name,
            email: clientDetail.email,
            ni_number: clientDetail.ni_number,
            date_of_birth: clientDetail.date_of_birth,
          }
        : { first_name: "Client", last_name: "" };

      // Find the latest message with computation data
      const latestComputation = [...messages].reverse().find((m) => m.computationData);
      const comp = latestComputation?.computationData;

      const taxPosition = comp?.taxPosition || {
        tax_year: "2024/25",
        total_income: dashboardData.incomeSummary?.totalIncome || 0,
        adjusted_net_income: dashboardData.adjustedNetIncome?.amount || 0,
        taxable_income: 0,
        income_tax: dashboardData.taxCalculation?.totalIncomeTax || 0,
        national_insurance:
          (dashboardData.nationalInsurance?.class1 || 0) +
          (dashboardData.nationalInsurance?.class2 || 0) +
          (dashboardData.nationalInsurance?.class4 || 0),
        dividend_tax: 0,
        total_tax: dashboardData.taxCalculation?.totalTax || 0,
        effective_rate: dashboardData.taxCalculation?.effectiveRate || 0,
        marginal_rate: dashboardData.taxCalculation?.marginalRate || 0,
        personal_allowance: 12570,
        pa_status: dashboardData.adjustedNetIncome?.personalAllowanceStatus || "full",
        hicbc_applies: !!dashboardData.hicbc?.applies,
        hicbc_charge: dashboardData.hicbc?.charge || 0,
      };

      const res = await fetch(`${API_BASE}/api/exports/tax-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: clientInfo,
          tax_position: taxPosition,
          dashboard_data: comp?.dashboardData || dashboardData,
          scenarios: scenariosList.length > 0 ? scenariosList : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || "helio-tax-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, dashboardData, clientDetail, scenariosList, messages]);
```

Note: Add `messages` to the dependency array.

**Step 2: Test manually**

1. Ask a tax question that triggers `compute_tax_position`
2. Click Export — verify the PDF contains the exact computed figures from the engine

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): use computation data from messages for PDF export"
```

---

## Summary

| Task | Description | New Files |
|------|-------------|-----------|
| 1 | Install ReportLab | — |
| 2 | PDF report service | `pdf_report.py`, `test_pdf_report.py` |
| 3 | Exports API router | `exports.py`, `test_exports.py` |
| 4 | Wire frontend buttons | — |
| 5 | Use computation data | — |
