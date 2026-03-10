"""SQLite persistence layer."""

import json, sqlite3, time
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent / "catan.db"
_conn: sqlite3.Connection | None = None


def _get():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def init():
    c = _get()
    c.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            code       TEXT PRIMARY KEY,
            state      TEXT NOT NULL,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        )
    """)
    c.commit()


def create_room(code: str, state: dict):
    now = time.time()
    _get().execute(
        "INSERT INTO rooms (code, state, created_at, updated_at) VALUES (?,?,?,?)",
        (code, json.dumps(state), now, now),
    )
    _get().commit()


def get_room(code: str) -> sqlite3.Row | None:
    return _get().execute("SELECT * FROM rooms WHERE code=?", (code,)).fetchone()


def save_state(code: str, state: dict):
    _get().execute(
        "UPDATE rooms SET state=?, updated_at=? WHERE code=?",
        (json.dumps(state), time.time(), code),
    )
    _get().commit()


def count_rooms() -> int:
    row = _get().execute("SELECT COUNT(*) as c FROM rooms").fetchone()
    return row["c"] if row else 0


def delete_expired(ttl: float):
    cutoff = time.time() - ttl
    _get().execute("DELETE FROM rooms WHERE updated_at < ?", (cutoff,))
    _get().commit()
