"""
The rules for accounts.

- One account per email address.
- A banned account can't log in or refresh its session.
- After 5 wrong passwords in a row the account is locked for 15 minutes,
  and one IP address can't fail more than 20 times in 15 minutes (brute-force protection).
- Each login is a session. Its refresh token works once: refreshing gives a new one (rotation).
- Logging out, revoking a session or changing the password ends sessions at once.
- Logins, failed logins, logouts and password changes go into the activity log.
"""

from datetime import timedelta

from fastapi import HTTPException, Request
from sqlmodel import Session

from app.activity.service import record
from app.config import (
    ACCESS_TOKEN_MINUTES,
    LOCK_MINUTES,
    MAX_FAILED_LOGINS,
    MAX_FAILED_LOGINS_PER_IP,
    REFRESH_TOKEN_DAYS,
    get_jwt_secret,
)
from app.helpers import as_utc, client_browser, client_ip, now_utc
from app.users import repository
from app.users.models import LoginSession, User
from app.users.schemas import LoginRequest, PasswordChange, ProfileUpdate, SignUpRequest
from app.users.security import (
    hash_password,
    hash_token,
    make_access_token,
    make_refresh_token,
    password_is_correct,
)


def banned_error(user: User) -> HTTPException:
    return HTTPException(status_code=403, detail=f"Your account has been banned: {user.ban_reason}")


def start_session(db: Session, request: Request, user: User) -> dict:
    """Log the user in on this browser: a new session row, a refresh token and an access token."""
    refresh_token = make_refresh_token()
    session = repository.save(
        db,
        LoginSession(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            ip=client_ip(request),
            browser=client_browser(request),
            expires_at=now_utc() + timedelta(days=REFRESH_TOKEN_DAYS),
        ),
    )
    return {
        "access_token": make_access_token(user.id, user.role, session.id),
        "refresh_token": refresh_token,  # the router puts this in the httpOnly cookie
        "expires_in": ACCESS_TOKEN_MINUTES * 60,
        "user": user,
    }


