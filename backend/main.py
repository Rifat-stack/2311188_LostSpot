"""
LostSpot backend: the FastAPI app.

Run it locally with:  fastapi dev main.py
Then open http://localhost:8000/api/docs to try the API.
"""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.admin.router import router as admin_router
from app.config import FRONTEND_ORIGINS
from app.database import create_tables
from app.groups.router import router as groups_router
from app.items.router import router as items_router
from app.users.router import auth_router, users_router

app = FastAPI(
    title="LostSpot API",
    description="Campus lost and found with accounts, groups and an admin dashboard.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

# CORS: only our own frontend may call the API from a browser.
# allow_credentials=True lets the browser send the refresh cookie.
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, error: Exception) -> JSONResponse:
    """Any error we didn't plan for: write the details to the server log for us,
    but only send a short message to the browser, never the stack trace."""
    logging.exception("Unexpected error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


app.include_router(auth_router)    # /api/auth/...  sign up, log in, refresh, log out
app.include_router(users_router)   # /api/users/me  profile, password, sessions
app.include_router(items_router)   # /api/items
app.include_router(groups_router)  # /api/groups
app.include_router(admin_router)   # /api/admin

# Make sure the tables exist before the first request
create_tables()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# dist/ only exists after `npm run build`; in dev the Vite server serves the UI.
if FRONTEND_DIR.is_dir():
    app.frontend("/", directory=FRONTEND_DIR, fallback="index.html")
