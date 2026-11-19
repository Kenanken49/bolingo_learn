# Step 27 · Setting up the Database

**Module 6 of 17 — SQLite Database Setup**

**Goal:** Add per-request SQLite connections stored on flask.g, closed on teardown.

## About this module

In this lab, we will learn how to define and access a SQLite database using the Python Flask framework. We will set up a SQLite database, establish a connection with it, create tables, and initialize the database.

Work in `workspace/flaskr-app/`. `./lab check 27` grades this step.

## Instructions

First, we need to set up a SQLite database to store users and posts. SQLite is a convenient choice as it doesn't require a separate database server and is in-built in Python.

In our Flask application, we will create a connection to the SQLite database. This connection is typically tied to the request in web applications, and it is closed after the work is finished.

The connection is established using the sqlite3.connect function and we use the Flask's special object g to store and reuse the connection.

Create a new Python file db.py and add the following code:

```python
# flaskr/db.py

import sqlite3
from flask import current_app, g

def get_db():
    # Check if 'db' is not in 'g'
    if 'db' not in g:
        # Establish a connection to the database
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        # Return rows that behave like dicts
        g.db.row_factory = sqlite3.Row

    return g.db

def close_db(e=None):
    # Pop 'db' from 'g' and close the connection if it exists
    db = g.pop('db', None)

    if db is not None:
        db.close()
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 27)
├── flaskr/db.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/db.py`

## Verify

```bash
./lab check 27
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/db.py` — Python AST of flaskr-app/flaskr/db.py — imports sqlite3:, flask:current_app, flask:g, defines get_db, close_db

Stuck? `./lab solve --step 27` lays down the finished code up to this step, `./lab reset --module 6` puts the module back to its starter state.
