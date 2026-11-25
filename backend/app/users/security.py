"""
Passwords and tokens.

Password: we never save it. We add the secret pepper to it and save the Argon2id hash.
          To check a login we hash what was typed (with the pepper) and compare.

Access token: a JWT, a piece of signed text that says "user 5, role admin, session 12"
              and stops working after 15 minutes. The frontend keeps it in memory
              and sends it with every request:  Authorization: Bearer <token>.
              Nobody can change it without breaking the signature, because they don't
              know JWT_SECRET.

Refresh token: a long random string kept in an httpOnly cookie, so JavaScript can't read it.
               It is only used to get a new access token. In the database we keep only its
               SHA-256 hash, and it is replaced every time it is used (rotation).
"""

import hashlib
import secrets
from datetime import timedelta

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.config import ACCESS_TOKEN_MINUTES, get_jwt_secret, get_password_pepper
from app.helpers import now_utc

password_hasher = PasswordHash([Argon2Hasher()])  # Argon2id


def hash_password(password: str) -> str:
    return password_hasher.hash(password + get_password_pepper())


def password_is_correct(password: str, saved_hash: str) -> bool:
    return password_hasher.verify(password + get_password_pepper(), saved_hash)


def make_access_token(user_id: int, role: str, session_id: int) -> str:
    now = now_utc()
    payload = {
        "sub": str(user_id),  # "subject": who the token belongs to
        "role": role,
        "sid": session_id,    # which login session it belongs to, so logout can stop it at once
        "type": "access",
        "iat": now,           # issued at
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),  # expires at
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Checks the signature and the expiry time, and gives back what is inside.
    Raises jwt.ExpiredSignatureError if it is too old, jwt.InvalidTokenError if it is fake or changed."""
    payload = jwt.decode(
        token,
        get_jwt_secret(),
        algorithms=["HS256"],  # only accept the algorithm we use
        options={"require": ["exp", "sub", "sid"]},
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("not an access token")
    return payload


def make_refresh_token() -> str:
    return secrets.token_urlsafe(32)  # 32 random bytes, impossible to guess


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
