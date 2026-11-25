"""
Login checks that routes use with Depends(...).

check_login          reads "Authorization: Bearer <access token>" and checks, in this order:
                       1. the token is there                       (else 401)
                       2. the signature is right and not expired   (else 401)
                       3. the user exists and is not banned        (else 401 / 403)
                       4. the token's session is still running     (else 401: logout, revoke,
                                                                    password change)
get_current_user     the logged-in user (for routes that need a login)
get_current_session  the login session of this request
get_optional_user    the same as get_current_user, but a guest (no token at all) gets None

The role is read from the database here, not trusted from the token,
so a role change or a ban works on the very next request.
"""

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.database import get_db
from app.helpers import as_utc, now_utc
from app.users.models import LoginSession, User
from app.users.security import decode_access_token

# auto_error=False: we send our own clear 401 messages instead of FastAPI's
bearer = HTTPBearer(auto_error=False)


def not_logged_in(message: str) -> HTTPException:
    return HTTPException(status_code=401, detail=message, headers={"WWW-Authenticate": "Bearer"})


def check_token(token: str, db: Session) -> tuple[LoginSession, User]:
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise not_logged_in("Your access token has expired")
    except jwt.InvalidTokenError:
        raise not_logged_in("Your access token is not valid")

    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise not_logged_in("This account no longer exists")
    if user.is_banned:
        raise HTTPException(status_code=403, detail=f"Your account has been banned: {user.ban_reason}")

    session = db.get(LoginSession, payload["sid"])
    if (
        session is None
        or session.user_id != user.id
        or session.revoked_at is not None
        or as_utc(session.expires_at) < now_utc()
    ):
        raise not_logged_in("This session has ended. Please log in again.")
    return session, user


def check_login(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> tuple[LoginSession, User]:
    if credentials is None:
        raise not_logged_in("Please log in first")
    return check_token(credentials.credentials, db)


# FastAPI runs check_login only once per request, even if a route uses both of these
def get_current_user(login: tuple[LoginSession, User] = Depends(check_login)) -> User:
    return login[1]


def get_current_session(login: tuple[LoginSession, User] = Depends(check_login)) -> LoginSession:
    return login[0]


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None  # a guest
    # A token was sent, so it must be good (an expired one gives 401 and the frontend refreshes it)
    return check_token(credentials.credentials, db)[1]
