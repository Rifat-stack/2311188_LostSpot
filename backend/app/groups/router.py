"""
The group routes. All need login.

    GET    /api/groups                              my groups
    POST   /api/groups                              make a group (I become the owner)
    GET    /api/groups/{id}                         one group with its members      (members, admins)
    PATCH  /api/groups/{id}                         rename                          (owner)
    DELETE /api/groups/{id}                         delete                          (owner)
    POST   /api/groups/{id}/members                 add a member by email           (owner)
    PATCH  /api/groups/{id}/members/{user_id}       change a member's permissions   (owner)
    DELETE /api/groups/{id}/members/{user_id}       remove a member                 (owner, or the member leaving)

The posts of a group come from  GET /api/items?group_id={id}.
"""

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.database import get_db
from app.groups import service
from app.groups.dependencies import get_group_or_404
from app.groups.models import Group
from app.groups.schemas import GroupCreate, GroupDetail, GroupResponse, MemberAdd, MemberPermissions
from app.rbac import Permission, require_permission
from app.users.dependencies import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/groups", tags=["Groups"])


@router.get("", response_model=list[GroupResponse])
def list_my_groups(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_my_groups(db, user)


@router.post("", response_model=GroupResponse, status_code=201)
def create_group(
    data: GroupCreate,
    user: User = Depends(require_permission(Permission.GROUP_CREATE)),
    db: Session = Depends(get_db),
):
    return service.create_group(db, user, data)


@router.get("/{group_id}", response_model=GroupDetail)
def read_group(
    group: Group = Depends(get_group_or_404), user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return service.group_detail(db, user, group)


@router.patch("/{group_id}", response_model=GroupDetail)
def rename_group(
    data: GroupCreate,
    group: Group = Depends(get_group_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.rename_group(db, user, group, data)


@router.delete("/{group_id}")
def delete_group(
    request: Request,
    group: Group = Depends(get_group_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.delete_group(db, request, user, group)
    return {"message": "Group deleted"}


@router.post("/{group_id}/members", response_model=GroupDetail, status_code=201)
def add_member(
    data: MemberAdd,
    group: Group = Depends(get_group_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.add_member(db, user, group, data)


@router.patch("/{group_id}/members/{member_id}", response_model=GroupDetail)
def change_member(
    member_id: int,
    data: MemberPermissions,
    group: Group = Depends(get_group_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.change_member(db, user, group, member_id, data)


@router.delete("/{group_id}/members/{member_id}")
def remove_member(
    member_id: int,
    group: Group = Depends(get_group_or_404),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.remove_member(db, user, group, member_id)
    return {"message": "Member removed"}
