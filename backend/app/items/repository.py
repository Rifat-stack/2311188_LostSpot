"""
All database queries for items.

Only this file talks to the database. The service calls these functions
and never writes queries itself.
"""

from sqlmodel import Session, or_, select

from app.items.models import Item


def find_items(db: Session, kind: str | None = None, search: str | None = None) -> list[Item]:
    query = select(Item)

    # Only lost items or only found items
    if kind:
        query = query.where(Item.kind == kind)

    # Look for the search word in the name, location or description (not case sensitive)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Item.item_name.ilike(pattern),
                Item.location.ilike(pattern),
                Item.description.ilike(pattern),
            )
        )

    # Newest posts first
    query = query.order_by(Item.created_at.desc())
    return list(db.exec(query).all())


def find_item_by_id(db: Session, item_id: int) -> Item | None:
    return db.get(Item, item_id)


def save_item(db: Session, item: Item) -> Item:
    """Insert a new item or save changes to an existing one."""
    db.add(item)
    db.commit()
    db.refresh(item)  # reload it so we get the id and the saved values back
    return item


def remove_item(db: Session, item: Item) -> None:
    db.delete(item)
    db.commit()
