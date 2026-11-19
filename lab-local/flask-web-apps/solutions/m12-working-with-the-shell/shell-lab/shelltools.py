import sqlite3

DATABASE = "lab.sqlite"

SCHEMA = """
CREATE TABLE IF NOT EXISTS demo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
"""


def initialize_database():
    """Create the tables the shell exercises need."""
    with sqlite3.connect(DATABASE) as db:
        db.executescript(SCHEMA)
        db.commit()
    return DATABASE


def drop_tables():
    """Remove them again, so the lab can be run repeatedly."""
    with sqlite3.connect(DATABASE) as db:
        db.execute("DROP TABLE IF EXISTS demo")
        db.commit()
    return DATABASE
