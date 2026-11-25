"""
What the group routes accept and send back.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


def clean_text(value: str) -> str:
    value = value.strip()
    if value == "":
        raise ValueError("cannot be empty")
    return value


class GroupCreate(BaseModel):
    """Body for POST /api/groups, and PATCH /api/groups/{id} (rename)"""

    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=300)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return clean_text(value)


class MemberPermissions(BaseModel):
    """Body for PATCH /api/groups/{id}/members/{user_id}"""

    can_create: bool = True
    can_update: bool = False
    can_assign: bool = False


class MemberAdd(MemberPermissions):
    """Body for POST /api/groups/{id}/members"""

    email: EmailStr

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, value: str) -> str:
        return value.lower()


class MemberResponse(BaseModel):
    user_id: int
    name: str
    email: str
    is_owner: bool
    can_create: bool
    can_update: bool
    can_assign: bool


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    owner_name: str
    member_count: int
    my_permissions: list[str]  # what the person asking may do: create, update, assign, manage
    created_at: datetime


class GroupDetail(GroupResponse):
    members: list[MemberResponse]
