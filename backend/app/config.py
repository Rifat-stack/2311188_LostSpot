"""
Settings for LostSpot.

Everything secret or different between my laptop and Vercel comes from environment variables.
On my laptop nothing has to be set: each setting falls back to a safe value for local testing.
On Vercel the secrets MUST be set (see .env.example), otherwise the login routes refuse to work.
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ON_VERCEL = bool(os.getenv("VERCEL"))  # Vercel sets VERCEL=1 for us

# ---------- Database ----------

OPTIONS_TO_REMOVE = ("pgbouncer=", "supa=")  # Supabase adds these, but psycopg does not understand them


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

    # Nothing set: use a small SQLite file (on Vercel only /tmp can be written to)
    if not url:
        folder = Path("/tmp") if ON_VERCEL else BACKEND_DIR
        return f"sqlite:///{folder / 'lostspot.db'}"

    # Tell SQLAlchemy to use the psycopg driver
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg://" + url[len(prefix):]

    # Remove the options psycopg does not understand
    if "?" in url:
        base, options = url.split("?", 1)
        kept = [part for part in options.split("&") if not part.startswith(OPTIONS_TO_REMOVE)]
        url = base + ("?" + "&".join(kept) if kept else "")

    return url


# ---------- Login and tokens ----------

ACCESS_TOKEN_MINUTES = min(int(os.getenv("ACCESS_TOKEN_MINUTES", "15")), 15)  # never more than 15
REFRESH_TOKEN_DAYS = 7      # how long you stay logged in without typing the password
MAX_FAILED_LOGINS = 5       # wrong passwords in a row before the account is locked...
LOCK_MINUTES = 15           # ...for this many minutes
MAX_FAILED_LOGINS_PER_IP = 20  # wrong passwords from one IP address in LOCK_MINUTES, any account

REFRESH_COOKIE_NAME = "lostspot_refresh"
REFRESH_COOKIE_PATH = "/api/auth"  # the browser only sends the cookie to the login routes
COOKIE_SECURE = ON_VERCEL          # https only on Vercel; my laptop uses plain http


def _secret(name: str, local_value: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    if ON_VERCEL:
        raise RuntimeError(f"{name} is not set. Add it in Vercel -> Settings -> Environment Variables.")
    return local_value  # only ever used on my own computer


def get_jwt_secret() -> str:
    """Signs the access tokens. Anyone who knows it could make fake tokens."""
    return _secret("JWT_SECRET", "local-jwt-secret-only-for-my-own-computer")


def get_password_pepper() -> str:
    """A secret added to every password before hashing. It is not in the database,
    so a stolen copy of the database alone is not enough to start guessing passwords."""
    return _secret("PASSWORD_PEPPER", "local-pepper-only-for-my-own-computer")


# ---------- Other ----------

# Which websites may call the API from a browser (CORS). On Vercel the frontend and the API
# share one address, but the setting is still kept tight.
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]


def get_demo_logins() -> list[dict]:
    """Test accounts shown on the login page, so the instructor can log in with one click.

    They come from the DEMO_LOGINS environment variable on Vercel, never from the code,
    so no password is ever in the repository. Format, one account per part:
        label|email|password;label|email|password
    For example:  Admin|admin1@lostspot.test|Secret123;User|poster@lostspot.test|Secret456
    If DEMO_LOGINS is not set, the login page shows no test accounts.
    """
    accounts = []
    for part in os.getenv("DEMO_LOGINS", "").split(";"):
        pieces = [piece.strip() for piece in part.split("|")]
        if len(pieces) == 3 and all(pieces):
            label, email, password = pieces
            accounts.append({"label": label, "email": email, "password": password})
    return accounts
