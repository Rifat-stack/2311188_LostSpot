"""
Login and token tests.
"""

from datetime import timedelta

import jwt

from app.config import get_jwt_secret
from app.helpers import now_utc
from tests.conftest import PASSWORD, new_account


def test_login_gives_access_token_and_httponly_refresh_cookie(client):
    account = new_account()
    answer = client.post("/api/auth/login", json={"email": account["email"], "password": PASSWORD})

    assert answer.status_code == 200
    assert "access_token" in answer.json()
    assert "refresh_token" not in answer.json()  # it must only be in the cookie
    cookie_header = answer.headers["set-cookie"].lower()
    assert "lostspot_refresh=" in cookie_header and "httponly" in cookie_header


def test_wrong_password_is_rejected(client):
    account = new_account()
    answer = client.post("/api/auth/login", json={"email": account["email"], "password": "wrong-pass1"})
    assert answer.status_code == 401


def test_account_is_locked_after_five_wrong_passwords(client):
    account = new_account()
    for _ in range(4):
        assert client.post("/api/auth/login", json={"email": account["email"], "password": "wrong-pass1"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": account["email"], "password": "wrong-pass1"}).status_code == 429
    # Even the right password is refused while the account is locked
    assert client.post("/api/auth/login", json={"email": account["email"], "password": PASSWORD}).status_code == 429


def test_missing_token_is_rejected(client):
    assert client.get("/api/users/me").status_code == 401


def test_tampered_token_is_rejected(client):
    account = new_account()
    token = account["headers"]["Authorization"].split()[1]
    header, payload, signature = token.split(".")
    tampered = f"{header}.{payload}.{signature[:-2]}xx"  # change the signature
    assert client.get("/api/users/me", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401


def test_token_signed_with_another_secret_is_rejected(client):
    account = new_account()
    fake = jwt.encode(
        {"sub": str(account["id"]), "role": "admin", "sid": 1, "type": "access", "exp": now_utc() + timedelta(minutes=5)},
        "this-is-not-the-real-secret-of-lostspot-at-all",
        algorithm="HS256",
    )
    assert client.get("/api/users/me", headers={"Authorization": f"Bearer {fake}"}).status_code == 401


def test_expired_token_is_rejected(client):
    account = new_account()
    real = jwt.decode(account["headers"]["Authorization"].split()[1], get_jwt_secret(), algorithms=["HS256"])
    expired = jwt.encode({**real, "exp": now_utc() - timedelta(minutes=1)}, get_jwt_secret(), algorithm="HS256")

    answer = client.get("/api/users/me", headers={"Authorization": f"Bearer {expired}"})
    assert answer.status_code == 401
    assert answer.json()["detail"] == "Your access token has expired"


def test_refresh_rotates_the_refresh_token():
    account = new_account()
    browser = account["browser"]
    old_cookie = browser.cookies.get("lostspot_refresh")

    assert browser.post("/api/auth/refresh").status_code == 200
    assert browser.cookies.get("lostspot_refresh") != old_cookie

    # The old refresh token no longer works
    browser.cookies.clear()
    browser.cookies.set("lostspot_refresh", old_cookie, path="/api/auth")
    assert browser.post("/api/auth/refresh").status_code == 401


def test_logout_ends_the_session_at_once():
    account = new_account()
    browser = account["browser"]
    assert browser.get("/api/users/me", headers=account["headers"]).status_code == 200

    old_cookie = browser.cookies.get("lostspot_refresh")
    browser.post("/api/auth/logout")
    # The access token has not expired yet, but its session has ended
    assert browser.get("/api/users/me", headers=account["headers"]).status_code == 401
    # The cookie was deleted (204 = nobody is logged in), and the old refresh token is dead too
    assert browser.post("/api/auth/refresh").status_code == 204
    browser.cookies.set("lostspot_refresh", old_cookie, path="/api/auth")
    assert browser.post("/api/auth/refresh").status_code == 401
