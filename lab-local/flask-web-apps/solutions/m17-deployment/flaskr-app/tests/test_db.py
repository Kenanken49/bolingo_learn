from flask import g

from flaskr.db import close_db, get_db


def test_get_close(app):
    """get_db caches one connection on g; close_db pops it when the context ends."""
    assert close_db in app.teardown_appcontext_funcs

    with app.app_context():
        db = get_db()
        assert g.db is db
        assert get_db() is db, "the same connection must be reused inside one context"

    with app.app_context():
        # the teardown handler ran when the previous context left the stack
        assert g.pop("db", None) is None
