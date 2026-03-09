"""Fake integration sync — connect an integration and seed demo clients into the local DB."""

import random
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.db.engine import get_db_session
from app.db.models import Client, Household, MeetingNote, Observation, TaxProfile
from app.dependencies import get_current_user, get_request_logger
from app.tax.engine import compute_full_tax_position
from app.tax.types import IncomeSource, IncomeType
from app.utils.tax_year import get_default_tax_year

router = APIRouter(tags=["integrations"])


def _client(
    first_name: str,
    last_name: str,
    email: str,
    dob: str,
    ni: str,
    utr: str,
    employment_gross: float,
    pension: float,
) -> dict:
    """Short helper for clients with employment-only income and standard address."""
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "date_of_birth": dob,
        "ni_number": ni,
        "utr": utr,
        "region": "england",
        "employment_status": "employed",
        "phone": None,
        "address_line_1": "1 High Street",
        "address_line_2": None,
        "city": "London",
        "postcode": "E1 6AN",
        "marital_status": None,
        "number_of_children": 0,
        "claims_child_benefit": False,
        "employer_name": f"{last_name} Ltd",
        "company_name": None,
        "company_number": None,
        "notes": None,
        "tax": {
            "income_sources": [{"type": "employment", "gross_amount": employment_gross, "label": "Employment"}],
            "pension_contributions": pension,
            "gift_aid": 0.0,
        },
    }


# Default tax inputs for building a TaxProfile when no "tax" key in payload
_DEFAULT_TAX = {
    "income_sources": [{"type": "employment", "gross_amount": 45000.0, "label": "Employment"}],
    "pension_contributions": 3000.0,
    "gift_aid": 0.0,
}

