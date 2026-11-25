"""
The admin routes. Every one of them starts with /api/admin and needs an admin.

The whole router depends on require_permission(Permission.ADMIN_DASHBOARD), so a normal user
gets 403 on every address here. Each route also asks for the exact permission it needs.

    GET  /api/admin/stats                            overview numbers
    GET  /api/admin/users                            users  ?search= &role= &status= &page= &size=
    GET  /api/admin/users/{id}                       one user with posts, groups, sessions, activity
    POST /api/admin/users/{id}/ban                   ban with a reason
    POST /api/admin/users/{id}/unban
    PUT  /api/admin/users/{id}/role                  make user / admin
    POST /api/admin/users/{id}/revoke-sessions       log the user out everywhere
    POST /api/admin/users/bulk-ban                   ban many users with one reason
    POST /api/admin/users/bulk-unban
    GET  /api/admin/items                            all items  ?search= &kind= &status= &page=
    POST /api/admin/items/delete                     delete one or many items
    GET  /api/admin/groups                           all groups  ?search= &page=
    POST /api/admin/groups/delete                    delete one or many groups
    GET  /api/admin/activity                         activity log  ?search= &action= &user_id= &page=
    GET  /api/admin/security                         failed logins by IP and by account
    GET  /api/admin/export/users.csv                 CSV files, with the same filters as the lists
    GET  /api/admin/export/items.csv
    GET  /api/admin/export/activity.csv
"""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlmodel import Session

from app.activity.service import record
from app.admin import service
from app.admin.schemas import ActivityPage, BanRequest, BulkBanRequest, BulkResult, IdsRequest, RoleRequest, UserPage
from app.database import get_db
from app.helpers import now_utc
from app.rbac import Permission, require_permission
from app.users.models import User

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(require_permission(Permission.ADMIN_DASHBOARD))],
)

# Shared query parameters
Page = Query(default=1, ge=1)
Size = Query(default=20, ge=1, le=100)
RoleFilter = Literal["user", "admin"] | None
StatusFilter = Literal["active", "banned"] | None
KindFilter = Literal["lost", "found"] | None
ItemStatusFilter = Literal["open", "returned"] | None

can_manage_users = require_permission(Permission.USERS_MANAGE)
can_moderate = require_permission(Permission.CONTENT_MODERATE)
can_read_activity = require_permission(Permission.ACTIVITY_READ)
can_export = require_permission(Permission.DATA_EXPORT)


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    return service.stats(db)


# ---------- Users ----------


@router.get("/users", response_model=UserPage)
def list_users(
    search: str | None = None,
    role: RoleFilter = None,
    status: StatusFilter = None,
    page: int = Page,
    size: int = Size,
    admin: User = Depends(can_manage_users),
    db: Session = Depends(get_db),
):
    return service.list_users(db, search, role, status, page, size)


@router.get("/users/{user_id}")
def user_detail(user_id: int, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    return service.user_detail(db, admin, user_id)


@router.post("/users/bulk-ban", response_model=BulkResult)
def bulk_ban(data: BulkBanRequest, request: Request, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    return service.bulk_ban(db, request, admin, data.user_ids, data.reason)


@router.post("/users/bulk-unban", response_model=BulkResult)
def bulk_unban(data: IdsRequest, request: Request, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    return service.bulk_unban(db, request, admin, data.ids)


@router.post("/users/{user_id}/ban")
def ban(user_id: int, data: BanRequest, request: Request, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    service.ban_user(db, request, admin, service.find_user_or_404(db, user_id), data.reason)
    return {"message": "User banned"}


@router.post("/users/{user_id}/unban")
def unban(user_id: int, request: Request, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    service.unban_user(db, request, admin, service.find_user_or_404(db, user_id))
    return {"message": "User unbanned"}


@router.put("/users/{user_id}/role")
def change_role(user_id: int, data: RoleRequest, request: Request, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    service.change_role(db, request, admin, service.find_user_or_404(db, user_id), data.role)
    return {"message": f"Role changed to {data.role}"}


@router.post("/users/{user_id}/revoke-sessions")
def revoke_sessions(user_id: int, request: Request, admin: User = Depends(can_manage_users), db: Session = Depends(get_db)):
    ended = service.revoke_sessions(db, request, admin, service.find_user_or_404(db, user_id))
    return {"message": f"{ended} session(s) ended"}


# ---------- Content moderation ----------


@router.get("/items")
def list_items(
    search: str | None = None,
    kind: KindFilter = None,
    status: ItemStatusFilter = None,
    page: int = Page,
    size: int = Size,
    admin: User = Depends(can_moderate),
    db: Session = Depends(get_db),
):
    return service.list_items(db, admin, search, kind, status, page, size)


@router.post("/items/delete", response_model=BulkResult)
def delete_items(data: IdsRequest, request: Request, admin: User = Depends(can_moderate), db: Session = Depends(get_db)):
    return service.delete_items(db, request, admin, data.ids)


@router.get("/groups")
def list_groups(search: str | None = None, page: int = Page, size: int = Size, admin: User = Depends(can_moderate), db: Session = Depends(get_db)):
    return service.list_groups(db, search, page, size)


@router.post("/groups/delete", response_model=BulkResult)
def delete_groups(data: IdsRequest, request: Request, admin: User = Depends(can_moderate), db: Session = Depends(get_db)):
    return service.delete_groups(db, request, admin, data.ids)


# ---------- Activity and security ----------


@router.get("/activity", response_model=ActivityPage)
def activity(
    search: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    page: int = Page,
    size: int = Size,
    admin: User = Depends(can_read_activity),
    db: Session = Depends(get_db),
):
    return service.list_activity(db, search, action, user_id, page, size)


@router.get("/security")
def security(days: int = Query(default=7, ge=1, le=90), admin: User = Depends(can_read_activity), db: Session = Depends(get_db)):
    return service.security_view(db, days)


# ---------- CSV exports ----------


def csv_file(db: Session, request: Request, admin: User, name: str, text: str, rows: int, filters: dict) -> Response:
    used = ", ".join(f"{key}={value}" for key, value in filters.items() if value is not None) or "no filters"
    record(db, request, "export", user_id=admin.id, email=admin.email, detail=f"{name}.csv, {rows} row(s), {used}")
    filename = f"lostspot-{name}-{now_utc():%Y%m%d-%H%M}.csv"
    return Response(content=text, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/export/users.csv")
def export_users(
    request: Request,
    search: str | None = None,
    role: RoleFilter = None,
    status: StatusFilter = None,
    admin: User = Depends(can_export),
    db: Session = Depends(get_db),
):
    text, rows = service.export_users(db, search, role, status)
    return csv_file(db, request, admin, "users", text, rows, {"search": search, "role": role, "status": status})


@router.get("/export/items.csv")
def export_items(
    request: Request,
    search: str | None = None,
    kind: KindFilter = None,
    status: ItemStatusFilter = None,
    admin: User = Depends(can_export),
    db: Session = Depends(get_db),
):
    text, rows = service.export_items(db, search, kind, status)
    return csv_file(db, request, admin, "items", text, rows, {"search": search, "kind": kind, "status": status})


@router.get("/export/activity.csv")
def export_activity(
    request: Request,
    search: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    admin: User = Depends(can_export),
    db: Session = Depends(get_db),
):
    text, rows = service.export_activity(db, search, action, user_id)
    return csv_file(db, request, admin, "activity", text, rows, {"search": search, "action": action, "user_id": user_id})
