# Business rules for items (date check, updated_at); called by the router, stores data via the repository.
import uuid
from datetime import date, timedelta

from app.items.models import Item, utc_now
from app.items.repository import ItemRepository
from app.items.schemas import ItemCreate, ItemPage, ItemUpdate


class ItemRuleError(Exception):
    """A business rule was broken; main.py turns it into a 409 response."""


# Business rules only: no HTTP and no database calls, everything stored goes through the repository.
class ItemService:
    def __init__(self, repo: ItemRepository) -> None:
        self.repo = repo

    def list_items(self, offset: int, limit: int) -> ItemPage:
        return ItemPage(items=self.repo.list(offset, limit), total=self.repo.count(), offset=offset, limit=limit)

    def get_item(self, item_id: uuid.UUID) -> Item | None:
        return self.repo.get(item_id)

    def create_item(self, data: ItemCreate) -> Item:
        self._check_event_date(data.event_date)
        return self.repo.create(Item.model_validate(data))

    def update_item(self, item: Item, data: ItemUpdate) -> Item:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return item
        if "event_date" in changes:
            self._check_event_date(changes["event_date"])
        changes["updated_at"] = utc_now()
        return self.repo.update(item, changes)

    def delete_item(self, item: Item) -> None:
        self.repo.delete(item)

    def _check_event_date(self, event_date: date) -> None:
        # The server runs in UTC; one day of slack lets users ahead of UTC (Dhaka is UTC+6) pick their today.
        if event_date > date.today() + timedelta(days=1):
            raise ItemRuleError("The date lost or found cannot be in the future")
