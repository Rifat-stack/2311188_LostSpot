"""
The rules for groups.

- Anyone with the group:create permission can make a group and becomes its owner.
- Only the owner may rename it, delete it, add or remove members, and change their permissions.
- A member may leave a group by themselves.
- Only members (and admins, for moderation) may open a group's page.
"""

from fastapi import HTTPException, Request
from sqlmodel import Session

from app.activity.service import record
from app.groups import repository
from app.groups.models import Group, GroupMember
from app.groups.schemas import GroupCreate, MemberAdd, MemberPermissions
from app.helpers import now_utc
from app.rbac import GroupPermission, group_permissions, require_group_permission
from app.users import repository as users_repository
from app.users.models import User


def my_permissions(db: Session, group: Group, user: User) -> set[str]:
    return group_permissions(group, user, repository.find_membership(db, group.id, user.id))


def summary(db: Session, group: Group, user: User) -> dict:
    owner = users_repository.find_user_by_id(db, group.owner_id)
    return {
        **group.model_dump(),
        "owner_name": owner.name if owner else "Unknown",
        "member_count": repository.count_members(db, group.id),
        "my_permissions": sorted(my_permissions(db, group, user)),
    }


def list_my_groups(db: Session, user: User) -> list[dict]:
    return [summary(db, group, user) for group in repository.groups_of_user(db, user.id)]


def create_group(db: Session, user: User, data: GroupCreate) -> dict:
    group = repository.save(db, Group(name=data.name, description=data.description, owner_id=user.id))
    return summary(db, group, user)


def group_detail(db: Session, user: User, group: Group) -> dict:
    allowed = my_permissions(db, group, user)
    if not allowed and user.role != "admin":
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    owner = users_repository.find_user_by_id(db, group.owner_id)
    members = [
        {
            "user_id": owner.id,
            "name": owner.name,
            "email": owner.email,
            "is_owner": True,
            "can_create": True,
            "can_update": True,
            "can_assign": True,
        }
    ]
    for member in repository.members_of(db, group.id):
        person = users_repository.find_user_by_id(db, member.user_id)
        members.append(
            {
                "user_id": member.user_id,
                "name": person.name,
                "email": person.email,
                "is_owner": False,
                "can_create": member.can_create,
                "can_update": member.can_update,
                "can_assign": member.can_assign,
            }
        )
    return {**summary(db, group, user), "members": members}


def rename_group(db: Session, user: User, group: Group, data: GroupCreate) -> dict:
    require_group_permission(my_permissions(db, group, user), GroupPermission.MANAGE)
    group.name = data.name
    group.description = data.description
    group.updated_at = now_utc()
    repository.save(db, group)
    return group_detail(db, user, group)


def delete_group(db: Session, request: Request, user: User, group: Group) -> None:
    require_group_permission(my_permissions(db, group, user), GroupPermission.MANAGE)
    detail = f'Group {group.id} "{group.name}"'
    repository.delete_group(db, group)
    record(db, request, "group_delete", user_id=user.id, email=user.email, detail=detail)


def add_member(db: Session, user: User, group: Group, data: MemberAdd) -> dict:
    require_group_permission(my_permissions(db, group, user), GroupPermission.MANAGE)

    person = users_repository.find_user_by_email(db, data.email)
    if person is None:
        raise HTTPException(status_code=404, detail="No account with this email")
    if person.id == group.owner_id:
        raise HTTPException(status_code=400, detail="The owner is already in the group")
    if repository.find_membership(db, group.id, person.id):
        raise HTTPException(status_code=409, detail="This person is already a member")

    repository.save(
        db,
        GroupMember(
            group_id=group.id,
            user_id=person.id,
            can_create=data.can_create,
            can_update=data.can_update,
            can_assign=data.can_assign,
        ),
    )
    return group_detail(db, user, group)


def change_member(db: Session, user: User, group: Group, member_id: int, data: MemberPermissions) -> dict:
    require_group_permission(my_permissions(db, group, user), GroupPermission.MANAGE)
    membership = repository.find_membership(db, group.id, member_id)
    if membership is None:
        raise HTTPException(status_code=404, detail="This person is not a member of the group")

    membership.can_create = data.can_create
    membership.can_update = data.can_update
    membership.can_assign = data.can_assign
    repository.save(db, membership)
    return group_detail(db, user, group)


def remove_member(db: Session, user: User, group: Group, member_id: int) -> None:
    leaving_by_myself = member_id == user.id
    if not leaving_by_myself:
        require_group_permission(my_permissions(db, group, user), GroupPermission.MANAGE)
    if member_id == group.owner_id:
        raise HTTPException(status_code=400, detail="The owner can't leave the group. Delete the group instead.")

    membership = repository.find_membership(db, group.id, member_id)
    if membership is None:
        raise HTTPException(status_code=404, detail="This person is not a member of the group")

    repository.unassign_member_items(db, group.id, member_id)
    db.delete(membership)
    db.commit()
