"""
Small helpers used in many files.
"""

from datetime import datetime, timezone

from fastapi import Request


def now_utc() -> datetime:
    """The current time in UTC. We always save UTC so every time uses the same clock."""
    return datetime.now(timezone.utc)


def as_utc(moment: datetime | None) -> datetime | None:
    """SQLite gives times back without a time zone. We always saved UTC, so we put it back."""
    if moment is not None and moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def client_ip(request: Request) -> str:
    """The visitor's IP address. On Vercel the request passes a proxy first,
    which puts the real address at the start of the X-Forwarded-For header."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def client_browser(request: Request) -> str:
    """A short name for the browser, from the User-Agent header."""
    agent = request.headers.get("user-agent", "")
    for name in ("Edg", "OPR", "Chrome", "Firefox", "Safari"):
        if name in agent:
            browser = {"Edg": "Edge", "OPR": "Opera"}.get(name, name)
            break
    else:
        browser = "Other" if agent else "Unknown"
    for system in ("Windows", "Android", "iPhone", "Mac OS", "Linux"):
        if system in agent:
            return f"{browser} on {system.replace('Mac OS', 'macOS')}"
    return browser
