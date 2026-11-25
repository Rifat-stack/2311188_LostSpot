"""
Database queries for groups and their members.
"""

from sqlmodel import Session, or_, select

from app.groups.models import Group, GroupMember
from app.items.models import Item


def find_group(db: Session, group_id: int) -> Group | None:
    return db.get(Group, group_id)


def find_membership(db: Session, group_id: int, user_id: int) -> GroupMember | None:
    query = select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    return db.exec(query).first()


def memberships_of(db: Session, user_id: int, group_ids: set[int]) -> dict[int, GroupMember]:
    """The user's membership in each of these groups, as {group_id: membership}."""
    if not group_ids:
        return {}
    query = select(GroupMember).where(GroupMember.user_id == user_id, GroupMember.group_id.in_(group_ids))
    return {member.group_id: member for member in db.exec(query)}


def members_of(db: Session, group_id: int) -> list[GroupMember]:
    query = select(GroupMember).where(GroupMember.group_id == group_id).order_by(GroupMember.joined_at)
    return list(db.exec(query).all())


def groups_of_user(db: Session, user_id: int) -> list[Group]:
    """Groups the user owns or is a member of."""
    member_of = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    query = select(Group).where(or_(Group.owner_id == user_id, Group.id.in_(member_of))).order_by(Group.name)
    return list(db.exec(query).all())


def count_members(db: Session, group_id: int) -> int:
    return len(members_of(db, group_id)) + 1  # + 1 for the owner


def save(db: Session, row):
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_group(db: Session, group: Group) -> None:
    """Delete a group. Its posts are kept, but they are no longer in a group."""
    for item in db.exec(select(Item).where(Item.group_id == group.id)):
        item.group_id = None
        item.assigned_to_id = None
        db.add(item)
    for member in members_of(db, group.id):
        db.delete(member)
    db.delete(group)
    db.commit()


def unassign_member_items(db: Session, group_id: int, user_id: int) -> None:
    """When someone leaves a group, the group items assigned to them go back to nobody."""
    query = select(Item).where(Item.group_id == group_id, Item.assigned_to_id == user_id)
    for item in db.exec(query):
        item.assigned_to_id = None
        db.add(item)
    db.commit()
