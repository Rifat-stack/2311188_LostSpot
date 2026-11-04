# Per-request wiring: builds session -> repository -> service, and loads the item for {item_id} routes.
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException

from app.database import SessionDep
from app.items.models import Item
from app.items.repository import ItemRepository
from app.items.service import ItemService


# Builds the service for this request: session -> repository -> service.
def get_item_service(session: SessionDep) -> ItemService:
    return ItemService(ItemRepository(session))


ServiceDep = Annotated[ItemService, Depends(get_item_service)]


# Resolves {item_id} from the path into an Item, or answers 404; routes just declare ItemDep.
def valid_item(item_id: uuid.UUID, service: ServiceDep) -> Item:
    item = service.get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


ItemDep = Annotated[Item, Depends(valid_item)]
