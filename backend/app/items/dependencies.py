"""
Shared helpers for the routes.

get_item_or_404 is used by every route that has {item_id} in its URL.
FastAPI runs it first: it loads the item, or stops the request with 404 if it does not exist.
"""

from fastapi import Depends, HTTPException
from sqlmodel import Session

from app.database import get_db
from app.items import repository
from app.items.models import Item


def get_item_or_404(item_id: int, db: Session = Depends(get_db)) -> Item:
    item = repository.find_item_by_id(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"No item with id {item_id}")
    return item
