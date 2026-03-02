"""SQLAlchemy ORM models — 9-table prototype schema for Ovalens MVP."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)

# Timezone-aware timestamps for PostgreSQL (asyncpg) and SQLite
DateTimeTZ = DateTime(timezone=True)


def _uuid() -> str:
    return str(uuid4())


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Declarative base for all Ovalens ORM models."""


# ─── 1. User ───────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="adviser")
    preferences: Mapped[dict | None] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    households = relationship("Household", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")


# ─── 2. Household ──────────────────────────────────────────────────────────


class Household(Base):
    __tablename__ = "households"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    user = relationship("User", back_populates="households")
    clients = relationship("Client", back_populates="household")


# ─── 3. Client ─────────────────────────────────────────────────────────────


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String)
    date_of_birth: Mapped[str | None] = mapped_column(String)
    ni_number: Mapped[str | None] = mapped_column(String)
    utr: Mapped[str | None] = mapped_column(String)
    region: Mapped[str] = mapped_column(String, nullable=False, default="england")
    employment_status: Mapped[str] = mapped_column(String, default="employed")
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, default=dict)

    # Contact
    phone: Mapped[str | None] = mapped_column(String)
    address_line_1: Mapped[str | None] = mapped_column(String)
    address_line_2: Mapped[str | None] = mapped_column(String)
    city: Mapped[str | None] = mapped_column(String)
    postcode: Mapped[str | None] = mapped_column(String)

    # Personal
    marital_status: Mapped[str | None] = mapped_column(String)
    number_of_children: Mapped[int] = mapped_column(Integer, default=0)
    claims_child_benefit: Mapped[bool] = mapped_column(Boolean, default=False)

    # Spouse / partner (self-referencing FK)
    spouse_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"))

    # Professional
    employer_name: Mapped[str | None] = mapped_column(String)
    company_name: Mapped[str | None] = mapped_column(String)
    company_number: Mapped[str | None] = mapped_column(String)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    household = relationship("Household", back_populates="clients")
    tax_profiles = relationship("TaxProfile", back_populates="client")
    documents = relationship("Document", back_populates="client")
    conversations = relationship("Conversation", back_populates="client")
    observations = relationship("Observation", back_populates="client")
    meeting_notes = relationship(
        "MeetingNote", back_populates="client", order_by="MeetingNote.meeting_date.desc()"
    )
    spouse = relationship(
        "Client",
        foreign_keys=[spouse_id],
        remote_side="Client.id",
        uselist=False,
    )


# ─── 4. TaxProfile ─────────────────────────────────────────────────────────


class TaxProfile(Base):
    __tablename__ = "tax_profiles"
    __table_args__ = (UniqueConstraint("client_id", "tax_year"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    tax_year: Mapped[str] = mapped_column(String, nullable=False)

    # cached summary
    total_income: Mapped[float] = mapped_column(Float, default=0.0)
    adjusted_net_income: Mapped[float] = mapped_column(Float, default=0.0)
    taxable_income: Mapped[float] = mapped_column(Float, default=0.0)
    income_tax: Mapped[float] = mapped_column(Float, default=0.0)
    national_insurance: Mapped[float] = mapped_column(Float, default=0.0)
    dividend_tax: Mapped[float] = mapped_column(Float, default=0.0)
    total_tax: Mapped[float] = mapped_column(Float, default=0.0)
    effective_rate: Mapped[float] = mapped_column(Float, default=0.0)
    marginal_rate: Mapped[float] = mapped_column(Float, default=0.0)
    personal_allowance: Mapped[float] = mapped_column(Float, default=12570.0)
    pa_status: Mapped[str] = mapped_column(String, default="full")

    # flags
    in_pa_taper_zone: Mapped[bool] = mapped_column(Boolean, default=False)
    hicbc_applies: Mapped[bool] = mapped_column(Boolean, default=False)
    pension_taper_applies: Mapped[bool] = mapped_column(Boolean, default=False)

    # JSONB expansion joints
    tax_breakdown: Mapped[list | None] = mapped_column(JSON, default=list)
    ni_breakdown: Mapped[dict | None] = mapped_column(JSON, default=dict)
    income_sources: Mapped[list | None] = mapped_column(JSON, default=list)
    pension_data: Mapped[dict | None] = mapped_column(JSON, default=dict)
    allowances: Mapped[list | None] = mapped_column(JSON, default=list)
    hicbc: Mapped[dict | None] = mapped_column(JSON, default=dict)
    scenarios: Mapped[list | None] = mapped_column(JSON, default=list)

    # meta
    status: Mapped[str] = mapped_column(String, default="draft")
    data_confidence: Mapped[str] = mapped_column(String, default="low")
    confidence_notes: Mapped[list | None] = mapped_column(JSON, default=list)
    source_notes: Mapped[list | None] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    client = relationship("Client", back_populates="tax_profiles")


# ─── 5. Document ───────────────────────────────────────────────────────────


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    document_type: Mapped[str] = mapped_column(String, nullable=False)
    tax_year: Mapped[str | None] = mapped_column(String)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String)

    # extraction
    extraction_status: Mapped[str] = mapped_column(String, default="pending")
    extracted_data: Mapped[dict | None] = mapped_column(JSON, default=dict)
    extraction_confidence: Mapped[float | None] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    client = relationship("Client", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])


# ─── 6. ContextSnippet ────────────────────────────────────────────────────


class ContextSnippet(Base):
    """Web page content captured by the browser extension."""

    __tablename__ = "context_snippets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    source_title: Mapped[str] = mapped_column(String, nullable=False, default="")
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    cleaned_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    capture_type: Mapped[str] = mapped_column(String, nullable=False, default="full_page")
    status: Mapped[str] = mapped_column(String, nullable=False, default="processing")
    is_consumed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)


# ─── 7. Conversation ──────────────────────────────────────────────────────


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    client_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"), nullable=True)
    title: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")
    last_message_preview: Mapped[str | None] = mapped_column(String)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTimeTZ)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    unread: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    tax_plan_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    user = relationship("User", back_populates="conversations")
    client = relationship("Client", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


# ─── 8. Message ────────────────────────────────────────────────────────────


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    insights: Mapped[list | None] = mapped_column(JSON, default=list)
    tool_calls: Mapped[list | None] = mapped_column(JSON, default=list)
    dashboard_data: Mapped[dict | None] = mapped_column(JSON)
    model: Mapped[str | None] = mapped_column(String)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)

    # relationships
    conversation = relationship("Conversation", back_populates="messages")


# ─── 9. Observation ────────────────────────────────────────────────────────


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    tax_year: Mapped[str | None] = mapped_column(String)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    priority: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    potential_saving: Mapped[float | None] = mapped_column(Float)
    deadline: Mapped[str | None] = mapped_column(String)
    action_required: Mapped[str | None] = mapped_column(String)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String, nullable=False, default="engine")
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    client = relationship("Client", back_populates="observations")


# ─── 10. MeetingNote ──────────────────────────────────────────────────────


class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    meeting_date: Mapped[datetime] = mapped_column(DateTimeTZ, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    attendees: Mapped[str | None] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    action_items: Mapped[list | None] = mapped_column(JSON, default=list)
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTimeTZ, default=_utcnow, onupdate=_utcnow)

    # relationships
    client = relationship("Client", back_populates="meeting_notes")
    author = relationship("User", foreign_keys=[author_id])
