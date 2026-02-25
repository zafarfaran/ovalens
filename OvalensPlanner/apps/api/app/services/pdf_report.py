"""PDF report generation service for Ovalens tax advisory reports.

Generates professional, coloured A4 tax advisory reports using ReportLab's
platypus layout engine.  The main entry point is ``generate_tax_report()``.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any

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

# ---------------------------------------------------------------------------
# Brand palette
# ---------------------------------------------------------------------------
BRAND_PRIMARY = colors.HexColor("#5C7CFA")
BRAND_DARK = colors.HexColor("#364FC7")
COLOR_GREEN = colors.HexColor("#40C057")
COLOR_AMBER = colors.HexColor("#FD7E14")
COLOR_RED = colors.HexColor("#FA5252")
ROW_ALT = colors.HexColor("#F8F9FA")
WHITE = colors.white
BLACK = colors.black

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt(value: float | int | str | None, prefix: str = "\u00a3", decimals: int = 2) -> str:
    """Format a monetary value with thousands separator."""
    if value is None:
        return "\u2014"
    if isinstance(value, str):
        try:
            value = float(value)
        except (ValueError, TypeError):
            return str(value)
    if decimals == 0:
        return f"{prefix}{value:,.0f}"
    return f"{prefix}{value:,.{decimals}f}"


def _pct(value: float | int | str | None) -> str:
    """Format a percentage value."""
    if value is None:
        return "\u2014"
    if isinstance(value, str):
        try:
            value = float(value)
        except (ValueError, TypeError):
            return str(value)
    return f"{value:.1f}%"


def _styles() -> dict[str, ParagraphStyle]:
    """Build a dict of named ParagraphStyles for the report."""
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "OvalensBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
        ),
        "body_bold": ParagraphStyle(
            "OvalensBodyBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
        ),
        "body_right": ParagraphStyle(
            "OvalensBodyRight",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=10,
            leading=13,
            alignment=TA_RIGHT,
        ),
        "body_right_bold": ParagraphStyle(
            "OvalensBodyRightBold",
            parent=base["Normal"],
            fontName="Courier-Bold",
            fontSize=10,
            leading=13,
            alignment=TA_RIGHT,
        ),
        "body_right_green": ParagraphStyle(
            "OvalensBodyRightGreen",
            parent=base["Normal"],
            fontName="Courier-Bold",
            fontSize=10,
            leading=13,
            alignment=TA_RIGHT,
            textColor=COLOR_GREEN,
        ),
        "section_header": ParagraphStyle(
            "OvalensSectionHeader",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=WHITE,
            spaceBefore=6,
            spaceAfter=2,
            leftIndent=6,
        ),
        "cover_brand": ParagraphStyle(
            "OvalensCoverBrand",
            fontName="Helvetica-Bold",
            fontSize=42,
            leading=50,
            textColor=BRAND_PRIMARY,
            alignment=TA_CENTER,
        ),
        "cover_title": ParagraphStyle(
            "OvalensCoverTitle",
            fontName="Helvetica",
            fontSize=28,
            leading=34,
            textColor=BLACK,
            alignment=TA_CENTER,
        ),
        "cover_client": ParagraphStyle(
            "OvalensCoverClient",
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=26,
            textColor=BRAND_DARK,
            alignment=TA_CENTER,
        ),
        "cover_sub": ParagraphStyle(
            "OvalensCoverSub",
            fontName="Helvetica",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#868E96"),
            alignment=TA_CENTER,
        ),
        "cover_conf": ParagraphStyle(
            "OvalensCoverConf",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=COLOR_RED,
            alignment=TA_CENTER,
        ),
        "card_title": ParagraphStyle(
            "OvalensCardTitle",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
        ),
        "card_body": ParagraphStyle(
            "OvalensCardBody",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#495057"),
        ),
    }


# ---------------------------------------------------------------------------
# Section header as a coloured bar
# ---------------------------------------------------------------------------

def _section_header(title: str, styles: dict[str, ParagraphStyle]) -> Table:
    """Return a section header rendered as a coloured bar with white text."""
    para = Paragraph(title, styles["section_header"])
    tbl = Table([[para]], colWidths=[PAGE_W - 2 * MARGIN])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PRIMARY),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return tbl


# ---------------------------------------------------------------------------
# Generic key-value table with alternating rows
# ---------------------------------------------------------------------------

def _kv_table(
    rows: list[tuple[str, str]],
    styles: dict[str, ParagraphStyle],
    *,
    bold_last: bool = False,
    col_widths: tuple[float, float] | None = None,
) -> Table:
    """Build a two-column key-value table with alternating row shading."""
    available = PAGE_W - 2 * MARGIN
    if col_widths is None:
        col_widths = (available * 0.45, available * 0.55)

    data = []
    for i, (k, v) in enumerate(rows):
        is_last = i == len(rows) - 1
        k_style = styles["body_bold"] if (bold_last and is_last) else styles["body"]
        v_style = styles["body_right_bold"] if (bold_last and is_last) else styles["body_right"]
        data.append([Paragraph(k, k_style), Paragraph(v, v_style)])

    tbl = Table(data, colWidths=list(col_widths))
    cmds: list[Any] = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DEE2E6")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    # Alternating row shading
    for i in range(len(data)):
        bg = WHITE if i % 2 == 0 else ROW_ALT
        cmds.append(("BACKGROUND", (0, i), (-1, i), bg))

    tbl.setStyle(TableStyle(cmds))
    return tbl


# ---------------------------------------------------------------------------
# Multi-column data table
# ---------------------------------------------------------------------------

def _data_table(
    header: list[str],
    rows: list[list[str]],
    styles: dict[str, ParagraphStyle],
    *,
    col_widths: list[float] | None = None,
    bold_last: bool = False,
    green_col: int | None = None,
) -> Table:
    """Build a multi-column data table with header row and alternating shading."""
    available = PAGE_W - 2 * MARGIN
    if col_widths is None:
        n = len(header)
        col_widths = [available / n] * n

    # Header row
    hdr = [Paragraph(f"<b>{h}</b>", styles["body"]) for h in header]
    data = [hdr]

    for i, row in enumerate(rows):
        is_last = i == len(rows) - 1
        formatted: list[Any] = []
        for j, cell in enumerate(row):
            if j == 0:
                st = styles["body_bold"] if (bold_last and is_last) else styles["body"]
            elif green_col is not None and j == green_col and not (bold_last and is_last):
                st = styles["body_right_green"]
            elif bold_last and is_last:
                st = styles["body_right_bold"]
            else:
                st = styles["body_right"]
            formatted.append(Paragraph(cell, st))
        data.append(formatted)

    tbl = Table(data, colWidths=col_widths)
    cmds: list[Any] = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DEE2E6")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E9ECEF")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    # Alternating shading on data rows (skip header)
    for i in range(1, len(data)):
        bg = WHITE if i % 2 == 1 else ROW_ALT
        cmds.append(("BACKGROUND", (0, i), (-1, i), bg))

    tbl.setStyle(TableStyle(cmds))
    return tbl


# ---------------------------------------------------------------------------
# Observation card
# ---------------------------------------------------------------------------

def _observation_card(
    obs: dict,
    styles: dict[str, ParagraphStyle],
) -> Table:
    """Render a single observation as a coloured card."""
    severity = obs.get("severity", "info").lower()
    if severity in ("opportunity", "green"):
        accent = COLOR_GREEN
    elif severity in ("warning", "amber"):
        accent = COLOR_AMBER
    elif severity in ("critical", "red", "alert"):
        accent = COLOR_RED
    else:
        accent = BRAND_PRIMARY

    title = obs.get("title", "Observation")
    desc = obs.get("description", "")
    saving = obs.get("potential_saving") or obs.get("potentialSaving")
    action = obs.get("action", "")

    parts: list[str] = []
    if desc:
        parts.append(desc)
    if saving is not None:
        parts.append(f"<b>Potential saving:</b> {_fmt(saving)}")
    if action:
        parts.append(f"<b>Action:</b> {action}")

    body_text = "<br/>".join(parts)

    title_para = Paragraph(title, styles["card_title"])
    body_para = Paragraph(body_text, styles["card_body"])

    available = PAGE_W - 2 * MARGIN
    inner = Table(
        [[title_para], [body_para]],
        colWidths=[available - 12],
    )
    inner.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))

    # Wrap with left accent border
    card = Table([[inner]], colWidths=[available])
    card.setStyle(TableStyle([
        ("LINEBEFOREDECOR", (0, 0), (0, -1), 4, accent),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8F9FA")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    return card


# ---------------------------------------------------------------------------
# Page footers / headers
# ---------------------------------------------------------------------------

def _footer(canvas: Any, doc: Any, generated_date: str) -> None:
    """Draw the page footer on body pages."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#868E96"))
    footer_text = f"Generated by Ovalens \u00b7 {generated_date}  |  Page {doc.page}"
    canvas.drawCentredString(PAGE_W / 2, MARGIN - 10 * mm, footer_text)
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Main public API
# ---------------------------------------------------------------------------