# Demo client payloads per integration: full contact/personal/professional + tax data.
# Unique emails so we can skip duplicates on re-sync.
# "tax" keys: income_sources (list of {type, gross_amount, label}), pension_contributions, gift_aid.
# number_of_children / claims_child_benefit on the client are used by the engine.
INTEGRATION_CLIENTS: dict[str, list[dict]] = {
    "intelliflo": [
        {
            "first_name": "James",
            "last_name": "Mitchell",
            "email": "james.mitchell@outlook.com",
            "date_of_birth": "1975-03-12",
            "ni_number": "AB123456C",
            "utr": "1234567890",
            "region": "england",
            "employment_status": "employed",
            "phone": "07700 900123",
            "address_line_1": "42 Oak Lane",
            "address_line_2": "Flat 2",
            "city": "London",
            "postcode": "SW1A 1AA",
            "marital_status": "married",
            "number_of_children": 2,
            "claims_child_benefit": True,
            "employer_name": "Mitchell & Co Ltd",
            "company_name": None,
            "company_number": None,
            "notes": "Portfolio review Q1. ISA maxed.",
            "tax": {
                "income_sources": [
                    {"type": "employment", "gross_amount": 62000.0, "label": "Salary"},
                    {"type": "savings", "gross_amount": 1200.0, "label": "Interest"},
                ],
                "pension_contributions": 6000.0,
                "gift_aid": 400.0,
            },
        },
        {
            "first_name": "Sarah",
            "last_name": "Chen",
            "email": "sarah.chen@btinternet.com",
            "date_of_birth": "1982-07-08",
            "ni_number": "CD234567D",
            "utr": "2345678901",
            "region": "england",
            "employment_status": "employed",
            "phone": "07700 900124",
            "address_line_1": "15 Riverside Way",
            "city": "Manchester",
            "postcode": "M1 1AD",
            "marital_status": "single",
            "number_of_children": 0,
            "claims_child_benefit": False,
            "employer_name": "Tech Solutions Ltd",
            "notes": None,
            "tax": {
                "income_sources": [
                    {"type": "employment", "gross_amount": 52000.0, "label": "Employment"},
                    {"type": "dividends", "gross_amount": 3000.0, "label": "Shareholdings"},
                ],
                "pension_contributions": 5000.0,
                "gift_aid": 0.0,
            },
        },
        {
            "first_name": "Tom",
            "last_name": "Davies",
            "email": "tom.davies@sky.com",
            "date_of_birth": "1968-11-22",
            "ni_number": "EF345678E",
            "utr": "3456789012",
            "region": "wales",
            "employment_status": "retired",
            "phone": "07700 900125",
            "address_line_1": "8 Castle Street",
            "city": "Cardiff",
            "postcode": "CF10 1BT",
            "marital_status": "married",
            "number_of_children": 0,
            "claims_child_benefit": False,
            "employer_name": None,
            "notes": "Drawdown from SIPP.",
            "tax": {
                "income_sources": [
                    {"type": "pension_income", "gross_amount": 28000.0, "label": "SIPP drawdown"},
                    {"type": "savings", "gross_amount": 800.0, "label": "Interest"},
                ],
                "pension_contributions": 0.0,
                "gift_aid": 200.0,
            },
        },
        {
            "first_name": "Emma",
            "last_name": "Wilson",
            "email": "emma.wilson@icloud.com",
            "date_of_birth": "1990-01-15",
            "ni_number": "GH456789F",
            "utr": "4567890123",
            "region": "england",
            "employment_status": "self-employed",
            "phone": "07700 900126",
            "address_line_1": "22 Market Square",
            "city": "Bristol",
            "postcode": "BS1 4ST",
            "marital_status": "single",
            "number_of_children": 1,
            "claims_child_benefit": True,
            "company_name": "Wilson Consulting",
            "company_number": "12345678",
            "notes": None,
            "tax": {
                "income_sources": [
                    {"type": "self_employment", "gross_amount": 48000.0, "label": "Consulting", "expenses": 4000.0},
                ],
                "pension_contributions": 8000.0,
                "gift_aid": 0.0,
            },
        },
        {
            "first_name": "David",
            "last_name": "Brown",
            "email": "david.brown@yahoo.co.uk",
            "date_of_birth": "1972-09-30",
            "ni_number": "IJ567890G",
            "utr": "5678901234",
            "region": "england",
            "employment_status": "director",
            "phone": "07700 900127",
            "address_line_1": "5 The Green",
            "city": "Leeds",
            "postcode": "LS1 4AP",
            "marital_status": "married",
            "number_of_children": 3,
            "claims_child_benefit": True,
            "company_name": "Brown Holdings Ltd",
            "company_number": "87654321",
            "employer_name": "Brown Holdings Ltd",
            "notes": "Director salary + dividends.",
            "tax": {
                "income_sources": [
                    {"type": "employment", "gross_amount": 12000.0, "label": "Director salary"},
                    {"type": "dividends", "gross_amount": 45000.0, "label": "Company dividends"},
                ],
                "pension_contributions": 20000.0,
                "gift_aid": 1000.0,
            },
        },
    ],
    "xero": [
        _client("Rachel", "Green", "rachel.green@gmail.com", "1985-04-20", "JK678901H", "6789012345", 38000.0, 2000.0),
        _client("Michael", "Scott", "michael.scott@outlook.com", "1978-12-05", "KL789012I", "7890123456", 75000.0, 8000.0),
        _client("Lisa", "Thompson", "lisa.thompson@btinternet.com", "1992-06-18", "LM890123J", "8901234567", 41000.0, 4000.0),
    ],
    "hmrc_apis": [
        _client("Andrew", "Taylor", "andrew.taylor@gmail.com", "1980-02-28", "MN901234K", "9012345678", 55000.0, 5000.0),
        _client("Helen", "Clark", "helen.clark@sky.com", "1975-10-11", "NO012345L", "0123456789", 68000.0, 7000.0),
        _client("Peter", "Wright", "peter.wright@yahoo.co.uk", "1965-08-03", "OP123456M", "1123456789", 32000.0, 2000.0),
    ],
    "microsoft_365": [
        _client("Sophie", "Martinez", "sophie.martinez@outlook.com", "1988-05-25", "PQ234567N", "2123456789", 47000.0, 3500.0),
        _client("Chris", "Lee", "chris.lee@gmail.com", "1991-11-09", "QR345678P", "3123456789", 53000.0, 6000.0),
    ],
    "google_workspace": [
        _client("Nina", "Patel", "nina.patel@icloud.com", "1987-07-14", "RS456789Q", "4123456789", 49000.0, 4500.0),
        _client("Mark", "Roberts", "mark.roberts@btinternet.com", "1979-03-01", "ST567890R", "5123456789", 61000.0, 5500.0),
    ],
    "salesforce": [
        _client("Julia", "Adams", "julia.adams@outlook.com", "1983-09-17", "TU678901S", "6123456789", 44000.0, 3000.0),
        _client("Steven", "Hall", "steven.hall@sky.com", "1970-12-22", "UV789012T", "7123456789", 72000.0, 10000.0),
    ],
}


