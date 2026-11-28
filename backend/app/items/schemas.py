"""
What the item routes accept and send back.

FastAPI checks every request against these classes. If something is wrong
(for example an empty item name), it answers with 422 before our code even runs.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.items.places import PLACES


class ItemFields(BaseModel):
    """The fields you fill in on the form."""

    kind: Literal["lost", "found"]
    item_name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    location: str = Field(min_length=1, max_length=150)
    date_happened: date
    contact: str | None = Field(default=None, max_length=100)

    @field_validator("item_name", "location")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if value == "":
            raise ValueError("cannot be empty")
        return value

    @field_validator("location")
    @classmethod
    def must_be_on_the_map(cls, value: str) -> str:
        if value not in PLACES:
            raise ValueError("pick a place on the 5th-floor map")
        return value

    @field_validator("description", "contact")
    @classmethod
    def empty_text_becomes_none(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        return value.strip()


class ItemCreate(ItemFields):
    """Body for POST /api/items. group_id is set when posting into a group."""

    group_id: int | None = None


class ItemUpdate(ItemFields):
    """Body for PUT /api/items/{id}: the whole item, plus whether it has been returned."""

    is_returned: bool


class AssignRequest(BaseModel):
    """Body for PUT /api/items/{id}/assign. null = nobody."""

    user_id: int | None


class ItemResponse(BaseModel):
    """What the API sends back for one item."""

    id: int
    kind: str
    item_name: str
    description: str | None
    location: str
    date_happened: date
    contact: str | None
    is_returned: bool
    owner_id: int | None
    owner_name: str | None
    group_id: int | None
    group_name: str | None
    assigned_to_id: int | None
    assigned_to_name: str | None
    allowed: list[str]  # what the person asking may do with it: "update", "delete", "assign"
    created_at: datetime
    updated_at: datetime