def generate_tax_report(
    *,
    client: dict,
    tax_position: dict,
    dashboard_data: dict,
    scenarios: list[dict] | None = None,
    ai_observations: list[dict] | None = None,
    meeting_notes: list[dict] | None = None,
) -> io.BytesIO:
    """Generate a professional A4 tax advisory PDF and return it as a BytesIO buffer.

    Parameters
    ----------
    client:
        Client information dict with keys such as ``name``, ``email``,
        ``niNumber``, ``utr``, ``dob``, ``region``, ``employmentStatus``.
    tax_position:
        Tax position summary (``taxYear``, etc.).
    dashboard_data:
        Full dashboard computation data including ``incomeSummary``,
        ``taxCalculation``, ``nationalInsurance``, ``hicbc``,
        ``adjustedNetIncome``, ``observations``, etc.
    scenarios:
        Optional list of scenario comparison dicts.

    Returns
    -------
    io.BytesIO
        A seeked-to-zero buffer containing the PDF bytes.
    """
    buf = io.BytesIO()
    st = _styles()
    now = datetime.now(timezone.utc)
    generated_date = now.strftime("%d %B %Y, %H:%M UTC")
    tax_year = tax_position.get("tax_year", tax_position.get("taxYear", dashboard_data.get("tax_year", "2024/25")))
    client_name = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip() or client.get("name", "Client")

    # ------------------------------------------------------------------
    # Document setup
    # ------------------------------------------------------------------
    body_frame = Frame(
        MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN,
        id="body",
    )
    cover_frame = Frame(
        MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN,
        id="cover",
    )

    def body_on_page(canvas: Any, doc: Any) -> None:
        _footer(canvas, doc, generated_date)

    cover_template = PageTemplate(id="cover", frames=[cover_frame])
    body_template = PageTemplate(id="body", frames=[body_frame], onPage=body_on_page)

    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"Ovalens Tax Advisory Report - {client_name}",
        author="Ovalens",
    )
    doc.addPageTemplates([cover_template, body_template])

    story: list[Any] = []

    # ------------------------------------------------------------------
    # COVER PAGE
    # ------------------------------------------------------------------
    story.append(Spacer(1, 6 * cm))
    story.append(Paragraph("HELIO", st["cover_brand"]))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph("Tax Advisory Report", st["cover_title"]))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(client_name, st["cover_client"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(f"Tax Year {tax_year}", st["cover_sub"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"Generated {generated_date}", st["cover_sub"]))
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph("CONFIDENTIAL", st["cover_conf"]))

    # Switch to body template for subsequent pages
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    # ------------------------------------------------------------------
    # 1. CLIENT INFORMATION
    # ------------------------------------------------------------------
    story.append(_section_header("Client Information", st))
    story.append(Spacer(1, 4 * mm))

    client_fields = [
        ("Name", None),  # handled separately
        ("Email", "email"),
        ("NI Number", "ni_number"),
        ("UTR", "utr"),
        ("Date of Birth", "date_of_birth"),
        ("Region", "region"),
        ("Employment Status", "employment_status"),
    ]
    client_rows = [("Name", client_name)]
    for label, key in client_fields:
        if key is None:
            continue
        val = client.get(key)
        if val:
            client_rows.append((label, str(val)))
    if client_rows:
        story.append(_kv_table(client_rows, st))
    story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 2. INCOME SUMMARY
    # ------------------------------------------------------------------
    income_summary = dashboard_data.get("incomeSummary", {})
    sources = income_summary.get("sources", [])
    if sources:
        story.append(_section_header("Income Summary", st))
        story.append(Spacer(1, 4 * mm))

        income_rows = [(s.get("label", ""), _fmt(s.get("amount", 0))) for s in sources]
        total_gross = income_summary.get("totalIncome", income_summary.get("totalGrossIncome", sum(
            s.get("amount", 0) for s in sources
        )))
        income_rows.append(("Total Gross Income", _fmt(total_gross)))
        story.append(_kv_table(income_rows, st, bold_last=True))
        story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 3. INCOME TAX BREAKDOWN
    # ------------------------------------------------------------------
    tax_calc = dashboard_data.get("taxCalculation", {})
    bands = tax_calc.get("incomeTaxByBand", [])
    non_zero_bands = [b for b in bands if b.get("tax", 0) != 0 or b.get("amount", b.get("income", 0)) != 0]

    if non_zero_bands:
        story.append(_section_header("Income Tax Breakdown", st))
        story.append(Spacer(1, 4 * mm))

        available = PAGE_W - 2 * MARGIN
        band_rows = []
        for b in non_zero_bands:
            band_rows.append([
                b.get("band", ""),
                _fmt(b.get("amount", b.get("income", 0))),
                _pct(b.get("rate", 0)),
                _fmt(b.get("tax", 0)),
            ])

        total_income_tax = tax_calc.get("totalIncomeTax", sum(
            b.get("tax", 0) for b in non_zero_bands
        ))
        band_rows.append(["Total Income Tax", "", "", _fmt(total_income_tax)])

        story.append(_data_table(
            ["Band", "Income", "Rate", "Tax"],
            band_rows,
            st,
            col_widths=[available * 0.30, available * 0.25, available * 0.15, available * 0.30],
            bold_last=True,
        ))

        # Dividend tax
        dividend_tax = tax_calc.get("dividendTax", 0)
        if dividend_tax and float(dividend_tax) > 0:
            story.append(Spacer(1, 3 * mm))
            story.append(Paragraph(
                f"Dividend Tax: {_fmt(dividend_tax)}", st["body_bold"],
            ))

        story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 4. NATIONAL INSURANCE
    # ------------------------------------------------------------------
    ni_data = dashboard_data.get("nationalInsurance", {})
    ni_total = (
        float(ni_data.get("class1", 0) or 0)
        + float(ni_data.get("class2", 0) or 0)
        + float(ni_data.get("class4", 0) or 0)
    )

    if ni_total and float(ni_total) > 0:
        story.append(_section_header("National Insurance", st))
        story.append(Spacer(1, 4 * mm))

        ni_rows: list[tuple[str, str]] = []
        for key, label in [("class1", "Class 1"), ("class2", "Class 2"), ("class4", "Class 4")]:
            val = ni_data.get(key, 0)
            if val and float(val) > 0:
                ni_rows.append((label, _fmt(val)))
        ni_rows.append(("Total National Insurance", _fmt(ni_total)))

        story.append(_kv_table(ni_rows, st, bold_last=True))
        story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 5. ADJUSTED NET INCOME & PERSONAL ALLOWANCE
    # ------------------------------------------------------------------
    ani_data = dashboard_data.get("adjustedNetIncome", {})
    if ani_data:
        story.append(_section_header("Adjusted Net Income &amp; Personal Allowance", st))
        story.append(Spacer(1, 4 * mm))

        ani_rows: list[tuple[str, str]] = []

        tp_total_income = tax_position.get("total_income")
        if tp_total_income is not None:
            ani_rows.append(("Total Income", _fmt(tp_total_income)))

        tp_adjusted = tax_position.get("adjusted_net_income", ani_data.get("amount"))
        if tp_total_income and tp_adjusted and float(tp_total_income) != float(tp_adjusted):
            deductions = float(tp_total_income) - float(tp_adjusted)
            ani_rows.append(("Less deductions (pension, Gift Aid)", f"\u2212{_fmt(deductions)}"))

        if tp_adjusted is not None:
            ani_rows.append(("Adjusted Net Income", _fmt(tp_adjusted)))

        pa_amount = tax_position.get("personal_allowance", ani_data.get("personalAllowance"))
        pa_status = tax_position.get("pa_status", ani_data.get("personalAllowanceStatus", ""))
        if pa_amount is not None:
            pa_label = "Personal Allowance"
            if pa_status:
                pa_label += f" ({pa_status.capitalize()})"
            ani_rows.append((pa_label, _fmt(pa_amount)))

        if ani_rows:
            story.append(_kv_table(ani_rows, st))
        story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 6. HICBC (conditional)
    # ------------------------------------------------------------------
    hicbc_data = dashboard_data.get("hicbc", {})
    if hicbc_data.get("applies"):
        story.append(_section_header("High Income Child Benefit Charge", st))
        story.append(Spacer(1, 4 * mm))

        hicbc_rows: list[tuple[str, str]] = []
        annual = hicbc_data.get("childBenefitAnnual", hicbc_data.get("annualBenefit"))
        if annual is not None:
            hicbc_rows.append(("Child Benefit (Annual)", _fmt(annual)))

        clawback = hicbc_data.get("clawbackPercentage", hicbc_data.get("clawbackPercent"))
        if clawback is not None:
            hicbc_rows.append(("Clawback", _pct(clawback)))

        charge = hicbc_data.get("charge", hicbc_data.get("hicbcCharge"))
        if charge is not None:
            hicbc_rows.append(("HICBC Charge", _fmt(charge)))

        net = hicbc_data.get("netBenefit")
        if net is not None:
            hicbc_rows.append(("Net Benefit", _fmt(net)))

        if hicbc_rows:
            story.append(_kv_table(hicbc_rows, st))
        story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 7. TAX SUMMARY
    # ------------------------------------------------------------------
    # Use tax_position as primary source; fall back to dashboard_data
    income_tax_total = tax_position.get(
        "income_tax",
        tax_calc.get("totalIncomeTax", 0),
    )
    ni_for_summary = tax_position.get("national_insurance", ni_total or 0)
    hicbc_charge = 0
    if hicbc_data.get("applies"):
        hicbc_charge = hicbc_data.get("charge", hicbc_data.get("hicbcCharge", 0)) or 0
    hicbc_for_summary = tax_position.get("hicbc_charge", hicbc_charge)
    total_tax = tax_position.get(
        "total_tax",
        (float(income_tax_total or 0)
         + float(ni_for_summary or 0)
         + float(hicbc_for_summary or 0)),
    )
    effective_rate = tax_position.get(
        "effective_rate",
        tax_calc.get("effectiveRate"),
    )
    marginal_rate = tax_position.get(
        "marginal_rate",
        tax_calc.get("marginalRate"),
    )

    story.append(_section_header("Tax Summary", st))
    story.append(Spacer(1, 4 * mm))

    summary_rows: list[tuple[str, str]] = [
        ("Income Tax", _fmt(income_tax_total)),
        ("National Insurance", _fmt(ni_for_summary)),
    ]
    if float(hicbc_for_summary or 0) > 0:
        summary_rows.append(("HICBC", _fmt(hicbc_for_summary)))
    summary_rows.append(("Total Tax", _fmt(total_tax)))

    story.append(_kv_table(summary_rows, st, bold_last=True))
    story.append(Spacer(1, 4 * mm))

    # Highlighted rates box
    if effective_rate is not None or marginal_rate is not None:
        rate_parts: list[str] = []
        if effective_rate is not None:
            rate_parts.append(f"<b>Effective Rate:</b> {_pct(effective_rate)}")
        if marginal_rate is not None:
            rate_parts.append(f"<b>Marginal Rate:</b> {_pct(marginal_rate)}")
        rate_text = "&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;".join(rate_parts)

        rate_para = Paragraph(rate_text, st["body"])
        rate_box = Table([[rate_para]], colWidths=[PAGE_W - 2 * MARGIN])
        rate_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EDF2FF")),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(rate_box)

    story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 8. ALLOWANCES TRACKER
    # ------------------------------------------------------------------
    allowances_data = dashboard_data.get("allowancesTracker", {})
    allowances_list = allowances_data.get("allowances", [])
    if allowances_list:
        story.append(_section_header("Allowances Tracker", st))
        story.append(Spacer(1, 4 * mm))

        available = PAGE_W - 2 * MARGIN
        allow_rows = []
        for a in allowances_list:
            name = a.get("name", a.get("type", ""))
            limit = a.get("annualLimit", a.get("annual_limit", 0))
            used = a.get("used", 0)
            remaining = a.get("remaining", limit - used if limit else 0)
            status = a.get("status", "")
            allow_rows.append([
                name,
                _fmt(limit, decimals=0),
                _fmt(used, decimals=0),
                _fmt(remaining, decimals=0),
                status.capitalize() if status else "",
            ])

        story.append(_data_table(
            ["Allowance", "Annual Limit", "Used", "Remaining", "Status"],
            allow_rows,
            st,
            col_widths=[
                available * 0.28,
                available * 0.18,
                available * 0.18,
                available * 0.18,
                available * 0.18,
            ],
        ))
        story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # 9. OBSERVATIONS & RECOMMENDATIONS
    # ------------------------------------------------------------------
    observations = dashboard_data.get("observations", [])
    if observations:
        story.append(_section_header("Engine Observations", st))
        story.append(Spacer(1, 4 * mm))

        for obs in observations:
            story.append(_observation_card(obs, st))
            story.append(Spacer(1, 3 * mm))

        story.append(Spacer(1, 5 * mm))

    # ------------------------------------------------------------------
    # 10. AI ADVISORY OBSERVATIONS
    # ------------------------------------------------------------------
    if ai_observations:
        story.append(_section_header("AI Advisory Insights", st))
        story.append(Spacer(1, 4 * mm))

        for obs in ai_observations:
            story.append(_observation_card(obs, st))
            story.append(Spacer(1, 3 * mm))

        story.append(Spacer(1, 5 * mm))

    # ------------------------------------------------------------------
    # 11. MEETING NOTES
    # ------------------------------------------------------------------
    if meeting_notes:
        story.append(_section_header("Meeting Notes", st))
        story.append(Spacer(1, 4 * mm))

        for note in meeting_notes:
            subject = note.get("subject", "Meeting")
            date_str = note.get("meeting_date", "")
            if date_str:
                try:
                    from datetime import datetime as _dt
                    dt = _dt.fromisoformat(date_str.replace("Z", "+00:00"))
                    date_str = dt.strftime("%d %B %Y")
                except (ValueError, TypeError):
                    pass

            summary = note.get("summary", "")
            attendees = note.get("attendees", "")
            action_items = note.get("action_items") or []
            tags = note.get("tags") or []

            # Build note card content
            parts: list[str] = []
            if date_str:
                parts.append(f"<b>Date:</b> {date_str}")
            if attendees:
                parts.append(f"<b>Attendees:</b> {attendees}")
            if summary:
                parts.append(summary)
            if action_items:
                actions_str = " &bull; ".join(action_items)
                parts.append(f"<b>Actions:</b> {actions_str}")
            if tags:
                parts.append(f"<b>Topics:</b> {', '.join(tags)}")

            body_text = "<br/>".join(parts)

            title_para = Paragraph(subject, st["card_title"])
            body_para = Paragraph(body_text, st["card_body"])

            available = PAGE_W - 2 * MARGIN
            inner = Table(
                [[title_para], [body_para]],
                colWidths=[available - 12],
            )
            inner.setStyle(TableStyle([
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))

            card = Table([[inner]], colWidths=[available])
            card.setStyle(TableStyle([
                ("LINEBEFOREDECOR", (0, 0), (0, -1), 4, BRAND_PRIMARY),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8F9FA")),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("ROUNDEDCORNERS", [4, 4, 4, 4]),
            ]))
            story.append(card)
            story.append(Spacer(1, 3 * mm))

        story.append(Spacer(1, 5 * mm))

    # ------------------------------------------------------------------
    # 12. SCENARIO COMPARISONS (conditional)
    # ------------------------------------------------------------------
    if scenarios:
        story.append(_section_header("Scenario Comparisons", st))
        story.append(Spacer(1, 4 * mm))

        available = PAGE_W - 2 * MARGIN

        for sc in scenarios:
            sc_name = sc.get("name", "Scenario")
            sc_desc = sc.get("description", "")
            story.append(Paragraph(f"<b>{sc_name}</b>", st["body_bold"]))
            if sc_desc:
                story.append(Spacer(1, 1 * mm))
                story.append(Paragraph(sc_desc, st["card_body"]))
            story.append(Spacer(1, 3 * mm))

            current = sc.get("current", {})
            proposed = sc.get("proposed", {})
            savings = sc.get("savings", {})

            # Main comparison table — Current vs Proposed vs Saving
            comparison_fields = [
                ("Gross Salary", "gross_salary", None),
                ("Salary Sacrifice", "sacrifice", None),
                ("Income Tax", "income_tax", "income_tax"),
                ("National Insurance", "national_insurance", "national_insurance"),
                ("HICBC", "hicbc", "hicbc_avoided"),
                ("Personal Allowance", "personal_allowance", None),
                ("Total Tax", "total_tax", "total"),
            ]

            comp_rows = []
            for label, key, sav_key in comparison_fields:
                cur_val = current.get(key)
                prop_val = proposed.get(key)
                if cur_val is None and prop_val is None:
                    continue
                cur_num = float(cur_val or 0)
                prop_num = float(prop_val or 0)

                # Use the savings object for the saving column when available
                if sav_key and savings.get(sav_key) is not None:
                    sav_num = float(savings[sav_key])
                    sav_str = _fmt(sav_num) if sav_num > 0 else ""
                elif key == "personal_allowance":
                    # PA goes up when sacrifice increases — show the increase
                    diff = prop_num - cur_num
                    sav_str = f"+{_fmt(diff, decimals=0)}" if diff > 0 else ""
                else:
                    sav_str = ""

                comp_rows.append([
                    label,
                    _fmt(cur_num),
                    _fmt(prop_num),
                    sav_str,
                ])

            if comp_rows:
                story.append(_data_table(
                    ["", "Current", "Proposed", "Saving"],
                    comp_rows,
                    st,
                    col_widths=[
                        available * 0.28,
                        available * 0.24,
                        available * 0.24,
                        available * 0.24,
                    ],
                    green_col=3,
                    bold_last=True,
                ))

            # Total savings highlight box
            total_saving = float(savings.get("total", 0))
            if total_saving > 0:
                story.append(Spacer(1, 3 * mm))
                saving_para = Paragraph(
                    f"<b>Total Annual Tax Saving: {_fmt(total_saving)}</b>",
                    ParagraphStyle(
                        "SavingHighlight",
                        fontName="Helvetica-Bold",
                        fontSize=12,
                        leading=16,
                        textColor=COLOR_GREEN,
                        alignment=TA_CENTER,
                    ),
                )
                saving_box = Table([[saving_para]], colWidths=[available])
                saving_box.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EBFBEE")),
                    ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ]))
                story.append(saving_box)

            # Savings breakdown (individual components)
            saving_details: list[str] = []
            if float(savings.get("income_tax", 0)) > 0:
                saving_details.append(
                    f"Income Tax: {_fmt(savings['income_tax'])}"
                )
            if float(savings.get("national_insurance", 0)) > 0:
                saving_details.append(
                    f"National Insurance: {_fmt(savings['national_insurance'])}"
                )
            if float(savings.get("hicbc_avoided", 0)) > 0:
                saving_details.append(
                    f"HICBC Avoided: {_fmt(savings['hicbc_avoided'])}"
                )
            if saving_details:
                story.append(Spacer(1, 2 * mm))
                story.append(Paragraph(
                    "Savings breakdown: " + " &nbsp;|&nbsp; ".join(saving_details),
                    st["card_body"],
                ))

            # Personal allowance change
            pa_change = sc.get("pa_change", {})
            pa_restored = float(pa_change.get("restored", 0))
            if pa_restored > 0:
                story.append(Spacer(1, 2 * mm))
                story.append(Paragraph(
                    f"Personal allowance restored: {_fmt(pa_restored, decimals=0)} "
                    f"({_fmt(pa_change.get('current', 0), decimals=0)} "
                    f"\u2192 {_fmt(pa_change.get('proposed', 0), decimals=0)})",
                    st["body"],
                ))

            # Extra into pension
            extra_pension = sc.get("extra_into_pension", 0)
            if extra_pension and float(extra_pension) > 0:
                story.append(Spacer(1, 2 * mm))
                story.append(Paragraph(
                    f"Extra directed into pension: <b>{_fmt(extra_pension)}</b>",
                    st["body"],
                ))

            story.append(Spacer(1, 8 * mm))

    # ------------------------------------------------------------------
    # Build
    # ------------------------------------------------------------------
    doc.build(story)
    buf.seek(0)
    return buf
