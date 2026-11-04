# Data access layer: every database query for items lives here, called only by the service.
import uuid

from sqlmodel import Session, func, select

from app.items.models import Item


# The only class that knows where items are stored; the service calls it and never sees SQL.
class ItemRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, offset: int, limit: int) -> list[Item]:
        statement = select(Item).order_by(Item.created_at.desc(), Item.id.desc()).offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def count(self) -> int:
        return self.session.exec(select(func.count()).select_from(Item)).one()

    def get(self, item_id: uuid.UUID) -> Item | None:
        return self.session.get(Item, item_id)

    def create(self, item: Item) -> Item:
        return self._save(item)

    def update(self, item: Item, patch: dict) -> Item:
        item.sqlmodel_update(patch)
        return self._save(item)

    def delete(self, item: Item) -> None:
        self.session.delete(item)
        self.session.commit()

    def _save(self, item: Item) -> Item:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item
