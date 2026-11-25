"""
The admin dashboard: statistics, users, moderation, the activity log and exports.

Safety rules:
- an admin can't change their own role
- an admin can't be banned (not even by another admin)
- banning ends all the user's sessions, and get_current_user rejects them on the very next request
"""

import csv
import io
from datetime import timedelta

from fastapi import HTTPException, Request
from sqlmodel import Session, func, or_, select

from app.activity.models import ActivityLog
from app.activity.service import record
from app.groups import repository as groups_repository
from app.groups.models import Group, GroupMember
from app.helpers import now_utc
from app.items import repository as items_repository
from app.items import service as items_service
from app.items.models import Item
from app.users import repository as users_repository
from app.users.models import LoginSession, User


def count(db: Session, query) -> int:
    return db.exec(select(func.count()).select_from(query.subquery())).one()


def one_page(db: Session, query, page: int, size: int) -> tuple[list, int]:
    total = count(db, query)
    rows = list(db.exec(query.offset((page - 1) * size).limit(size)).all())
    return rows, total


def find_user_or_404(db: Session, user_id: int) -> User:
    user = users_repository.find_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"No user with id {user_id}")
    return user


# ---------- Overview ----------


def stats(db: Session) -> dict:
    week_ago = now_utc() - timedelta(days=7)
    day_ago = now_utc() - timedelta(days=1)
    return {
        "users": count(db, select(User)),
        "admins": count(db, select(User).where(User.role == "admin")),
        "banned_users": count(db, select(User).where(User.is_banned == True)),  # noqa: E712
        "new_users_7d": count(db, select(User).where(User.created_at >= week_ago)),
        "items": count(db, select(Item)),
        "lost_items": count(db, select(Item).where(Item.kind == "lost")),
        "found_items": count(db, select(Item).where(Item.kind == "found")),
        "returned_items": count(db, select(Item).where(Item.is_returned == True)),  # noqa: E712
        "new_items_7d": count(db, select(Item).where(Item.created_at >= week_ago)),
        "groups": count(db, select(Group)),
        "new_groups_7d": count(db, select(Group).where(Group.created_at >= week_ago)),
        "failed_logins_24h": count(
            db, select(ActivityLog).where(ActivityLog.action == "login_failed", ActivityLog.created_at >= day_ago)
        ),
        "active_sessions": count(
            db,
            select(LoginSession).where(LoginSession.revoked_at == None, LoginSession.expires_at > now_utc()),  # noqa: E711
        ),
    }


# ---------- Users ----------


def users_query(search: str | None, role: str | None, status: str | None):
    query = select(User)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))
    if role:
        query = query.where(User.role == role)
    if status == "banned":
        query = query.where(User.is_banned == True)  # noqa: E712
    elif status == "active":
        query = query.where(User.is_banned == False)  # noqa: E712
    return query.order_by(User.created_at.desc())


def list_users(db: Session, search, role, status, page: int, size: int) -> dict:
    rows, total = one_page(db, users_query(search, role, status), page, size)
    return {"items": rows, "total": total, "page": page, "size": size}


def user_detail(db: Session, admin: User, user_id: int) -> dict:
    user = find_user_or_404(db, user_id)
    groups = [
        {"id": g.id, "name": g.name, "is_owner": g.owner_id == user.id}
        for g in groups_repository.groups_of_user(db, user.id)
    ]
    sessions = users_repository.active_sessions(db, user.id)
    activity = db.exec(
        select(ActivityLog).where(ActivityLog.user_id == user.id).order_by(ActivityLog.created_at.desc()).limit(20)
    ).all()
    # The user's posts, with "allowed" worked out for the admin who is looking
    items = items_service.describe(db, items_repository.find_items(db, owner_id=user.id), admin)
    return {
        "user": admin_user_dict(user),
        "items": items,
        "groups": groups,
        "sessions": [s.model_dump() for s in sessions],
        "activity": [{**a.model_dump(), "user_name": user.name} for a in activity],
    }


def admin_user_dict(user: User) -> dict:
    data = user.model_dump()
    data.pop("password_hash")  # never send the hash, not even to an admin
    return data


def ban_user(db: Session, request: Request, admin: User, user: User, reason: str) -> None:
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Admins can't be banned")
    user.is_banned = True
    user.ban_reason = reason
    user.banned_at = now_utc()
    users_repository.save(db, user)
    ended = users_repository.revoke_all_sessions(db, user.id)  # logged out everywhere at once
    record(db, request, "ban", user_id=admin.id, email=admin.email, detail=f"{user.email}: {reason} ({ended} session(s) ended)")


