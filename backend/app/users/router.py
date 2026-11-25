"""
The account routes.

    POST   /api/auth/register            make an account (you are logged in straight away)
    POST   /api/auth/login               log in with email and password
    POST   /api/auth/refresh             new access token, using the refresh cookie (204 if there is no cookie)
    POST   /api/auth/logout              end this session
    GET    /api/auth/demo-accounts       test accounts for the login page (from the DEMO_LOGINS setting)

    GET    /api/users/me                 my profile                   (needs login)
    PATCH  /api/users/me                 change my name               (needs login)
    PUT    /api/users/me/password        change my password           (needs login)
    GET    /api/users/me/sessions        where I am logged in         (needs login)
    DELETE /api/users/me/sessions/{id}   log out one of those places  (needs login)

The refresh token travels only in an httpOnly cookie. JavaScript can't read it, so a script
injected into the page can't steal it. The cookie is only sent to /api/auth/... addresses.
"""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.config import COOKIE_SECURE, REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, REFRESH_TOKEN_DAYS, get_demo_logins
from app.database import get_db
from app.users import service
from app.users.dependencies import get_current_session, get_current_user
from app.users.models import LoginSession, User
from app.users.schemas import (
    AuthResponse,
    LoginRequest,
    PasswordChange,
    ProfileUpdate,
    SessionResponse,
    SignUpRequest,
    UserResponse,
)

auth_router = APIRouter(prefix="/api/auth", tags=["Login"])
users_router = APIRouter(prefix="/api/users", tags=["My account"])


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
        httponly=True,       # JavaScript can't read it
        secure=COOKIE_SECURE,  # only sent over https (on Vercel)
        samesite="lax",      # not sent when another website posts to us
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH, httponly=True, secure=COOKIE_SECURE, samesite="lax"
    )


def send_tokens(response: Response, result: dict) -> dict:
    """Refresh token into the cookie, everything else into the JSON answer."""
    set_refresh_cookie(response, result.pop("refresh_token"))
    return result


# The refresh cookie, read by FastAPI from the request (None if the browser didn't send one)
RefreshCookie = Cookie(default=None, alias=REFRESH_COOKIE_NAME)


@auth_router.post("/register", response_model=AuthResponse, status_code=201)
def register(data: SignUpRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    return send_tokens(response, service.sign_up(db, request, data))


@auth_router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    return send_tokens(response, service.log_in(db, request, data))


@auth_router.post("/refresh", response_model=AuthResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db), refresh_token: str | None = RefreshCookie):
    # No cookie at all: a guest. That's normal (the app asks this on every page load), so it is
    # not an error: 204 = "nothing to send back". A cookie that is no good gives 401 below.
    if not refresh_token:
        return Response(status_code=204)
    try:
        result = service.refresh(db, request, refresh_token)
    except HTTPException as error:
        # The cookie is no good: tell the browser to throw it away
        answer = JSONResponse(status_code=error.status_code, content={"detail": error.detail})
        clear_refresh_cookie(answer)
        return answer
    return send_tokens(response, result)


@auth_router.get("/demo-accounts")
def demo_accounts():
    """The test accounts for the instructor. Empty unless DEMO_LOGINS is set on the server."""
    return get_demo_logins()


@auth_router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db), refresh_token: str | None = RefreshCookie):
    service.log_out(db, request, refresh_token)
    clear_refresh_cookie(response)
    return {"message": "Logged out"}


@users_router.get("/me", response_model=UserResponse)
def read_my_profile(user: User = Depends(get_current_user)):
    return user


@users_router.patch("/me", response_model=UserResponse)
def update_my_profile(
    data: ProfileUpdate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return service.update_profile(db, request, user, data)


@users_router.put("/me/password")
def change_my_password(
    data: PasswordChange,
    request: Request,
    user: User = Depends(get_current_user),
    current: LoginSession = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    service.change_password(db, request, user, current, data)
    return {"message": "Password changed. You have been logged out everywhere else."}


@users_router.get("/me/sessions", response_model=list[SessionResponse])
def list_my_sessions(
    user: User = Depends(get_current_user),
    current: LoginSession = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    return service.my_sessions(db, user, current)


@users_router.delete("/me/sessions/{session_id}")
def revoke_my_session(
    session_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service.revoke_my_session(db, request, user, session_id)
    return {"message": "Session ended"}
