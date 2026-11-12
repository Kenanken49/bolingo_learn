"""Shared bootstrap for the flaskr probes.

Everything here runs against the student's real code and their real SQLite
database: no responses are faked and no text is matched instead of state.
Probe rows are cleaned up afterwards so the lab stays reproducible.
"""
import os
import sys
import uuid


def fail(msg):
    print("FAIL " + msg)
    raise SystemExit(1)


def need_import(name, label):
    try:
        return __import__(name, fromlist=["_"])
    except Exception as exc:
        fail("cannot import %s (%s: %s)" % (label, type(exc).__name__, exc))


def boot():
    """create_app() + a working schema, exactly as the student would run it."""
    need_import("flaskr", "flaskr (is flaskr/__init__.py complete?)")
    from flaskr import create_app
    from flaskr.db import init_db

    app = create_app()
    app.config["TESTING"] = True
    try:
        with app.app_context():
            init_db()
    except Exception as exc:
        fail("flaskr.db.init_db() raised %s: %s - run: flask --app flaskr init-db" % (type(exc).__name__, exc))
    return app


def db(app):
    from flaskr.db import get_db
    return get_db()


def register(app, prefix="lab"):
    """Register + log in a throwaway user. Returns (client, username, password)."""
    username = "%s_%s" % (prefix, uuid.uuid4().hex[:8])
    password = "lab-pass-123"
    client = app.test_client()

    r = client.post("/auth/register", data={"username": username, "password": password})
    loc = r.headers.get("Location", "")
    with app.app_context():
        row = db(app).execute("SELECT COUNT(*) FROM user WHERE username = ?", (username,)).fetchone()
    if not row[0]:
        fail("POST /auth/register did not store user %r (status %s, Location %r) - check register() inserts and commits"
             % (username, r.status_code, loc))
    if "/auth/login" in loc:
        fail("POST /auth/register bounced back to the login page for %r - registration must redirect to the blog index"
             % username)

    r = client.post("/auth/login", data={"username": username, "password": password})
    if r.status_code not in (200, 301, 302, 303):
        fail("POST /auth/login returned %s, expected a redirect" % r.status_code)
    with app.app_context():
        still = db(app).execute("SELECT COUNT(*) FROM user WHERE username = ?", (username,)).fetchone()
    if not still[0]:
        fail("user %r disappeared after login" % username)
    return client, username, password


def cleanup(app, usernames):
    with app.app_context():
        handle = db(app)
        for name in usernames:
            row = handle.execute("SELECT id FROM user WHERE username = ?", (name,)).fetchone()
            if row:
                handle.execute("DELETE FROM post WHERE author_id = ?", (row[0],))
                handle.execute("DELETE FROM user WHERE id = ?", (row[0],))
        handle.commit()


def create_post(client, prefix="Post"):
    title = "%s %s" % (prefix, uuid.uuid4().hex[:6])
    body = "Body written by the verification engine for %s." % title
    r = client.post("/create", data={"title": title, "body": body})
    if r.status_code not in (200, 301, 302, 303):
        fail("POST /create returned %s, expected 200/302" % r.status_code)
    return title, body


def find_post(app, title):
    """Return (id, title, body, author_id) or None. Positional so any row_factory works."""
    with app.app_context():
        row = db(app).execute(
            "SELECT p.id, p.title, p.body, p.author_id FROM post p WHERE p.title = ?", (title,)
        ).fetchone()
    return None if row is None else tuple(row)


def post_count(app):
    with app.app_context():
        return db(app).execute("SELECT COUNT(*) FROM post").fetchone()[0]


def table_names(app):
    with app.app_context():
        rows = db(app).execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    return {r[0] for r in rows}


def say_ok(msg):
    print("OK " + msg)
    return True


def ensure_lab_dir():
    if not os.path.isdir("flaskr"):
        fail("probe must run from the flaskr application directory (cwd=%s)" % os.getcwd())
    sys_path = os.getcwd()
    if sys_path not in sys.path:
        sys.path.insert(0, sys_path)
