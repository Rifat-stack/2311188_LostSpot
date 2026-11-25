"""
RBAC (role based access control): who may do what.

Every permission check in LostSpot goes through this file, so the rules are in one place.
There are three kinds of rules:

1. Role permissions - what a role may do at all.
   Each role ("user" or "admin") has a set of permissions in ROLE_PERMISSIONS.
   A route asks for one with  Depends(require_permission(Permission.SOMETHING)).

2. Ownership - a normal user may only change or delete their own posts.
   item_actions() works out what a user may do with one item.

3. Group permissions - inside a group, every member has their own rights
   (create, update, assign). Only the owner may rename, delete or manage members.
   group_permissions() works out a user's rights in one group.

The frontend hides buttons using the same answers (the "allowed" lists the API sends),
but hiding a button is not security: the server checks again on every request.
"""

from fastapi import Depends, HTTPException

from app.groups.models import Group, GroupMember
from app.items.models import Item
from app.users.dependencies import get_current_user
from app.users.models import User

# ---------- 1. Role permissions ----------


class Permission:
    ITEM_CREATE = "item:create"            # post lost or found items
    GROUP_CREATE = "group:create"          # make a new group
    ADMIN_DASHBOARD = "admin:dashboard"    # open the admin dashboard and its statistics
    USERS_MANAGE = "users:manage"          # ban, unban, change roles, revoke sessions
    CONTENT_MODERATE = "content:moderate"  # see and delete anyone's items and groups
    ACTIVITY_READ = "activity:read"        # read the activity log and the security view
    DATA_EXPORT = "data:export"            # download CSV files


ROLES = ("user", "admin")

USER_PERMISSIONS = {Permission.ITEM_CREATE, Permission.GROUP_CREATE}

ROLE_PERMISSIONS = {
    "user": USER_PERMISSIONS,
    "admin": USER_PERMISSIONS
    | {
        Permission.ADMIN_DASHBOARD,
        Permission.USERS_MANAGE,
        Permission.CONTENT_MODERATE,
        Permission.ACTIVITY_READ,
        Permission.DATA_EXPORT,
    },
}


def has_permission(user: User, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(user.role, set())


def require_permission(permission: str):
    """Use in a route:  user: User = Depends(require_permission(Permission.USERS_MANAGE))

    First get_current_user checks the login (401 if missing or bad, 403 if banned),
    then we check the role has this permission (403 if not)."""

    def check(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user, permission):
            raise HTTPException(status_code=403, detail="You don't have permission to do this")
        return user

    return check


# ---------- 2 and 3. Groups and ownership ----------


class GroupPermission:
    CREATE = "create"  # post items in the group
    UPDATE = "update"  # edit group items, mark them returned
    ASSIGN = "assign"  # give a group item to a member to handle
    MANAGE = "manage"  # rename, delete, add and remove members: only the owner


def group_permissions(group: Group, user: User | None, membership: GroupMember | None) -> set[str]:
    """What this user may do inside this group."""
    if user is None:
        return set()
    if group.owner_id == user.id:
        return {GroupPermission.CREATE, GroupPermission.UPDATE, GroupPermission.ASSIGN, GroupPermission.MANAGE}
    if membership is None:
        return set()  # not a member

    allowed = set()
    if membership.can_create:
        allowed.add(GroupPermission.CREATE)
    if membership.can_update:
        allowed.add(GroupPermission.UPDATE)
    if membership.can_assign:
        allowed.add(GroupPermission.ASSIGN)
    return allowed


GROUP_DENIED_MESSAGES = {
    GroupPermission.CREATE: "You don't have permission to post in this group",
    GroupPermission.UPDATE: "You don't have permission to edit items in this group",
    GroupPermission.ASSIGN: "You don't have permission to assign items in this group",
    GroupPermission.MANAGE: "Only the owner of the group can do this",
}


def require_group_permission(allowed: set[str], needed: str) -> None:
    if needed not in allowed:
        raise HTTPException(status_code=403, detail=GROUP_DENIED_MESSAGES[needed])


class ItemAction:
    UPDATE = "update"  # edit it and mark it returned
    DELETE = "delete"
    ASSIGN = "assign"


def item_actions(item: Item, user: User | None, group_allowed: set[str]) -> set[str]:
    """What this user may do with this item.

    - admin: edit and delete any item (moderation)
    - the person who posted it: edit and delete
    - in a group: members with "update" may edit, members with "assign" may assign,
      and the group owner may also delete
    - everybody else, and guests: nothing (they can only read it)
    """
    if user is None:
        return set()
    if user.role == "admin":
        actions = {ItemAction.UPDATE, ItemAction.DELETE}
    else:
        actions = set()

    if item.owner_id == user.id:
        actions |= {ItemAction.UPDATE, ItemAction.DELETE}

    if item.group_id is not None:
        if GroupPermission.UPDATE in group_allowed:
            actions.add(ItemAction.UPDATE)
        if GroupPermission.ASSIGN in group_allowed:
            actions.add(ItemAction.ASSIGN)
        if GroupPermission.MANAGE in group_allowed:
            actions.add(ItemAction.DELETE)
    return actions


ITEM_DENIED_MESSAGES = {
    ItemAction.UPDATE: "You can only edit your own posts",
    ItemAction.DELETE: "You can only delete your own posts",
    ItemAction.ASSIGN: "You don't have permission to assign this item",
}


def require_item_action(actions: set[str], needed: str) -> None:
    if needed not in actions:
        raise HTTPException(status_code=403, detail=ITEM_DENIED_MESSAGES[needed])
