"""
What the admin routes accept and send back.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class BanRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=300)

    @field_validator("reason")
    @classmethod
    def reason_not_blank(cls, value: str) -> str:
        value = value.strip()
        if value == "":
            raise ValueError("cannot be empty")
        return value


class BulkBanRequest(BanRequest):
    user_ids: list[int] = Field(min_length=1, max_length=100)


class IdsRequest(BaseModel):
    """For bulk unban and for deleting many items or groups"""

    ids: list[int] = Field(min_length=1, max_length=100)


class RoleRequest(BaseModel):
    role: Literal["user", "admin"]


class AdminUser(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_banned: bool
    ban_reason: str | None
    banned_at: datetime | None
    failed_logins: int
    locked_until: datetime | None
    created_at: datetime


class UserPage(BaseModel):
    items: list[AdminUser]
    total: int
    page: int
    size: int


class ActivityEntry(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None
    email: str | None
    action: str
    detail: str
    ip: str
    browser: str
    created_at: datetime


class ActivityPage(BaseModel):
    items: list[ActivityEntry]
    total: int
    page: int
    size: int


class BulkResult(BaseModel):
    done: list[int]                 # ids that were changed
    skipped: list[dict[str, object]]  # [{"id": 3, "reason": "Admins can't be banned"}]
