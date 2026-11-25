"""
Database connection.

`engine` is the connection to the database.
`get_db()` gives each request its own session (a short "conversation" with the database)
and closes it automatically when the request is finished.
"""

from sqlalchemy import inspect, text
from sqlalchemy.pool import NullPool
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_database_url

DATABASE_URL = get_database_url()

if DATABASE_URL.startswith("sqlite"):
    # SQLite: allow FastAPI's worker threads to share the connection
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Supabase (PostgreSQL) through its connection pooler on port 6543:
    # - NullPool: don't keep our own pool, Supabase already does the pooling
    # - prepare_threshold=None: the pooler does not support prepared statements
    engine = create_engine(DATABASE_URL, poolclass=NullPool, connect_args={"prepare_threshold": None})


# Columns added after the mid-term. create_all() makes new tables, but it never changes a table
# that already exists, so the live `items` table would be missing these. We add them ourselves.
NEW_COLUMNS = {
    "items": {
        "owner_id": "INTEGER",        # who posted it
        "group_id": "INTEGER",        # the group it belongs to (empty = a personal post)
        "assigned_to_id": "INTEGER",  # the group member handling it
    },
}


def add_missing_columns() -> None:
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, columns in NEW_COLUMNS.items():
            if not inspector.has_table(table):
                continue  # create_all() will make the whole table with every column
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))


def create_tables() -> None:
    """Add new columns to old tables, then create every table that does not exist yet."""
    add_missing_columns()
    SQLModel.metadata.create_all(engine)


def get_db():
    """Open a session for one request, then close it."""
    with Session(engine) as db:
        yield db
