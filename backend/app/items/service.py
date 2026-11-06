"""
The rules of LostSpot.

The router calls these functions. They check the rules, then use the repository to save.
Rule: the day something was lost or found cannot be in the future.
"""

from datetime import date, timedelta

from fastapi import HTTPException
from sqlmodel import Session

from app.items import repository
from app.items.models import Item, now_utc
from app.items.schemas import ItemCreate, ItemUpdate


def check_date(day: date) -> None:
    # The server clock is in UTC, which is 6 hours behind Bangladesh.
    # Allowing one extra day means "today" in Dhaka is never rejected by mistake.
    latest_allowed = date.today() + timedelta(days=1)
    if day > latest_allowed:
        raise HTTPException(status_code=400, detail="The date cannot be in the future")


def get_items(db: Session, kind: str | None, search: str | None) -> list[Item]:
    return repository.find_items(db, kind, search)


def add_item(db: Session, data: ItemCreate) -> Item:
    check_date(data.date_happened)
    new_item = Item(**data.model_dump())
    return repository.save_item(db, new_item)


def edit_item(db: Session, item: Item, data: ItemUpdate) -> Item:
    check_date(data.date_happened)

    # Copy every field from the form onto the item
    for field_name, value in data.model_dump().items():
        setattr(item, field_name, value)

    item.updated_at = now_utc()
    return repository.save_item(db, item)


def delete_item(db: Session, item: Item) -> None:
    repository.remove_item(db, item)
