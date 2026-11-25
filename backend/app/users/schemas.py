"""
What the account routes accept and send back.

Password rule: at least 8 characters, with at least one letter and at least one number.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


def check_password_rule(password: str) -> str:
    has_letter = any(character.isalpha() for character in password)
    has_digit = any(character.isdigit() for character in password)
    if not (has_letter and has_digit):
        raise ValueError("must contain at least one letter and one number")
    return password


def clean_name(name: str) -> str:
    name = name.strip()
    if name == "":
        raise ValueError("cannot be empty")
    return name


class SignUpRequest(BaseModel):
    """Body for POST /api/auth/register"""

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, value: str) -> str:
        return value.lower()  # so "Rifat@IUB.edu.bd" and "rifat@iub.edu.bd" are the same account

    @field_validator("password")
    @classmethod
    def password_rule(cls, value: str) -> str:
        return check_password_rule(value)


class LoginRequest(BaseModel):
    """Body for POST /api/auth/login"""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, value: str) -> str:
        return value.lower()


class ProfileUpdate(BaseModel):
    """Body for PATCH /api/users/me"""

    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        return clean_name(value)


class PasswordChange(BaseModel):
    """Body for PUT /api/users/me/password"""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_rule(cls, value: str) -> str:
        return check_password_rule(value)


class UserResponse(BaseModel):
    """What the API sends back about the logged-in user. Never the password hash."""

    id: int
    name: str
    email: str
    role: str
    created_at: datetime


class AuthResponse(BaseModel):
    """Sent back after sign up, login and refresh. The refresh token is NOT in here:
    it goes into an httpOnly cookie that JavaScript can't read."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until the access token stops working
    user: UserResponse


class SessionResponse(BaseModel):
    """One place where the user is logged in."""

    id: int
    ip: str
    browser: str
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool  # the session making this request
