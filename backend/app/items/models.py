"""
The database table for lost and found posts.

Each row in the `items` table is one post: something someone lost, or something someone found.
"""

from datetime import date, datetime

from sqlmodel import Field, SQLModel

from app.helpers import now_utc


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

    # Who it belongs to (posts from before accounts existed have no owner)
    owner_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    group_id: int | None = Field(default=None, foreign_key="groups.id", index=True)
    assigned_to_id: int | None = Field(default=None, foreign_key="users.id")

    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
