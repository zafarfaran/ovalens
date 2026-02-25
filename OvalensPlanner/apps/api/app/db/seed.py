"""Seed the database with demo data if it is empty."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import (
    Client,
    Conversation,
    Household,
    MeetingNote,
    Message,
    Observation,
    TaxProfile,
    User,
)
from app.tax.engine import compute_full_tax_position
from app.tax.types import IncomeSource, IncomeType

logger = get_logger(__name__)


def _compute_sarah_position():
    """Run the deterministic engine for Sarah Mitchell's demo data."""
    return compute_full_tax_position(
        income_sources=[
            IncomeSource(IncomeType.EMPLOYMENT, 145_000, "Employment"),
            IncomeSource(IncomeType.DIVIDENDS, 32_500, "Dividends"),
            IncomeSource(IncomeType.RENTAL, 18_000, "Rental"),
        ],
        pension_contributions=18_000,
        region="england",
        number_of_children=2,
        claims_child_benefit=True,
        pension_contributions_by_year={
            "2022/23": 18_000,   # 12k personal + 6k employer
            "2023/24": 22_500,   # 15k personal + 7.5k employer
            "2024/25": 26_000,   # 18k personal + 8k employer
        },
    )


async def seed_if_empty(session: AsyncSession) -> None:
    """Insert demo data when the users table is empty."""
    result = await session.execute(select(User).limit(1))
    if result.scalars().first() is not None:
        logger.info("Database already seeded — skipping")
        return

    logger.info("Seeding database with demo data")

    # Compute Sarah's tax position deterministically
    pos = _compute_sarah_position()

    # ── User ────────────────────────────────────────────────────────────
    user = User(
        id="demo-user",
        email="adviser@helio.ai",
        full_name="Demo Adviser",
        role="adviser",
    )
    session.add(user)

    # ── Household ───────────────────────────────────────────────────────
    household = Household(
        id="hh-mitchell",
        user_id="demo-user",
        name="Mitchell Household",
    )
    session.add(household)

    # ── Client ──────────────────────────────────────────────────────────
    client = Client(
        id="client-sarah",
        household_id="hh-mitchell",
        user_id="demo-user",
        first_name="Sarah",
        last_name="Mitchell",
        email="sarah.mitchell@email.co.uk",
        region="england",
        employment_status="employed",
        date_of_birth="1982-03-15",
        ni_number="QQ 12 34 56 C",
        utr="1234567890",
        # Contact
        phone="+44 7700 900123",
        address_line_1="42 Elm Grove",
        address_line_2="Clapham",
        city="London",
        postcode="SW4 7QR",
        # Personal / family
        marital_status="married",
        number_of_children=2,
        claims_child_benefit=True,
        # Spouse link
        spouse_id="client-james",
        # Professional
        employer_name="Meridian Capital Partners",
        # Notes
        notes="Two children (ages 8 and 11). Sarah is a senior portfolio manager. James runs a freelance consultancy. They own two buy-to-let flats in South London.",
    )
    session.add(client)

    # ── Client — Spouse ─────────────────────────────────────────────────
    spouse = Client(
        id="client-james",
        household_id="hh-mitchell",
        user_id="demo-user",
        first_name="James",
        last_name="Mitchell",
        email="james.mitchell@email.co.uk",
        region="england",
        employment_status="self-employed",
        date_of_birth="1980-07-22",
        ni_number="AB 98 76 54 D",
        # Contact (same household address)
        phone="+44 7700 900456",
        address_line_1="42 Elm Grove",
        address_line_2="Clapham",
        city="London",
        postcode="SW4 7QR",
        # Personal / family
        marital_status="married",
        number_of_children=2,
        claims_child_benefit=False,
        # Spouse link (bidirectional)
        spouse_id="client-sarah",
        # Professional
        company_name="Mitchell Consulting Ltd",
        # Notes
        notes="Self-employed IT consultant. Annual income ~£45,000. Unused pension allowance available for carry-forward planning.",
    )
    session.add(spouse)

    # ── TaxProfile (2025/26) — engine-computed ─────────────────────────
    tax_profile = TaxProfile(
        id="tp-sarah-2526",
        client_id="client-sarah",
        tax_year="2025/26",
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
            "contributions": 18_000,
            "aa_remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else 42_000,
            "annual_allowance": pos.pension_aa_result.annual_allowance if pos.pension_aa_result else 60_000,
            "contributions_history": {
                "2022/23": {"personal": 12_000, "employer": 6_000},
                "2023/24": {"personal": 15_000, "employer": 7_500},
                "2024/25": {"personal": 18_000, "employer": 8_000},
            },
        },
        allowances=[
            {
                "type": "personal_allowance",
                "label": "Personal Allowance",
                "annual_limit": 12_570,
                "used": 12_570 - pos.personal_allowance,
                "remaining": pos.personal_allowance,
                "status": "fully_used" if pos.personal_allowance == 0 else "available",
            },
            {
                "type": "pension_aa",
                "label": "Pension Annual Allowance",
                "annual_limit": 60_000,
                "used": 18_000,
                "remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else 42_000,
            },
            {
                "type": "isa",
                "label": "ISA Allowance",
                "annual_limit": 20_000,
                "used": 0,
                "remaining": 20_000,
            },
            {
                "type": "dividend",
                "label": "Dividend Allowance",
                "annual_limit": 500,
                "used": pos.income_tax_result.dividend_allowance_used,
                "remaining": 500 - pos.income_tax_result.dividend_allowance_used,
            },
            {
                "type": "cgt_aea",
                "label": "CGT Annual Exemption",
                "annual_limit": 3_000,
                "used": 0,
                "remaining": 3_000,
            },
        ],
        hicbc={
            "number_of_children": 2,
            "claims_child_benefit": True,
            "child_benefit_amount": pos.hicbc_result.child_benefit_annual if pos.hicbc_result else 0,
            "clawback_percentage": pos.hicbc_result.clawback_percentage if pos.hicbc_result else 0,
            "hicbc_charge": pos.hicbc_result.hicbc_charge if pos.hicbc_result else 0,
        },
        tax_breakdown=[
            {
                "band": b.name,
                "amount": b.income_in_band,
                "rate": b.rate,
                "tax": b.tax,
            }
            for b in pos.income_tax_result.non_savings_bands
        ],
        ni_breakdown={
            "class1": {
                "total_employee_ni": pos.ni_result.class_1.total_employee_ni if pos.ni_result.class_1 else 0,
            },
        },
        status="computed",
        data_confidence="high",
    )
    session.add(tax_profile)

    # ── Observations — engine-derived ──────────────────────────────────
    observations = []
    for i, obs in enumerate(pos.observations, start=1):
        observations.append(Observation(
            id=f"obs-{i}",
            client_id="client-sarah",
            tax_year="2025/26",
            title=obs.title,
            description=obs.description,
            severity=obs.severity,
            priority="high" if obs.severity in ("warning", "critical") else "medium",
            category=obs.category,
            potential_saving=obs.potential_saving,
        ))
    session.add_all(observations)

    # ── Meeting Notes ──────────────────────────────────────────────────
    meeting_notes = [
        MeetingNote(
            id="mn-1",
            client_id="client-sarah",
            author_id="demo-user",
            meeting_date=datetime(2025, 11, 14, 10, 0, tzinfo=timezone.utc),
            subject="Annual review — 2025/26 tax planning",
            attendees="Sarah Mitchell, James Mitchell (spouse)",
            summary=(
                "Reviewed Sarah's current tax position for 2025/26. Total income at £195,500 "
                "across employment (£145k), dividends (£32.5k) and rental (£18k). "
                "Personal allowance fully tapered — paying an effective 60% marginal rate in the "
                "taper zone. Discussed pension contribution strategy: Sarah's employer offers "
                "salary sacrifice but she hasn't increased contributions beyond the default 6%. "
                "James earns approximately £45,000 from his consultancy and has unused pension "
                "allowance. They have two children (ages 8 and 11) and are currently claiming "
                "Child Benefit — triggering HICBC. Sarah expressed interest in reducing overall "
                "household tax burden before April 2026. She mentioned a potential £80k bonus "
                "expected in February 2026 which would push income significantly higher."
            ),
            action_items=[
                "Model salary sacrifice scenario — increase pension contributions to restore PA",
                "Calculate HICBC impact and salary sacrifice threshold to eliminate it",
                "Explore spousal transfer of rental property to utilise James's basic rate band",
                "Prepare Bed & ISA analysis for dividend-generating portfolio",
                "Revisit once bonus amount confirmed — may need carry-forward pension planning",
            ],
            tags=["annual-review", "pension", "hicbc", "salary-sacrifice"],
        ),
        MeetingNote(
            id="mn-2",
            client_id="client-sarah",
            author_id="demo-user",
            meeting_date=datetime(2025, 7, 3, 14, 30, tzinfo=timezone.utc),
            subject="Rental property — remortgage and tax implications",
            attendees="Sarah Mitchell",
            summary=(
                "Sarah is remortgaging one of her two buy-to-let properties. Current rental "
                "income is £18,000 across both properties (£10,800 from Flat A in Clapham, "
                "£7,200 from Flat B in Brixton). Mortgage interest on Flat A is £4,200/yr — "
                "she only gets basic rate relief (20%) as a higher-rate taxpayer. Discussed "
                "incorporating the properties into a limited company but decided against it "
                "due to CGT crystallisation and SDLT costs. Sarah also mentioned she may sell "
                "Flat B within the next 18 months — we need to plan around CGT annual exemption "
                "and potential principal private residence relief considerations. She has never "
                "lived in Flat B so PPR would not apply."
            ),
            action_items=[
                "Calculate CGT exposure on potential sale of Flat B (estimated current value £320k, purchase price £245k)",
                "Check if CGT annual exemption can be used against other gains",
                "Review mortgage interest relief position under Section 24 restrictions",
            ],
            tags=["rental", "property", "cgt", "mortgage"],
        ),
        MeetingNote(
            id="mn-3",
            client_id="client-sarah",
            author_id="demo-user",
            meeting_date=datetime(2025, 3, 20, 9, 0, tzinfo=timezone.utc),
            subject="Pre year-end planning — 2024/25 wrap-up",
            attendees="Sarah Mitchell, James Mitchell",
            summary=(
                "Urgent pre-5 April meeting. Sarah had not yet used her ISA allowance for "
                "2024/25. Recommended immediate Bed & ISA transfer of £20k from her GIA — "
                "she holds approximately £85k in a global equity fund with £12k unrealised gains. "
                "Also confirmed that James used his full ISA allowance in February. "
                "Sarah made a £5,000 Gift Aid donation to Cancer Research UK in March — "
                "this extends her basic rate band and provides additional higher rate relief. "
                "Pension carry-forward: confirmed Sarah has £14,000 unused from 2021/22 (3 years "
                "available) on top of current year's £42,000 remaining. Total available headroom "
                "could be up to £56,000 if carry-forward claimed."
            ),
            action_items=[
                "Confirm Bed & ISA completed before 5 April",
                "File Gift Aid claim on Self Assessment return",
                "Document pension carry-forward position for 2025/26 planning",
            ],
            tags=["year-end", "isa", "gift-aid", "carry-forward"],
        ),
    ]
    session.add_all(meeting_notes)

    # ── Conversation + Messages ─────────────────────────────────────────
    now = datetime.now(timezone.utc)

    conversation = Conversation(
        id="conv-1",
        user_id="demo-user",
        client_id="client-sarah",
        title="Tax planning opportunities",
        status="active",
        last_message_preview="Based on Sarah's current position...",
        last_message_at=now,
        message_count=3,
        unread=False,
        tags=["Planning"],
        tax_plan_mode=False,
    )
    session.add(conversation)

    messages = [
        Message(
            id="msg-1",
            conversation_id="conv-1",
            role="assistant",
            content=(
                "I've loaded Sarah Mitchell's profile for 2025/26. "
                f"Her current position shows employment income of \u00a3145,000, "
                f"dividend income of \u00a332,500, and rental income of \u00a318,000.\n\n"
                f"Total gross income: \u00a3{pos.total_income:,.0f}\n\n"
                "What would you like to explore?"
            ),
        ),
        Message(
            id="msg-2",
            conversation_id="conv-1",
            role="user",
            content=(
                "What's her current tax liability and are there any obvious "
                "planning opportunities?"
            ),
        ),
        Message(
            id="msg-3",
            conversation_id="conv-1",
            role="assistant",
            content=(
                "Based on Sarah's current position:\n\n"
                f"Total tax liability: \u00a3{pos.total_tax:,.2f}\n"
                f"Effective tax rate: {pos.effective_rate:.1f}%\n"
                f"Marginal rate: {pos.marginal_rate:.0f}%\n\n"
                f"I've identified {len(pos.observations)} key observations:\n\n"
                + "\n\n".join(
                    f"{i}. **{o.title}** \u2014 {o.description}"
                    for i, o in enumerate(pos.observations, 1)
                )
                + "\n\nShall I model any scenarios?"
            ),
            insights=[
                {"label": "Total Tax", "value": f"\u00a3{pos.total_tax:,.0f}", "color": "brand"},
                {"label": "Effective", "value": f"{pos.effective_rate:.1f}%", "color": "amber"},
                {"label": "Marginal", "value": f"{pos.marginal_rate:.0f}%", "color": "emerald"},
            ],
        ),
    ]
    session.add_all(messages)

    await session.commit()
    logger.info("Demo data seeded successfully (engine-computed)")