def _build_income_sources(tax: dict) -> list[IncomeSource]:
    raw = tax.get("income_sources", _DEFAULT_TAX["income_sources"])
    out = []
    for s in raw:
        t = s.get("type", "employment")
        try:
            source_type = IncomeType(t)
        except ValueError:
            source_type = IncomeType.EMPLOYMENT
        out.append(
            IncomeSource(
                source_type=source_type,
                gross_amount=float(s.get("gross_amount", 0)),
                label=(s.get("label") or "").strip() or t.replace("_", " ").title(),
                expenses=float(s.get("expenses", 0)),
            )
        )
    return out


def _save_tax_profile_and_observations(
    session: AsyncSession,
    client_id: str,
    client_region: str,
    client_children: int,
    client_claims_cb: bool,
    tax: dict,
    tax_year: str,
) -> None:
    income_sources = _build_income_sources(tax)
    pension = float(tax.get("pension_contributions", 0))
    gift_aid = float(tax.get("gift_aid", 0))

    pos = compute_full_tax_position(
        income_sources,
        pension_contributions=pension,
        gift_aid=gift_aid,
        region=client_region or "england",
        number_of_children=client_children,
        claims_child_benefit=client_claims_cb,
        tax_year=tax_year,
    )

    allowances = [
        {
            "type": "personal_allowance",
            "label": "Personal Allowance",
            "annual_limit": 12570,
            "used": min(pos.total_income, pos.personal_allowance),
            "remaining": max(0, pos.personal_allowance - pos.total_income),
            "status": "fully_used" if pos.total_income >= pos.personal_allowance else "available",
        },
        {
            "type": "pension_aa",
            "label": "Pension Annual Allowance",
            "annual_limit": 60000,
            "used": pension,
            "remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else max(0, 60000 - pension),
        },
        {
            "type": "dividend",
            "label": "Dividend Allowance",
            "annual_limit": 500,
            "used": pos.income_tax_result.dividend_allowance_used,
            "remaining": 500 - pos.income_tax_result.dividend_allowance_used,
        },
        {"type": "isa", "label": "ISA Allowance", "annual_limit": 20000, "used": 0, "remaining": 20000},
        {"type": "cgt_aea", "label": "CGT Annual Exemption", "annual_limit": 3000, "used": 0, "remaining": 3000},
    ]

    tax_profile = TaxProfile(
        client_id=client_id,
        tax_year=pos.tax_year,
        total_income=pos.total_income,
        adjusted_net_income=pos.adjusted_net_income,
        taxable_income=pos.taxable_income,
        income_tax=pos.income_tax,
        national_insurance=pos.national_insurance,
        dividend_tax=pos.dividend_tax,
        total_tax=pos.total_tax,
        effective_rate=pos.effective_rate,
        marginal_rate=pos.marginal_rate,
        personal_allowance=pos.personal_allowance,
        pa_status=pos.pa_status,
        in_pa_taper_zone=pos.in_pa_taper_zone,
        hicbc_applies=pos.hicbc_applies,
        pension_taper_applies=pos.pension_taper_applies,
        income_sources=[
            {
                "source_type": s.source_type.value,
                "label": s.label or s.source_type.value.replace("_", " ").title(),
                "gross_amount": s.gross_amount,
            }
            for s in pos.income_sources
        ],
        pension_data={
            "contributions": pension,
            "aa_remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else max(0, 60000 - pension),
            "annual_allowance": pos.pension_aa_result.annual_allowance if pos.pension_aa_result else 60000,
        },
        allowances=allowances,
        hicbc={
            "number_of_children": client_children,
            "claims_child_benefit": client_claims_cb,
            "child_benefit_amount": pos.hicbc_result.child_benefit_annual if pos.hicbc_result else 0,
            "clawback_percentage": pos.hicbc_result.clawback_percentage if pos.hicbc_result else 0,
            "hicbc_charge": pos.hicbc_result.hicbc_charge if pos.hicbc_result else 0,
        },
        tax_breakdown=[
            {"band": b.name, "amount": b.income_in_band, "rate": b.rate, "tax": b.tax}
            for b in pos.income_tax_result.non_savings_bands
        ],
        ni_breakdown={
            "class1": {
                "total_employee_ni": pos.ni_result.class_1.total_employee_ni if pos.ni_result.class_1 else 0,
            },
            "class2": {
                "annual_ni": pos.ni_result.class_2.annual_ni if pos.ni_result.class_2 else 0,
            },
            "class4": {
                "total_ni": pos.ni_result.class_4.total_ni if pos.ni_result.class_4 else 0,
            },
        },
        status="computed",
        data_confidence="high",
    )
    session.add(tax_profile)

    for obs_item in pos.observations:
        session.add(
            Observation(
                client_id=client_id,
                tax_year=pos.tax_year,
                title=obs_item.title,
                description=obs_item.description,
                severity=obs_item.severity,
                priority="high" if obs_item.severity in ("warning", "critical") else "medium",
                category=obs_item.category,
                potential_saving=obs_item.potential_saving,
                source="engine",
            )
        )


