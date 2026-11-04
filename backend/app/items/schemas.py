# Request and response shapes; FastAPI validates input against these before any item code runs.
import uuid
from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import StringConstraints, field_validator
from sqlmodel import Field, SQLModel

ItemType = Literal["lost", "found"]

# Spaces are trimmed before the length check, so "   " is rejected.
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Location = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class ItemBase(SQLModel):
    type: ItemType
    title: Title
    description: str | None = Field(default=None, max_length=1000)
    location: Location
    event_date: date
    contact: str | None = Field(default=None, max_length=100)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(SQLModel):
    type: ItemType | None = None
    title: Title | None = None
    description: str | None = Field(default=None, max_length=1000)
    location: Location | None = None
    event_date: date | None = None
    contact: str | None = Field(default=None, max_length=100)
    is_resolved: bool | None = None

    # description and contact may be cleared with null; the other fields may not.
    @field_validator("type", "title", "location", "event_date", "is_resolved")
    @classmethod
    def not_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("cannot be null")
        return value


class ItemRead(ItemBase):
    id: uuid.UUID
    is_resolved: bool
    created_at: datetime
    updated_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at", "updated_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


# One page of the list; total counts all items, not just this page.
class ItemPage(SQLModel):
    items: list[ItemRead]
    total: int
    offset: int
    limit: int
