"""
The item routes. All of them start with /api/items.

    GET    /api/items               list items (anyone)  ?kind=lost|found  ?search=key  ?group_id=3
    GET    /api/items/mine          my own posts                       (needs login)
    POST   /api/items               post an item                       (needs the item:create permission)
    GET    /api/items/{id}          one item (anyone)
    PUT    /api/items/{id}          edit an item                       (owner, admin or group "update")
    DELETE /api/items/{id}          delete an item                     (owner, admin or group owner)
    PUT    /api/items/{id}/assign   give a group item to a member      (group "assign")
"""

from typing import Literal

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.database import get_db
from app.items import service
from app.items.dependencies import get_item_or_404
from app.items.models import Item
from app.items.schemas import AssignRequest, ItemCreate, ItemResponse, ItemUpdate
from app.rbac import Permission, require_permission
from app.users.dependencies import get_current_user, get_optional_user
from app.users.models import User

router = APIRouter(prefix="/api/items", tags=["Items"])


@router.get("", response_model=list[ItemResponse])
def list_items(
    kind: Literal["lost", "found"] | None = None,
    search: str | None = None,
    group_id: int | None = None,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    return service.get_items(db, user, kind, search, group_id)


# This must come before "/{item_id}", otherwise FastAPI would try to read "mine" as an id
@router.get("/mine", response_model=list[ItemResponse])
def list_my_items(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.my_items(db, user)


@router.post("", response_model=ItemResponse, status_code=201)
def create_item(
    data: ItemCreate,
    user: User = Depends(require_permission(Permission.ITEM_CREATE)),
    db: Session = Depends(get_db),
):
    return service.add_item(db, user, data)


@router.get("/{item_id}", response_model=ItemResponse)
def read_item(
    item: Item = Depends(get_item_or_404),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    return service.get_item(db, item, user)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(
    data: ItemUpdate,
    item: Item = Depends(get_item_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.edit_item(db, user, item, data)


@router.delete("/{item_id}")
def delete_item(
    request: Request,
    item: Item = Depends(get_item_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item_id = item.id
    service.delete_item(db, request, user, item)
    return {"message": f"Item {item_id} deleted"}


@router.put("/{item_id}/assign", response_model=ItemResponse)
def assign_item(
    data: AssignRequest,
    item: Item = Depends(get_item_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.assign_item(db, user, item, data.user_id)