class SyncResponse(BaseModel):
    integration_id: str
    clients_created: int
    clients_skipped: int
    tax_profiles_updated: int | None = None  # HMRC: number of tax profiles updated with pulled data
    message: str


# Demo meeting notes: subject, summary, action_items (list of strings), tags.
# {client} in summary is replaced with client first name. We pick 2–3 per client at random.
DEMO_MEETING_NOTES: list[dict] = [
    {
        "subject": "Annual review 2025",
        "attendees": "Client, Adviser, Paraplanner",
        "summary": "Full annual review with {client}. Discussed current tax position, pension contributions, and ISA usage. {client} confirmed no change in employment. We ran through the allowance tracker and noted personal allowance is fully used. Agreed to revisit before year end for any last-minute planning and to confirm bonus expectations with employer.",
        "action_items": [
            "Send P60 and annual tax summary by 31 May",
            "Review pension contributions before 5 April for annual allowance",
            "Book follow-up call in March to confirm ISA subscription",
            "Chase employer for P11D if benefits-in-kind apply",
        ],
        "tags": ["annual-review", "tax-year-end", "allowances"],
    },
    {
        "subject": "Tax planning session",
        "attendees": "Client, Adviser",
        "summary": "Focused on income tax and allowances with {client}. Reviewed personal allowance position and discussed gift aid. Agreed to maximise pension contributions within budget. No HICBC issues for this year. {client} asked about salary sacrifice — we agreed to model a scenario at next meeting.",
        "action_items": [
            "Client to confirm pension contribution amount by next week",
            "Submit gift aid declaration if not already on file",
            "Schedule Q1 check-in to update on any bonus or dividend expectations",
            "Prepare salary sacrifice comparison for next call",
        ],
        "tags": ["tax-planning", "pension", "gift-aid", "salary-sacrifice"],
    },
    {
        "subject": "Pre-year-end checklist",
        "attendees": "Client, Adviser",
        "summary": "Ran through year-end checklist with {client}: ISA allowance, pension annual allowance, CGT exemption. Client on track. Noted one observation on pension taper to monitor for next year. Discussed use of CGT annual exemption if planning to rebalance investments.",
        "action_items": [
            "Use remaining ISA allowance before 5 April",
            "Confirm final pension contribution figure",
            "Review CGT position if any disposals planned",
            "Send year-end summary letter by 15 April",
        ],
        "tags": ["year-end", "isa", "pension", "cgt"],
    },
    {
        "subject": "Pension review and drawdown",
        "attendees": "Client, Adviser",
        "summary": "Pension review meeting with {client}. Discussed current drawdown strategy and sustainability. Reviewed taxable income from pension and interaction with state pension timing. {client} is in flexible drawdown; we agreed to cap at basic rate where possible. No MPAA triggered this year.",
        "action_items": [
            "Provide drawdown projection for next three tax years",
            "Review UFPLS vs annuity quote when {client} is ready",
            "Confirm state pension deferral decision before next birthday",
        ],
        "tags": ["pension", "drawdown", "retirement"],
    },
    {
        "subject": "IHT and estate planning discussion",
        "attendees": "Client, Adviser, Client's spouse",
        "summary": "Initial IHT discussion with {client}. Covered nil-rate band and residence nil-rate band, current estate estimate, and gift allowances. {client} is considering regular gifts out of income — we agreed to document and review annually. Will follow up with a simple spreadsheet of exempt transfers.",
        "action_items": [
            "Send IHT fact sheet and current thresholds",
            "Client to list intended gifts for next year",
            "Schedule annual IHT review for same time next year",
            "Check if deed of variation is relevant for any past estate",
        ],
        "tags": ["iht", "estate-planning", "gifts"],
    },
    {
        "subject": "Mid-year check-in",
        "attendees": "Client, Adviser",
        "summary": "Mid-year check-in with {client}. No major changes to report. Confirmed employment income on track and that P60 will be available in May. Discussed interest received to date — we will include in tax summary. {client} asked about side income from consultancy; we noted to declare and may need to register for self-assessment if over threshold.",
        "action_items": [
            "Add consultancy income to next tax projection",
            "Remind client of SA registration deadline if side income continues",
            "Update cashflow with latest interest rates",
        ],
        "tags": ["mid-year", "employment", "self-assessment"],
    },
    {
        "subject": "Discovery and fact-find",
        "attendees": "Client, Adviser",
        "summary": "Initial discovery meeting with {client}. Gathered employment details, pension arrangements, savings and investments, and family circumstances. {client} has two children and claims child benefit — we flagged HICBC and will run full tax calc to see if charge applies. Next step: full fact-find and recommendation report.",
        "action_items": [
            "Complete full fact-find document and send for sign-off",
            "Run full tax position including HICBC and pension relief",
            "Prepare recommendation report with tax summary",
            "Book follow-up to present report and agree plan",
        ],
        "tags": ["discovery", "fact-find", "hicbc"],
    },
    {
        "subject": "CGT and investment rebalance",
        "attendees": "Client, Adviser",
        "summary": "Discussion with {client} on planned sale of shares and use of CGT annual exemption. We modelled the gain and confirmed within exemption for this year. Discussed bed-and-ISA and timing of sale vs new tax year. {client} will instruct broker after we confirm figures in writing.",
        "action_items": [
            "Send written confirmation of CGT estimate and exemption usage",
            "Client to confirm sale date and consider bed-and-ISA for remainder",
            "Update investment summary after disposal",
        ],
        "tags": ["cgt", "investments", "bed-and-isa"],
    },
    {
        "subject": "HICBC and child benefit review",
        "attendees": "Client, Adviser",
        "summary": "HICBC review with {client}. Adjusted net income is above the £60k threshold; we calculated the charge and the effective marginal rate on the taper. Discussed options: reduce ANI via pension contributions or accept the charge. {client} will increase pension to bring ANI below threshold — we agreed to model exact contribution needed.",
        "action_items": [
            "Model pension contribution to bring ANI below £60k",
            "Client to confirm child benefit claim status with HMRC",
            "Set reminder to file self-assessment and pay HICBC by 31 Jan",
        ],
        "tags": ["hicbc", "child-benefit", "pension"],
    },
    {
        "subject": "Director remuneration and dividends",
        "attendees": "Client, Adviser",
        "summary": "Director remuneration planning with {client}. Reviewed salary vs dividend split for the current year and impact on NI and tax. We agreed the current mix is optimal; discussed retaining profits in company for future extraction. {client} will take a further dividend before year end once accounts are signed.",
        "action_items": [
            "Confirm final dividend amount once management accounts available",
            "Update tax summary with actual dividend for the year",
            "Review salary level for next year at AGM",
        ],
        "tags": ["director", "dividends", "remuneration"],
    },
    {
        "subject": "Post-meeting actions follow-up",
        "attendees": "Client, Adviser",
        "summary": "Short follow-up call with {client} to tick off actions from last meeting. P60 received and filed. Pension contribution confirmed and paid. ISA subscription completed. One item outstanding: gift aid declaration — {client} will send by email this week.",
        "action_items": [
            "Chase gift aid declaration if not received by Friday",
            "Close off annual review in file",
            "Diary next annual review for same time next year",
        ],
        "tags": ["follow-up", "actions", "annual-review"],
    },
]


