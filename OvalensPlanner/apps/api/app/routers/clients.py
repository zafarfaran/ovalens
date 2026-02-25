"""Client endpoints — list clients with tax summaries and detail views."""

import re
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.db.engine import get_db_session
from app.db.models import Client, Household, MeetingNote, Observation, TaxProfile
from app.dependencies import get_request_logger
from app.tax.engine import compute_full_tax_position
from app.tax.types import IncomeSource as TaxIncomeSource, IncomeType

router = APIRouter(tags=["clients"])


class CreateClientRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    date_of_birth: str
    ni_number: str
    utr: str
    region: Literal["england", "wales", "scotland", "northern_ireland"] = "england"
    employment_status: Literal["employed", "self-employed", "director", "retired", "other"] = "employed"
    # Contact
    phone: str | None = None
    address_line_1: str | None = None
    address_line_2: str | None = None
    city: str | None = None
    postcode: str | None = None
    # Personal
    marital_status: str | None = None
    number_of_children: int = 0
    claims_child_benefit: bool = False
    # Spouse
    spouse_id: str | None = None
    # Professional
    employer_name: str | None = None
    company_name: str | None = None
    company_number: str | None = None
    # Notes
    notes: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Enter a valid email address")
        return v.lower()

    @field_validator("ni_number")
    @classmethod
    def validate_ni_number(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z]{2}\d{6}[A-Za-z]$", v):
            raise ValueError("NI number must match format AB123456C")
        return v.upper()

    @field_validator("utr")
    @classmethod
    def validate_utr(cls, v: str) -> str:
        if not re.match(r"^\d{10}$", v):
            raise ValueError("UTR must be exactly 10 digits")
        return v


class IncomeSourceInput(BaseModel):
    type: Literal["employment", "self_employment", "rental", "pension_income", "savings", "dividends", "other"]
    gross_amount: float
    label: str = ""


