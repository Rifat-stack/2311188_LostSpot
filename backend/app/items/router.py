# HTTP layer for /api/v1/items: takes the request, calls the service, returns the response.
from typing import Annotated

from fastapi import APIRouter, Query

from app.items.dependencies import ItemDep, ServiceDep
from app.items.models import Item
from app.items.schemas import ItemCreate, ItemPage, ItemRead, ItemUpdate

router = APIRouter(prefix="/api/v1/items", tags=["items"])


# Create a lost or found item; it starts as not resolved.
@router.post("", response_model=ItemRead, status_code=201)
def create_item(data: ItemCreate, service: ServiceDep) -> Item:
    return service.create_item(data)


# List items, newest first, with the total so clients know when they reached the end.
@router.get("", response_model=ItemPage)
def list_items(
    service: ServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ItemPage:
    return service.list_items(offset, limit)


# Read one item by id, or 404 if it does not exist.
@router.get("/{item_id}", response_model=ItemRead)
def get_item(item: ItemDep) -> Item:
    return item


# Update only the fields that were sent; the others stay unchanged.
@router.patch("/{item_id}", response_model=ItemRead)
def update_item(item: ItemDep, data: ItemUpdate, service: ServiceDep) -> Item:
    return service.update_item(item, data)


# Delete an item; 204 means success with no response body.
@router.delete("/{item_id}", status_code=204)
def delete_item(item: ItemDep, service: ServiceDep) -> None:
    service.delete_item(item)