def _add_demo_meeting_notes(
    session: AsyncSession,
    client_id: str,
    author_id: str,
    client_first_name: str,
) -> None:
    """Create 2–3 demo meeting notes per client, picked at random, with varied dates."""
    num_notes = random.randint(2, 3)
    chosen = random.sample(DEMO_MEETING_NOTES, min(num_notes, len(DEMO_MEETING_NOTES)))
    base_date = datetime.now(UTC) - timedelta(days=random.randint(15, 45))
    for i, template in enumerate(chosen):
        # Spread notes over 10–50 days in the past with some randomness
        days_ago = (i * random.randint(12, 22)) + random.randint(0, 5)
        meeting_date = base_date - timedelta(days=days_ago)
        summary = template["summary"].replace("{client}", client_first_name)
        note = MeetingNote(
            client_id=client_id,
            author_id=author_id,
            meeting_date=meeting_date,
            subject=template["subject"],
            attendees=template.get("attendees"),
            summary=summary,
            action_items=template.get("action_items") or [],
            tags=template.get("tags") or [],
        )
        session.add(note)


async def _pull_hmrc_tax_data(
    session: AsyncSession,
    user_id: str,
    tax_year: str,
) -> int:
    """
    Fake HMRC tax data pull: update all of the user's clients' tax profiles
    for the given tax year with a source note and high data confidence.
    Returns the number of tax profiles updated.
    """
    from sqlalchemy import and_

    clients_result = await session.execute(select(Client.id).where(Client.user_id == user_id))
    client_ids = [r[0] for r in clients_result.fetchall()]
    if not client_ids:
        return 0

    # Get latest tax profile per client for this tax year
    updated = 0
    hmrc_note = "PAYE and tax code data from HMRC API"
    for cid in client_ids:
        tp_result = await session.execute(
            select(TaxProfile).where(
                and_(TaxProfile.client_id == cid, TaxProfile.tax_year == tax_year)
            )
        )
        profile = tp_result.scalar_one_or_none()
        if profile is None:
            continue
        notes = list(profile.source_notes or [])
        if hmrc_note not in notes:
            notes.append(hmrc_note)
            profile.source_notes = notes
        profile.data_confidence = "high"
        updated += 1
    return updated


