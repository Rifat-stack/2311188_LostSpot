# The `item` database table; only the repository reads and writes it.
import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# table=True maps this class to the `item` table. One row is one lost or found post.
class Item(SQLModel, table=True):
    # UUIDs are generated here, so ids are not guessable and don't depend on the database.
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    type: str = Field(max_length=10)  # "lost" or "found"
    title: str = Field(max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    # Where it was lost or found, e.g. "CSE Building, Floor 2, corridor near Lab 1".
    location: str = Field(max_length=200)
    # The day it was lost or found.
    event_date: date
    contact: str | None = Field(default=None, max_length=100)
    is_resolved: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
