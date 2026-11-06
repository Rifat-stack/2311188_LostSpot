"""
The REST API for items. Every URL here starts with /api/items.

    GET     /api/items          -> list items (optional ?kind=lost|found and ?search=word)
    POST    /api/items          -> create an item
    GET     /api/items/{id}     -> read one item
    PUT     /api/items/{id}     -> update an item
    DELETE  /api/items/{id}     -> delete an item
"""

from typing import Literal

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_db
from app.items import service
from app.items.dependencies import get_item_or_404
from app.items.models import Item
from app.items.schemas import ItemCreate, ItemResponse, ItemUpdate

router = APIRouter(prefix="/api/items", tags=["Items"])


@router.get("", response_model=list[ItemResponse])
def list_items(
    kind: Literal["lost", "found"] | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    return service.get_items(db, kind, search)


@router.post("", response_model=ItemResponse, status_code=201)
def create_item(data: ItemCreate, db: Session = Depends(get_db)):
    return service.add_item(db, data)


@router.get("/{item_id}", response_model=ItemResponse)
def read_item(item: Item = Depends(get_item_or_404)):
    return item


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(data: ItemUpdate, item: Item = Depends(get_item_or_404), db: Session = Depends(get_db)):
    return service.edit_item(db, item, data)


@router.delete("/{item_id}")
def delete_item(item: Item = Depends(get_item_or_404), db: Session = Depends(get_db)):
    item_id = item.id
    service.delete_item(db, item)
    return {"message": f"Item {item_id} deleted"}