def unban_user(db: Session, request: Request, admin: User, user: User) -> None:
    user.is_banned = False
    user.ban_reason = None
    user.banned_at = None
    users_repository.save(db, user)
    record(db, request, "unban", user_id=admin.id, email=admin.email, detail=user.email)


def change_role(db: Session, request: Request, admin: User, user: User, role: str) -> None:
    if user.id == admin.id:
        raise HTTPException(status_code=403, detail="You can't change your own role")
    if user.is_banned and role == "admin":
        raise HTTPException(status_code=400, detail="Unban the user before making them an admin")
    old_role = user.role
    user.role = role
    user.updated_at = now_utc()
    users_repository.save(db, user)
    record(db, request, "role_change", user_id=admin.id, email=admin.email, detail=f"{user.email}: {old_role} -> {role}")


def revoke_sessions(db: Session, request: Request, admin: User, user: User) -> int:
    ended = users_repository.revoke_all_sessions(db, user.id)
    record(db, request, "session_revoke", user_id=admin.id, email=admin.email, detail=f"{user.email}: {ended} session(s) ended by an admin")
    return ended


def bulk_ban(db: Session, request: Request, admin: User, user_ids: list[int], reason: str) -> dict:
    done, skipped = [], []
    for user_id in dict.fromkeys(user_ids):  # dict.fromkeys removes repeated ids, keeps the order
        user = users_repository.find_user_by_id(db, user_id)
        if user is None:
            skipped.append({"id": user_id, "reason": "No such user"})
        elif user.role == "admin":
            skipped.append({"id": user_id, "reason": "Admins can't be banned"})
        elif user.is_banned:
            skipped.append({"id": user_id, "reason": "Already banned"})
        else:
            ban_user(db, request, admin, user, reason)
            done.append(user_id)
    return {"done": done, "skipped": skipped}


def bulk_unban(db: Session, request: Request, admin: User, user_ids: list[int]) -> dict:
    done, skipped = [], []
    for user_id in dict.fromkeys(user_ids):
        user = users_repository.find_user_by_id(db, user_id)
        if user is None:
            skipped.append({"id": user_id, "reason": "No such user"})
        elif not user.is_banned:
            skipped.append({"id": user_id, "reason": "Not banned"})
        else:
            unban_user(db, request, admin, user)
            done.append(user_id)
    return {"done": done, "skipped": skipped}


# ---------- Content moderation ----------


def items_query(search: str | None, kind: str | None, status: str | None):
    query = select(Item)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Item.item_name.ilike(pattern), Item.location.ilike(pattern), Item.description.ilike(pattern)))
    if kind:
        query = query.where(Item.kind == kind)
    if status == "returned":
        query = query.where(Item.is_returned == True)  # noqa: E712
    elif status == "open":
        query = query.where(Item.is_returned == False)  # noqa: E712
    return query.order_by(Item.created_at.desc())


def list_items(db: Session, admin: User, search, kind, status, page: int, size: int) -> dict:
    rows, total = one_page(db, items_query(search, kind, status), page, size)
    return {"items": items_service.describe(db, rows, admin), "total": total, "page": page, "size": size}


def delete_items(db: Session, request: Request, admin: User, ids: list[int]) -> dict:
    done, skipped = [], []
    for item_id in dict.fromkeys(ids):
        item = db.get(Item, item_id)
        if item is None:
            skipped.append({"id": item_id, "reason": "No such item"})
            continue
        detail = f'Item {item.id} "{item.item_name}" (by an admin)'
        db.delete(item)
        db.commit()
        record(db, request, "item_delete", user_id=admin.id, email=admin.email, detail=detail)
        done.append(item_id)
    return {"done": done, "skipped": skipped}


def groups_query(search: str | None):
    query = select(Group)
    if search:
        query = query.where(Group.name.ilike(f"%{search}%"))
    return query.order_by(Group.created_at.desc())


def list_groups(db: Session, search, page: int, size: int) -> dict:
    rows, total = one_page(db, groups_query(search), page, size)
    result = []
    for group in rows:
        owner = users_repository.find_user_by_id(db, group.owner_id)
        result.append(
            {
                **group.model_dump(),
                "owner_name": owner.name if owner else "Unknown",
                "member_count": count(db, select(GroupMember).where(GroupMember.group_id == group.id)) + 1,
                "item_count": count(db, select(Item).where(Item.group_id == group.id)),
            }
        )
    return {"items": result, "total": total, "page": page, "size": size}