def _normalise_integration_id(name: str) -> str:
    m = {
        "intelliflo": "intelliflo",
        "xero": "xero",
        "hmrc apis": "hmrc_apis",
        "hmrc_apis": "hmrc_apis",
        "microsoft 365": "microsoft_365",
        "microsoft_365": "microsoft_365",
        "google workspace": "google_workspace",
        "google_workspace": "google_workspace",
        "salesforce": "salesforce",
    }
    return m.get(name.lower().strip(), name.lower().replace(" ", "_"))


@router.post("/integrations/{integration_id}/sync", response_model=SyncResponse)
async def sync_integration(
    integration_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
) -> SyncResponse:
    """
    Fake integration sync: create demo clients with full contact/personal/professional
    data and computed tax profiles (income, NI, allowances, observations).
    Clients with an email that already exists for this user are skipped.
    """
    key = _normalise_integration_id(integration_id)
    if key not in INTEGRATION_CLIENTS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown integration: {integration_id}. Valid: {list(INTEGRATION_CLIENTS.keys())}",
        )

    tax_year = get_default_tax_year()
    # HMRC sync only updates tax data for existing clients; it does not create clients.
    payloads = [] if key == "hmrc_apis" else INTEGRATION_CLIENTS[key]
    existing_emails_result = await session.execute(
        select(Client.email).where(Client.user_id == user_id)
    )
    existing_emails = {row[0] for row in existing_emails_result.fetchall() if row[0]}

    created = 0
    skipped = 0

    for data in payloads:
        email = data["email"].lower()
        if email in existing_emails:
            skipped += 1
            continue

        household = Household(
            user_id=user_id,
            name=f"{data['last_name']} Household",
        )
        session.add(household)
        await session.flush()

        client = Client(
            household_id=household.id,
            user_id=user_id,
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=email,
            date_of_birth=data["date_of_birth"],
            ni_number=data["ni_number"],
            utr=data["utr"],
            region=data.get("region", "england"),
            employment_status=data.get("employment_status", "employed"),
            phone=data.get("phone"),
            address_line_1=data.get("address_line_1"),
            address_line_2=data.get("address_line_2"),
            city=data.get("city"),
            postcode=data.get("postcode"),
            marital_status=data.get("marital_status"),
            number_of_children=data.get("number_of_children", 0),
            claims_child_benefit=data.get("claims_child_benefit", False),
            employer_name=data.get("employer_name"),
            company_name=data.get("company_name"),
            company_number=data.get("company_number"),
            notes=data.get("notes"),
        )
        session.add(client)
        await session.flush()

        tax = data.get("tax") or _DEFAULT_TAX
        _save_tax_profile_and_observations(
            session,
            client_id=client.id,
            client_region=client.region or "england",
            client_children=client.number_of_children,
            client_claims_cb=client.claims_child_benefit,
            tax=tax,
            tax_year=tax_year,
        )

        _add_demo_meeting_notes(
            session,
            client_id=client.id,
            author_id=user_id,
            client_first_name=client.first_name,
        )

        existing_emails.add(email)
        created += 1

    tax_profiles_updated: int | None = None
    if key == "hmrc_apis":
        tax_profiles_updated = await _pull_hmrc_tax_data(session, user_id, tax_year)

    await session.commit()

    logger.info(
        "Integration sync completed",
        integration_id=key,
        user_id=user_id,
        clients_created=created,
        clients_skipped=skipped,
        tax_profiles_updated=tax_profiles_updated,
    )

    if key == "hmrc_apis":
        message = (
            f"Tax data synced for {tax_profiles_updated or 0} profile{'s' if (tax_profiles_updated or 0) != 1 else ''}."
            if (tax_profiles_updated or 0) > 0
            else "No tax profiles to update."
        )
    else:
        message = f"{created} client{'s' if created != 1 else ''} synced"
        if skipped:
            message += f", {skipped} already present"
        if tax_profiles_updated is not None and tax_profiles_updated > 0:
            message += f"; tax data updated for {tax_profiles_updated} profile{'s' if tax_profiles_updated != 1 else ''}"
        message += "."

    return SyncResponse(
        integration_id=key,
        clients_created=created,
        clients_skipped=skipped,
        tax_profiles_updated=tax_profiles_updated,
        message=message,
    )