class ComputeTaxProfileRequest(BaseModel):
    income_sources: list[IncomeSourceInput]
    pension_contributions: float = 0
    gift_aid: float = 0
    claims_child_benefit: bool = False
    number_of_children: int = 0
    isa_contributions: float = 0
    cgt_gains: float = 0

    @field_validator("income_sources")
    @classmethod
    def validate_income_sources(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("At least one income source is required")
        return v


@router.get("/clients")
async def list_clients(
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """List all clients with their latest tax profile summary."""
    user_id = "demo-user"

    logger.info("Listing clients", user_id=user_id)

    result = await session.execute(
        select(Client).where(Client.user_id == user_id)
    )
    clients = list(result.scalars().all())

    clients_out = []
    for client in clients:
        # Fetch latest TaxProfile for each client (by created_at DESC, limit 1)
        tp_result = await session.execute(
            select(TaxProfile)
            .where(TaxProfile.client_id == client.id)
            .order_by(desc(TaxProfile.created_at))
            .limit(1)
        )
        tax_profile = tp_result.scalar_one_or_none()

        clients_out.append({
            "id": client.id,
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "region": client.region,
            "employment_status": client.employment_status,
            "tax_year": tax_profile.tax_year if tax_profile else None,
            "total_income": tax_profile.total_income if tax_profile else None,
            "total_tax": tax_profile.total_tax if tax_profile else None,
            "effective_rate": tax_profile.effective_rate if tax_profile else None,
            "marginal_rate": tax_profile.marginal_rate if tax_profile else None,
        })

    logger.info("Clients listed", count=len(clients_out))

    return {"clients": clients_out}


@router.get("/households")
async def list_households(
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """List all households with members and aggregated tax data.

    NOTE: Uses N+1 query pattern (1 + H + C queries) consistent with list_clients.
    Acceptable for demo dataset; use eager loading / subqueries at scale.
    """
    user_id = "demo-user"

    logger.info("Listing households", user_id=user_id)

    result = await session.execute(
        select(Household).where(Household.user_id == user_id)
    )
    households = list(result.scalars().all())

    households_out = []
    for hh in households:
        clients_result = await session.execute(
            select(Client).where(Client.household_id == hh.id)
        )
        clients = list(clients_result.scalars().all())

        members = []
        total_income = 0.0
        total_tax = 0.0
        rate_sum = 0.0
        rate_count = 0

        for client in clients:
            tp_result = await session.execute(
                select(TaxProfile)
                .where(TaxProfile.client_id == client.id)
                .order_by(desc(TaxProfile.created_at))
                .limit(1)
            )
            tp = tp_result.scalar_one_or_none()

            income = tp.total_income if tp else None
            tax = tp.total_tax if tp else None
            eff_rate = tp.effective_rate if tp else None

            members.append({
                "id": client.id,
                "first_name": client.first_name,
                "last_name": client.last_name,
                "email": client.email,
                "employment_status": client.employment_status,
                "total_income": income,
                "total_tax": tax,
                "effective_rate": eff_rate,
            })

            if income is not None:
                total_income += income
            if tax is not None:
                total_tax += tax
            if eff_rate is not None:
                rate_sum += eff_rate
                rate_count += 1

        households_out.append({
            "id": hh.id,
            "name": hh.name,
            "notes": hh.notes,
            "member_count": len(members),
            "members": members,
            "total_income": total_income,
            "total_tax": total_tax,
            "avg_effective_rate": round(rate_sum / rate_count, 1) if rate_count > 0 else None,
        })

    logger.info("Households listed", count=len(households_out))

    return {"households": households_out}


@router.get("/clients/{client_id}")
async def get_client(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Get client detail with full tax profile and observations."""
    logger.info("Fetching client detail", client_id=client_id)

    # Load client
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()

    if client is None:
        logger.warning("Client not found", client_id=client_id)
        raise HTTPException(status_code=404, detail="Client not found")

    # Load spouse (if linked)
    spouse_out = None
    if client.spouse_id:
        sp_result = await session.execute(
            select(Client).where(Client.id == client.spouse_id)
        )
        sp = sp_result.scalar_one_or_none()
        if sp:
            spouse_out = {
                "id": sp.id,
                "first_name": sp.first_name,
                "last_name": sp.last_name,
                "email": sp.email,
                "date_of_birth": sp.date_of_birth,
                "ni_number": sp.ni_number,
                "employment_status": sp.employment_status,
                "region": sp.region,
            }

    # Load household members (other clients in the same household)
    hh_result = await session.execute(
        select(Client)
        .where(Client.household_id == client.household_id)
        .where(Client.id != client.id)
    )
    household_members_out = [
        {"id": m.id, "first_name": m.first_name, "last_name": m.last_name}
        for m in hh_result.scalars().all()
    ]

    # Load latest tax profile
    tp_result = await session.execute(
        select(TaxProfile)
        .where(TaxProfile.client_id == client_id)
        .order_by(desc(TaxProfile.created_at))
        .limit(1)
    )
    tax_profile = tp_result.scalar_one_or_none()

    # Load observations
    obs_result = await session.execute(
        select(Observation)
        .where(Observation.client_id == client_id)
        .order_by(desc(Observation.created_at))
    )
    observations = list(obs_result.scalars().all())

    # Build tax profile dict with all JSON fields
    tax_profile_out = None
    if tax_profile:
        tax_profile_out = {
            "tax_year": tax_profile.tax_year,
            "total_income": tax_profile.total_income,
            "adjusted_net_income": tax_profile.adjusted_net_income,
            "taxable_income": tax_profile.taxable_income,
            "income_tax": tax_profile.income_tax,
            "national_insurance": tax_profile.national_insurance,
            "dividend_tax": tax_profile.dividend_tax,
            "total_tax": tax_profile.total_tax,
            "effective_rate": tax_profile.effective_rate,
            "marginal_rate": tax_profile.marginal_rate,
            "personal_allowance": tax_profile.personal_allowance,
            "pa_status": tax_profile.pa_status,
            "in_pa_taper_zone": tax_profile.in_pa_taper_zone,
            "hicbc_applies": tax_profile.hicbc_applies,
            "pension_taper_applies": tax_profile.pension_taper_applies,
            "income_sources": tax_profile.income_sources,
            "pension_data": tax_profile.pension_data,
            "allowances": tax_profile.allowances,
            "hicbc": tax_profile.hicbc,
            "tax_breakdown": tax_profile.tax_breakdown,
            "ni_breakdown": tax_profile.ni_breakdown,
        }

    # Build observations list
    observations_out = [
        {
            "id": obs.id,
            "tax_year": obs.tax_year,
            "title": obs.title,
            "description": obs.description,
            "severity": obs.severity,
            "priority": obs.priority,
            "category": obs.category,
            "potential_saving": obs.potential_saving,
            "deadline": obs.deadline,
            "action_required": obs.action_required,
            "is_dismissed": obs.is_dismissed,
            "source": obs.source,
            "created_at": obs.created_at.isoformat() if obs.created_at else None,
        }
        for obs in observations
    ]

    logger.info(
        "Client detail loaded",
        client_id=client_id,
        has_tax_profile=tax_profile is not None,
        observation_count=len(observations_out),
    )

    return {
        "id": client.id,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "email": client.email,
        "date_of_birth": client.date_of_birth,
        "ni_number": client.ni_number,
        "utr": client.utr,
        "region": client.region,
        "employment_status": client.employment_status,
        # Contact
        "phone": client.phone,
        "address_line_1": client.address_line_1,
        "address_line_2": client.address_line_2,
        "city": client.city,
        "postcode": client.postcode,
        # Personal
        "marital_status": client.marital_status,
        "number_of_children": client.number_of_children,
        "claims_child_benefit": client.claims_child_benefit,
        # Spouse (resolved from FK)
        "spouse": spouse_out,
        "household_members": household_members_out,
        # Professional
        "employer_name": client.employer_name,
        "company_name": client.company_name,
        "company_number": client.company_number,
        # Notes
        "notes": client.notes,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "tax_profile": tax_profile_out,
        "observations": observations_out,
    }


@router.post("/clients", status_code=201)
async def create_client(
    body: CreateClientRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Create a new client with an auto-generated household."""
    user_id = "demo-user"

    logger.info("Creating client", first_name=body.first_name, last_name=body.last_name)

    # If spouse_id is provided, validate it and reuse their household
    household_id: str | None = None
    existing_spouse: Client | None = None
    if body.spouse_id:
        sp_result = await session.execute(
            select(Client).where(Client.id == body.spouse_id)
        )
        existing_spouse = sp_result.scalar_one_or_none()
        if existing_spouse is None:
            raise HTTPException(status_code=400, detail="spouse_id references a non-existent client")
        household_id = existing_spouse.household_id

    if not household_id:
        # Create a new household for this client
        household = Household(
            user_id=user_id,
            name=f"{body.last_name} Household",
        )
        session.add(household)
        await session.flush()
        household_id = household.id

    # Create the client
    client = Client(
        household_id=household_id,
        user_id=user_id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        date_of_birth=body.date_of_birth,
        ni_number=body.ni_number,
        utr=body.utr,
        region=body.region,
        employment_status=body.employment_status,
        phone=body.phone,
        address_line_1=body.address_line_1,
        address_line_2=body.address_line_2,
        city=body.city,
        postcode=body.postcode,
        marital_status=body.marital_status,
        number_of_children=body.number_of_children,
        claims_child_benefit=body.claims_child_benefit,
        spouse_id=body.spouse_id,
        employer_name=body.employer_name,
        company_name=body.company_name,
        company_number=body.company_number,
        notes=body.notes,
    )
    session.add(client)
    await session.flush()

    # Set bidirectional spouse link
    if body.spouse_id and existing_spouse:
        existing_spouse.spouse_id = client.id
        await session.flush()

    logger.info("Client created", client_id=client.id)

    return {
        "id": client.id,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "email": client.email,
        "date_of_birth": client.date_of_birth,
        "ni_number": client.ni_number,
        "utr": client.utr,
        "region": client.region,
        "employment_status": client.employment_status,
    }


class UpdateClientRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    ni_number: Optional[str] = None
    utr: Optional[str] = None
    region: Optional[Literal["england", "wales", "scotland", "northern_ireland"]] = None
    employment_status: Optional[Literal["employed", "self-employed", "director", "retired", "other"]] = None
    phone: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    marital_status: Optional[str] = None
    number_of_children: Optional[int] = None
    claims_child_benefit: Optional[bool] = None
    employer_name: Optional[str] = None
    company_name: Optional[str] = None
    company_number: Optional[str] = None
    notes: Optional[str] = None
    spouse_id: Optional[str] = None  # set to "" to unlink

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Enter a valid email address")
        return v.lower()

    @field_validator("ni_number")
    @classmethod
    def validate_ni_number(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[A-Za-z]{2}\d{6}[A-Za-z]$", v):
            raise ValueError("NI number must match format AB123456C")
        return v.upper()

    @field_validator("utr")
    @classmethod
    def validate_utr(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^\d{10}$", v):
            raise ValueError("UTR must be exactly 10 digits")
        return v


@router.patch("/clients/{client_id}")
async def update_client(
    client_id: str,
    body: UpdateClientRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Update client fields (partial update — only sent fields are changed)."""
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    updates = body.model_dump(exclude_unset=True)

    # Handle spouse_id specially — pop it so the generic loop doesn't touch it
    if "spouse_id" in updates:
        new_spouse_id = updates.pop("spouse_id")

        if new_spouse_id == "":
            # Unlink: clear old spouse's back-link, then clear ours
            if client.spouse_id:
                old_sp_result = await session.execute(
                    select(Client).where(Client.id == client.spouse_id)
                )
                old_spouse = old_sp_result.scalar_one_or_none()
                if old_spouse:
                    old_spouse.spouse_id = None
            client.spouse_id = None

        elif new_spouse_id is not None:
            # Link to a new spouse
            sp_result = await session.execute(
                select(Client).where(Client.id == new_spouse_id)
            )
            new_spouse = sp_result.scalar_one_or_none()
            if new_spouse is None:
                raise HTTPException(status_code=404, detail="Spouse client not found")

            # Clear any existing spouse back-links on both sides
            if client.spouse_id and client.spouse_id != new_spouse_id:
                old_sp_result = await session.execute(
                    select(Client).where(Client.id == client.spouse_id)
                )
                old_spouse = old_sp_result.scalar_one_or_none()
                if old_spouse:
                    old_spouse.spouse_id = None

            if new_spouse.spouse_id and new_spouse.spouse_id != client.id:
                old_sp2_result = await session.execute(
                    select(Client).where(Client.id == new_spouse.spouse_id)
                )
                old_spouse2 = old_sp2_result.scalar_one_or_none()
                if old_spouse2:
                    old_spouse2.spouse_id = None

            # Set bidirectional link
            client.spouse_id = new_spouse_id
            new_spouse.spouse_id = client.id

            # Move client into spouse's household
            client.household_id = new_spouse.household_id

    for field, value in updates.items():
        setattr(client, field, value)

    await session.flush()

    logger.info("Client updated", client_id=client_id, fields=list(updates.keys()))

    return await get_client(client_id, session, logger)


class UpdateHouseholdRequest(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/households/{household_id}")
async def update_household(
    household_id: str,
    body: UpdateHouseholdRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Update household fields (partial update)."""
    result = await session.execute(
        select(Household).where(Household.id == household_id)
    )
    household = result.scalar_one_or_none()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(household, field, value)

    await session.flush()

    logger.info("Household updated", household_id=household_id, fields=list(updates.keys()))

    return {"id": household.id, "name": household.name, "notes": household.notes}


@router.post("/clients/{client_id}/tax-profile")
async def compute_client_tax_profile(
    client_id: str,
    body: ComputeTaxProfileRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Compute and save a tax profile for a client using the deterministic engine."""

    # Load client
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    logger.info(
        "Computing tax profile",
        client_id=client_id,
        income_sources=[{"type": s.type, "gross_amount": s.gross_amount} for s in body.income_sources],
        pension_contributions=body.pension_contributions,
        gift_aid=body.gift_aid,
        claims_child_benefit=body.claims_child_benefit,
        number_of_children=body.number_of_children,
    )

    # Build engine inputs
    engine_sources = [
        TaxIncomeSource(
            source_type=IncomeType(s.type),
            gross_amount=s.gross_amount,
            label=s.label or s.type.replace("_", " ").title(),
        )
        for s in body.income_sources
    ]

    # Run engine
    pos = compute_full_tax_position(
        engine_sources,
        pension_contributions=body.pension_contributions,
        gift_aid=body.gift_aid,
        region=client.region or "england",
        number_of_children=body.number_of_children,
        claims_child_benefit=body.claims_child_benefit,
        cgt_gains=body.cgt_gains,
    )

    # Delete existing tax profile and observations for this client + tax year
    existing_tp = await session.execute(
        select(TaxProfile).where(
            TaxProfile.client_id == client_id,
            TaxProfile.tax_year == pos.tax_year,
        )
    )
    old_tp = existing_tp.scalar_one_or_none()
    if old_tp:
        await session.delete(old_tp)

    existing_obs = await session.execute(
        select(Observation).where(
            Observation.client_id == client_id,
            Observation.source == "engine",
        )
    )
    for obs in existing_obs.scalars().all():
        await session.delete(obs)

    await session.flush()

    # Save new TaxProfile
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
            "contributions": body.pension_contributions,
            "aa_remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else 60_000 - body.pension_contributions,
            "annual_allowance": pos.pension_aa_result.annual_allowance if pos.pension_aa_result else 60_000,
        },
        allowances=[
            {
                "type": "personal_allowance",
                "label": "Personal Allowance",
                "annual_limit": 12_570,
                "used": min(pos.total_income, pos.personal_allowance),
                "remaining": max(0, pos.personal_allowance - pos.total_income),
                "status": "fully_used" if pos.total_income >= pos.personal_allowance else "available",
            },
            {
                "type": "pension_aa",
                "label": "Pension Annual Allowance",
                "annual_limit": 60_000,
                "used": body.pension_contributions,
                "remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else 60_000 - body.pension_contributions,
            },
            {
                "type": "dividend",
                "label": "Dividend Allowance",
                "annual_limit": 500,
                "used": pos.income_tax_result.dividend_allowance_used,
                "remaining": 500 - pos.income_tax_result.dividend_allowance_used,
            },
            {
                "type": "isa",
                "label": "ISA Allowance",
                "annual_limit": 20_000,
                "used": body.isa_contributions,
                "remaining": 20_000 - body.isa_contributions,
            },
            {
                "type": "cgt_aea",
                "label": "CGT Annual Exemption",
                "annual_limit": 3_000,
                "used": body.cgt_gains,
                "remaining": max(0, 3_000 - body.cgt_gains),
            },
        ],
        hicbc={
            "number_of_children": body.number_of_children,
            "claims_child_benefit": body.claims_child_benefit,
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

    # Save observations
    for obs_item in pos.observations:
        session.add(Observation(
            client_id=client_id,
            tax_year=pos.tax_year,
            title=obs_item.title,
            description=obs_item.description,
            severity=obs_item.severity,
            priority="high" if obs_item.severity in ("warning", "critical") else "medium",
            category=obs_item.category,
            potential_saving=obs_item.potential_saving,
            source="engine",
        ))

    await session.flush()

    logger.info("Tax profile computed and saved", client_id=client_id, total_tax=pos.total_tax)

    # Return full client detail (reuse existing endpoint logic)
    return await get_client(client_id, session, logger)


class CreateObservationRequest(BaseModel):
    title: str
    description: str
    severity: Literal["info", "warning", "opportunity"]
    category: str
    potential_saving: float | None = None
    source: Literal["engine", "ai"] = "ai"


@router.post("/clients/{client_id}/observations", status_code=201)
async def create_observation(
    client_id: str,
    body: CreateObservationRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Create a single observation for a client."""
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    priority = "high" if body.severity == "warning" else ("medium" if body.severity == "opportunity" else "low")

    obs = Observation(
        client_id=client_id,
        title=body.title,
        description=body.description,
        severity=body.severity,
        priority=priority,
        category=body.category,
        potential_saving=body.potential_saving,
        source=body.source,
    )
    session.add(obs)
    await session.flush()

    logger.info("Observation created", client_id=client_id, observation_id=obs.id, source=body.source)

    return {
        "id": obs.id,
        "title": obs.title,
        "description": obs.description,
        "severity": obs.severity,
        "priority": priority,
        "category": obs.category,
        "potential_saving": obs.potential_saving,
        "source": obs.source,
    }


@router.delete("/clients/{client_id}/observations/{observation_id}")
async def delete_observation(
    client_id: str,
    observation_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Delete a single observation by ID."""
    result = await session.execute(
        select(Observation)
        .where(Observation.id == observation_id)
        .where(Observation.client_id == client_id)
    )
    obs = result.scalar_one_or_none()
    if obs is None:
        raise HTTPException(status_code=404, detail="Observation not found")

    await session.delete(obs)
    await session.flush()

    logger.info("Observation deleted", client_id=client_id, observation_id=observation_id)
    return {"success": True}


@router.get("/clients/{client_id}/meeting-notes")
async def list_meeting_notes(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """List all meeting notes for a client, newest first."""
    # Verify client exists
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Fetch meeting notes ordered by meeting_date DESC
    notes_result = await session.execute(
        select(MeetingNote)
        .where(MeetingNote.client_id == client_id)
        .order_by(desc(MeetingNote.meeting_date))
    )
    notes = list(notes_result.scalars().all())

    logger.info("Meeting notes listed", client_id=client_id, count=len(notes))

    return {
        "meeting_notes": [
            {
                "id": note.id,
                "client_id": note.client_id,
                "meeting_date": note.meeting_date.isoformat() if note.meeting_date else None,
                "subject": note.subject,
                "attendees": note.attendees,
                "summary": note.summary,
                "action_items": note.action_items,
                "tags": note.tags,
                "created_at": note.created_at.isoformat() if note.created_at else None,
            }
            for note in notes
        ]
    }


# ── Pension History (carry-forward) ──────────────────────────────────


class PensionHistoryInput(BaseModel):
    contributions_history: dict[str, dict]


@router.get("/clients/{client_id}/pension-history")
async def get_pension_history(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Return prior-year pension contributions for carry forward."""
    result = await session.execute(
        select(TaxProfile)
        .where(TaxProfile.client_id == client_id)
        .order_by(desc(TaxProfile.created_at))
        .limit(1)
    )
    tp = result.scalar_one_or_none()

    history = {}
    if tp and tp.pension_data:
        history = tp.pension_data.get("contributions_history", {})

    return {"client_id": client_id, "contributions_history": history}


@router.put("/clients/{client_id}/pension-history")
async def update_pension_history(
    client_id: str,
    body: PensionHistoryInput,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Save prior-year pension contributions for carry forward."""
    result = await session.execute(
        select(TaxProfile)
        .where(TaxProfile.client_id == client_id)
        .order_by(desc(TaxProfile.created_at))
        .limit(1)
    )
    tp = result.scalar_one_or_none()
    if tp is None:
        raise HTTPException(status_code=404, detail="No tax profile found for client")

    pension_data = dict(tp.pension_data or {})
    pension_data["contributions_history"] = body.contributions_history
    tp.pension_data = pension_data
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tp, "pension_data")
    await session.flush()

    logger.info("Pension history updated", client_id=client_id, years=list(body.contributions_history.keys()))
    return {"client_id": client_id, "contributions_history": body.contributions_history}