def delete_groups(db: Session, request: Request, admin: User, ids: list[int]) -> dict:
    done, skipped = [], []
    for group_id in dict.fromkeys(ids):
        group = groups_repository.find_group(db, group_id)
        if group is None:
            skipped.append({"id": group_id, "reason": "No such group"})
            continue
        detail = f'Group {group.id} "{group.name}" (by an admin)'
        groups_repository.delete_group(db, group)
        record(db, request, "group_delete", user_id=admin.id, email=admin.email, detail=detail)
        done.append(group_id)
    return {"done": done, "skipped": skipped}


# ---------- Activity log and security ----------


def activity_query(search: str | None, action: str | None, user_id: int | None):
    query = select(ActivityLog)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                ActivityLog.email.ilike(pattern),
                ActivityLog.detail.ilike(pattern),
                ActivityLog.ip.ilike(pattern),
                ActivityLog.browser.ilike(pattern),
            )
        )
    if action:
        query = query.where(ActivityLog.action == action)
    if user_id is not None:
        query = query.where(ActivityLog.user_id == user_id)
    return query.order_by(ActivityLog.created_at.desc())


def with_user_names(db: Session, entries: list[ActivityLog]) -> list[dict]:
    ids = {e.user_id for e in entries if e.user_id is not None}
    names = {u.id: u.name for u in db.exec(select(User).where(User.id.in_(ids)))} if ids else {}
    return [{**e.model_dump(), "user_name": names.get(e.user_id)} for e in entries]


def list_activity(db: Session, search, action, user_id, page: int, size: int) -> dict:
    rows, total = one_page(db, activity_query(search, action, user_id), page, size)
    return {"items": with_user_names(db, rows), "total": total, "page": page, "size": size}


def security_view(db: Session, days: int) -> dict:
    since = now_utc() - timedelta(days=days)
    failed = (ActivityLog.action == "login_failed", ActivityLog.created_at >= since)

    by_ip = db.exec(
        select(ActivityLog.ip, func.count().label("count"), func.max(ActivityLog.created_at).label("last_seen"))
        .where(*failed)
        .group_by(ActivityLog.ip)
        .order_by(func.count().desc())
        .limit(20)
    ).all()
    by_account = db.exec(
        select(ActivityLog.email, func.count().label("count"), func.max(ActivityLog.created_at).label("last_seen"))
        .where(*failed)
        .group_by(ActivityLog.email)
        .order_by(func.count().desc())
        .limit(20)
    ).all()
    locked = db.exec(select(User).where(User.locked_until > now_utc())).all()

    return {
        "days": days,
        "by_ip": [{"ip": ip, "count": n, "last_seen": last} for ip, n, last in by_ip],
        "by_account": [{"email": email, "count": n, "last_seen": last} for email, n, last in by_account],
        "locked_accounts": [{"id": u.id, "email": u.email, "locked_until": u.locked_until} for u in locked],
    }


# ---------- CSV exports ----------


def to_csv(header: list[str], rows: list[list]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue()


def export_users(db: Session, search, role, status) -> tuple[str, int]:
    users = db.exec(users_query(search, role, status)).all()
    rows = [[u.id, u.name, u.email, u.role, "banned" if u.is_banned else "active", u.ban_reason or "", u.created_at.isoformat()] for u in users]
    return to_csv(["id", "name", "email", "role", "status", "ban_reason", "created_at"], rows), len(rows)


def export_items(db: Session, search, kind, status) -> tuple[str, int]:
    items = db.exec(items_query(search, kind, status)).all()
    rows = [
        [i.id, i.kind, i.item_name, i.location, i.date_happened.isoformat(), "returned" if i.is_returned else "open", i.owner_id or "", i.group_id or "", i.created_at.isoformat()]
        for i in items
    ]
    return to_csv(["id", "kind", "item_name", "location", "date_happened", "status", "owner_id", "group_id", "created_at"], rows), len(rows)


def export_activity(db: Session, search, action, user_id) -> tuple[str, int]:
    entries = db.exec(activity_query(search, action, user_id)).all()
    rows = [[e.id, e.created_at.isoformat(), e.action, e.user_id or "", e.email or "", e.ip, e.browser, e.detail] for e in entries]
    return to_csv(["id", "time", "action", "user_id", "email", "ip", "browser", "detail"], rows), len(rows)
