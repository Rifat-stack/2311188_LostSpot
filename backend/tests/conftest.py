"""
Test setup: every test run uses a fresh SQLite file, never the real database.

The environment variable has to be set BEFORE the app is imported,
because app/config.py reads it when it is first imported.
"""

import os
import sys
import tempfile
import uuid
from pathlib import Path

import pytest

TEST_DB = Path(tempfile.gettempdir()) / f"lostspot-test-{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ.pop("VERCEL", None)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # so "import main" works

from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.database import engine  # noqa: E402
from app.users import repository  # noqa: E402
from main import app  # noqa: E402

PASSWORD = "secret123"


@pytest.fixture
def client():
    return TestClient(app)


def new_account(role: str = "user") -> dict:
    """Sign up a new user (with its own browser, so cookies don't mix) and give back its details."""
    browser = TestClient(app)
    email = f"{uuid.uuid4().hex[:10]}@example.com"
    answer = browser.post("/api/auth/register", json={"name": "Test", "email": email, "password": PASSWORD})
    assert answer.status_code == 201
    user_id = answer.json()["user"]["id"]

    if role == "admin":  # there is no API to make the first admin, so we change the database
        with Session(engine) as db:
            user = repository.find_user_by_id(db, user_id)
            user.role = "admin"
            repository.save(db, user)
        answer = browser.post("/api/auth/login", json={"email": email, "password": PASSWORD})

    token = answer.json()["access_token"]
    return {"id": user_id, "email": email, "browser": browser, "headers": {"Authorization": f"Bearer {token}"}}


def pytest_sessionfinish(session, exitstatus):
    TEST_DB.unlink(missing_ok=True)
