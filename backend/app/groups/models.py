"""
Groups: a shared space for posts, for example "CSE Building lost & found desk".

The owner can do everything: rename it, delete it and manage the members.
Every other member gets their own permissions:
    can_create  - post new items in the group
    can_update  - edit group items and mark them returned
    can_assign  - give a group item to a member to handle
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.helpers import now_utc


class Group(SQLModel, table=True):
    __tablename__ = "groups"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=80)
    description: str | None = Field(default=None, max_length=300)
    owner_id: int = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"

    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="groups.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    can_create: bool = Field(default=True)
    can_update: bool = Field(default=False)
    can_assign: bool = Field(default=False)
    joined_at: datetime = Field(default_factory=now_utc)
