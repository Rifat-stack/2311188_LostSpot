"""
The rules for items.

- Anyone, even a guest, can read the posts. That is the point of a lost and found board.
- Only logged-in users can post, and the post belongs to them (owner_id).
- Who may edit, delete or assign a post is decided by rbac.item_actions():
  the owner, an admin, or group members with the right permission.
- The date can't be in the future.
"""

from datetime import date, timedelta

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from app.activity.service import record
from app.groups import repository as groups_repository
from app.groups.models import Group
from app.helpers import now_utc
from app.items import repository
from app.items.models import Item
from app.items.schemas import ItemCreate, ItemUpdate
from app.rbac import (
    GroupPermission,
    ItemAction,
    group_permissions,
    item_actions,
    require_group_permission,
    require_item_action,
)
from app.users.models import User


def check_date(date_happened: date) -> None:
    """The date can't be in the future. We allow one extra day because the server runs on UTC,
    which is still "yesterday" for a few hours of the morning in Dhaka."""
    if date_happened > date.today() + timedelta(days=1):
        raise HTTPException(status_code=400, detail="The date can't be in the future")


def describe(db: Session, items: list[Item], user: User | None) -> list[dict]:
    """Add the names (owner, group, assigned person) and what `user` may do with each item.
    We load all the names in three queries, instead of three queries per item."""
    user_ids = {i.owner_id for i in items} | {i.assigned_to_id for i in items}
    group_ids = {i.group_id for i in items if i.group_id is not None}

    names = {u.id: u.name for u in db.exec(select(User).where(User.id.in_(user_ids - {None})))}
    groups = {g.id: g for g in db.exec(select(Group).where(Group.id.in_(group_ids)))}
    memberships = groups_repository.memberships_of(db, user.id, group_ids) if user else {}

    result = []
    for item in items:
        group = groups.get(item.group_id)
        allowed_in_group = group_permissions(group, user, memberships.get(item.group_id)) if group else set()
        result.append(
            {
                **item.model_dump(),
                "owner_name": names.get(item.owner_id),
                "group_name": group.name if group else None,
                "assigned_to_name": names.get(item.assigned_to_id),
                "allowed": sorted(item_actions(item, user, allowed_in_group)),
            }
        )
    return result


def actions_for(db: Session, item: Item, user: User) -> set[str]:
    """What `user` may do with this one item."""
    allowed_in_group = set()
    if item.group_id is not None:
        group = groups_repository.find_group(db, item.group_id)
        if group:
            membership = groups_repository.find_membership(db, group.id, user.id)
            allowed_in_group = group_permissions(group, user, membership)
    return item_actions(item, user, allowed_in_group)


def get_items(db: Session, user: User | None, kind: str | None, search: str | None, group_id: int | None) -> list[dict]:
    return describe(db, repository.find_items(db, kind, search, group_id=group_id), user)


def my_items(db: Session, user: User) -> list[dict]:
    return describe(db, repository.find_items(db, owner_id=user.id), user)


def get_item(db: Session, item: Item, user: User | None) -> dict:
    return describe(db, [item], user)[0]


def add_item(db: Session, user: User, data: ItemCreate) -> dict:
    check_date(data.date_happened)

    # Posting into a group needs the "create" permission in that group
    if data.group_id is not None:
        group = groups_repository.find_group(db, data.group_id)
        if group is None:
            raise HTTPException(status_code=404, detail=f"No group with id {data.group_id}")
        membership = groups_repository.find_membership(db, group.id, user.id)
        require_group_permission(group_permissions(group, user, membership), GroupPermission.CREATE)

    item = Item(**data.model_dump(), owner_id=user.id)
    return get_item(db, repository.save_item(db, item), user)


def edit_item(db: Session, user: User, item: Item, data: ItemUpdate) -> dict:
    require_item_action(actions_for(db, item, user), ItemAction.UPDATE)
    check_date(data.date_happened)

    for field, value in data.model_dump().items():
        setattr(item, field, value)
    item.updated_at = now_utc()
    return get_item(db, repository.save_item(db, item), user)


def delete_item(db: Session, request: Request, user: User, item: Item) -> None:
    require_item_action(actions_for(db, item, user), ItemAction.DELETE)
    detail = f'Item {item.id} "{item.item_name}"'
    repository.remove_item(db, item)
    record(db, request, "item_delete", user_id=user.id, email=user.email, detail=detail)


def assign_item(db: Session, user: User, item: Item, assignee_id: int | None) -> dict:
    if item.group_id is None:
        raise HTTPException(status_code=400, detail="Only items in a group can be assigned")
    require_item_action(actions_for(db, item, user), ItemAction.ASSIGN)

    if assignee_id is not None:
        group = groups_repository.find_group(db, item.group_id)
        is_owner = group is not None and group.owner_id == assignee_id
        if not is_owner and groups_repository.find_membership(db, item.group_id, assignee_id) is None:
            raise HTTPException(status_code=400, detail="You can only assign items to members of the group")

    item.assigned_to_id = assignee_id
    item.updated_at = now_utc()
    return get_item(db, repository.save_item(db, item), user)