def sign_up(db: Session, request: Request, data: SignUpRequest) -> dict:
    get_jwt_secret()  # stop here, before saving anything, if the server has no JWT_SECRET yet

    if repository.find_user_by_email(db, data.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = repository.save(db, User(name=data.name, email=data.email, password_hash=hash_password(data.password)))
    record(db, request, "signup", user_id=user.id, email=user.email)
    return start_session(db, request, user)  # signed up = logged in


def log_in(db: Session, request: Request, data: LoginRequest) -> dict:
    # Too many failed logins from this IP address (any account)?
    since = now_utc() - timedelta(minutes=LOCK_MINUTES)
    if repository.failed_logins_from_ip(db, client_ip(request), since) >= MAX_FAILED_LOGINS_PER_IP:
        raise HTTPException(status_code=429, detail="Too many failed logins from your network. Try again later.")

    user = repository.find_user_by_email(db, data.email)
    if user is None:
        record(db, request, "login_failed", email=data.email, detail="No account with this email")
        raise HTTPException(status_code=401, detail="Wrong email or password")

    # Still locked from too many wrong passwords?
    if user.locked_until and as_utc(user.locked_until) > now_utc():
        minutes_left = int((as_utc(user.locked_until) - now_utc()).total_seconds() // 60) + 1
        record(db, request, "login_failed", user_id=user.id, email=user.email, detail="Account is locked")
        raise HTTPException(status_code=429, detail=f"Too many wrong passwords. Try again in {minutes_left} minute(s).")

    if not password_is_correct(data.password, user.password_hash):
        user.failed_logins += 1
        detail = f"Wrong password ({user.failed_logins} in a row)"
        if user.failed_logins >= MAX_FAILED_LOGINS:
            user.failed_logins = 0
            user.locked_until = now_utc() + timedelta(minutes=LOCK_MINUTES)
            repository.save(db, user)
            record(db, request, "login_failed", user_id=user.id, email=user.email, detail=detail + ", account locked")
            raise HTTPException(
                status_code=429,
                detail=f"Too many wrong passwords. Your account is locked for {LOCK_MINUTES} minutes.",
            )
        repository.save(db, user)
        record(db, request, "login_failed", user_id=user.id, email=user.email, detail=detail)
        raise HTTPException(status_code=401, detail="Wrong email or password")

    # The password is right, but a banned user still can't come in
    if user.is_banned:
        record(db, request, "login_failed", user_id=user.id, email=user.email, detail="Banned account")
        raise banned_error(user)

    user.failed_logins = 0
    user.locked_until = None
    repository.save(db, user)
    record(db, request, "login", user_id=user.id, email=user.email)
    return start_session(db, request, user)


def refresh(db: Session, request: Request, refresh_token: str | None) -> dict:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="You are not logged in")

    session = repository.find_session_by_token_hash(db, hash_token(refresh_token))
    user = repository.find_user_by_id(db, session.user_id) if session else None
    if session is None or user is None:
        raise HTTPException(status_code=401, detail="Your session has ended. Please log in again.")

    # Checked before "ended", so a banned user is told why they were logged out
    if user.is_banned:
        raise banned_error(user)
    if session.revoked_at is not None or as_utc(session.expires_at) < now_utc():
        raise HTTPException(status_code=401, detail="Your session has ended. Please log in again.")

    # Rotation: the old refresh token stops working, the browser gets a new one
    new_refresh_token = make_refresh_token()
    session.token_hash = hash_token(new_refresh_token)
    session.last_used_at = now_utc()
    session.ip = client_ip(request)
    session.browser = client_browser(request)
    repository.save(db, session)

    return {
        "access_token": make_access_token(user.id, user.role, session.id),
        "refresh_token": new_refresh_token,
        "expires_in": ACCESS_TOKEN_MINUTES * 60,
        "user": user,
    }


def log_out(db: Session, request: Request, refresh_token: str | None) -> None:
    if not refresh_token:
        return
    session = repository.find_session_by_token_hash(db, hash_token(refresh_token))
    if session and session.revoked_at is None:
        session.revoked_at = now_utc()  # the access token of this session stops working too
        repository.save(db, session)
        record(db, request, "logout", user_id=session.user_id)


def update_profile(db: Session, request: Request, user: User, data: ProfileUpdate) -> User:
    old_name = user.name
    user.name = data.name
    user.updated_at = now_utc()
    repository.save(db, user)
    record(db, request, "profile_update", user_id=user.id, email=user.email, detail=f"Name: {old_name} -> {user.name}")
    return user


def change_password(db: Session, request: Request, user: User, current: LoginSession, data: PasswordChange) -> None:
    if not password_is_correct(data.current_password, user.password_hash):
        record(db, request, "password_change_failed", user_id=user.id, email=user.email, detail="Wrong current password")
        raise HTTPException(status_code=400, detail="Your current password is not correct")
    if data.new_password == data.current_password:
        raise HTTPException(status_code=400, detail="The new password must be different from the current one")

    user.password_hash = hash_password(data.new_password)
    user.updated_at = now_utc()
    repository.save(db, user)

    # Everybody who might know the old password is logged out, except this browser
    ended = repository.revoke_all_sessions(db, user.id, keep_session_id=current.id)
    record(db, request, "password_change", user_id=user.id, email=user.email, detail=f"{ended} other session(s) ended")


def my_sessions(db: Session, user: User, current: LoginSession) -> list[dict]:
    return [
        {**session.model_dump(), "is_current": session.id == current.id}
        for session in repository.active_sessions(db, user.id)
    ]


def revoke_my_session(db: Session, request: Request, user: User, session_id: int) -> None:
    session = db.get(LoginSession, session_id)
    if session is None or session.user_id != user.id:  # someone else's session: pretend it isn't there
        raise HTTPException(status_code=404, detail="No session with this id")
    if session.revoked_at is None:
        session.revoked_at = now_utc()
        repository.save(db, session)
        record(db, request, "session_revoke", user_id=user.id, email=user.email, detail=f"Session {session_id} ({session.browser})")
