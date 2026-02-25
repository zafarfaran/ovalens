"""Client data models."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class UKRegion(StrEnum):
    ENGLAND = "england"
    WALES = "wales"
    NORTHERN_IRELAND = "northern_ireland"
    SCOTLAND = "scotland"


class ClientInfo(BaseModel):
    id: str
    name: str
    email: str | None = None
    region: UKRegion = UKRegion.ENGLAND
    date_of_birth: str | None = None
    ni_number: str | None = None
    tax_year: str = "2025/26"
    created_at: datetime | None = None
    updated_at: datetime | None = None
