"""
The database tables for accounts.

`users`     one row per account, with its role ("user" or "admin")
`sessions`  one row per login (one per browser or device you are logged in on)
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.helpers import now_utc


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    email: str = Field(max_length=254, unique=True, index=True)  # always saved in lowercase
    password_hash: str  # never the password itself, only its Argon2id hash
    role: str = Field(default="user", max_length=10)  # "user" or "admin"

    # Banning (only admins can do it)
    is_banned: bool = Field(default=False)
    ban_reason: str | None = Field(default=None, max_length=300)
    banned_at: datetime | None = Field(default=None)

    # For locking the account after too many wrong passwords
    failed_logins: int = Field(default=0)
    locked_until: datetime | None = Field(default=None)

    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class LoginSession(SQLModel, table=True):
    __tablename__ = "sessions"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)

    # SHA-256 of the current refresh token. The token itself only lives in the browser's cookie.
    # Every refresh replaces it with a new one (rotation), so an old token stops working.
    token_hash: str = Field(max_length=64, unique=True, index=True)

    ip: str = Field(default="", max_length=64)
    browser: str = Field(default="", max_length=100)
    created_at: datetime = Field(default_factory=now_utc)
    last_used_at: datetime = Field(default_factory=now_utc)
    expires_at: datetime
    revoked_at: datetime | None = Field(default=None)  # set on logout, revoke, ban or password change
