"""
The activity (audit) log: one row for every important thing that happens,
for example a login, a failed login, a ban or an export.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.helpers import now_utc


class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_logs"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", index=True)  # who did it (if known)
    email: str | None = Field(default=None, max_length=254, index=True)  # also kept for failed logins
    action: str = Field(max_length=40, index=True)  # e.g. "login", "login_failed", "ban"
    detail: str = Field(default="", max_length=500)  # e.g. "Banned user 7: spam posts"
    ip: str = Field(default="", max_length=64, index=True)
    browser: str = Field(default="", max_length=100)
    created_at: datetime = Field(default_factory=now_utc, index=True)
