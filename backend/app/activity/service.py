"""
Writing to the activity log.

Every feature calls record(...) when something worth remembering happens.
"""

from fastapi import Request
from sqlmodel import Session

from app.activity.models import ActivityLog
from app.helpers import client_browser, client_ip

# Every action name used in the app, in one place
ACTIONS = [
    "signup",
    "login",
    "login_failed",
    "logout",
    "profile_update",
    "password_change",
    "password_change_failed",
    "session_revoke",
    "role_change",
    "ban",
    "unban",
    "item_delete",
    "group_delete",
    "export",
]


def record(
    db: Session,
    request: Request,
    action: str,
    user_id: int | None = None,
    email: str | None = None,
    detail: str = "",
) -> None:
    db.add(
        ActivityLog(
            user_id=user_id,
            email=email,
            action=action,
            detail=detail[:500],
            ip=client_ip(request),
            browser=client_browser(request),
        )
    )
    db.commit()
