"""
Database queries for users and login sessions.
"""

from datetime import datetime

from sqlmodel import Session, func, select

from app.activity.models import ActivityLog
from app.helpers import now_utc
from app.users.models import LoginSession, User


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.exec(select(User).where(User.email == email)).first()


def find_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def save(db: Session, row):
    """Insert a new row or save the changes to an existing one (any table)."""
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def find_session_by_token_hash(db: Session, token_hash: str) -> LoginSession | None:
    return db.exec(select(LoginSession).where(LoginSession.token_hash == token_hash)).first()


def active_sessions(db: Session, user_id: int) -> list[LoginSession]:
    """Sessions that are not ended and not expired, most recently used first."""
    query = (
        select(LoginSession)
        .where(
            LoginSession.user_id == user_id,
            LoginSession.revoked_at == None,  # noqa: E711  (SQL "IS NULL")
            LoginSession.expires_at > now_utc(),
        )
        .order_by(LoginSession.last_used_at.desc())
    )
    return list(db.exec(query).all())


def revoke_all_sessions(db: Session, user_id: int, keep_session_id: int | None = None) -> int:
    """End every session of this user (except one, if given). Gives back how many were ended."""
    count = 0
    for session in active_sessions(db, user_id):
        if session.id != keep_session_id:
            session.revoked_at = now_utc()
            db.add(session)
            count += 1
    db.commit()
    return count


def failed_logins_from_ip(db: Session, ip: str, since: datetime) -> int:
    query = select(func.count()).select_from(ActivityLog).where(
        ActivityLog.action == "login_failed",
        ActivityLog.ip == ip,
        ActivityLog.created_at >= since,
    )
    return db.exec(query).one()
