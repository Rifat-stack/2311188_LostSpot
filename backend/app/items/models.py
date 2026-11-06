"""
The database table for lost and found posts.

Each row in the `items` table is one post: something someone lost, or something someone found.
"""

from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Item(SQLModel, table=True):
    __tablename__ = "items"

    id: int | None = Field(default=None, primary_key=True)  # the database numbers the rows 1, 2, 3...
    kind: str = Field(max_length=5)                          # "lost" or "found"
    item_name: str = Field(max_length=100)                   # e.g. "Black car key"
    description: str | None = Field(default=None, max_length=500)
    location: str = Field(max_length=150)                    # e.g. "CSE Building, Floor 2, near Lab 1"
    date_happened: date                                      # the day it was lost or found
    contact: str | None = Field(default=None, max_length=100)
    is_returned: bool = Field(default=False)                 # True once the item is back with its owner
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
