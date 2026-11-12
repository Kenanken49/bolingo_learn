"""Everything `flask shell` gives you, from a plain script.

    python shell.py      # run the demonstration below
    flask --app app shell        # the interactive version
"""

from flask import request

from app import app
from shelltools import drop_tables, initialize_database


@app.shell_context_processor
def make_shell_context():
    """These names are waiting for you when you type `flask shell`."""
    return {"app": app, "initialize_database": initialize_database, "drop_tables": drop_tables}


if __name__ == "__main__":
    # a request context that no server created
    with app.test_request_context("/?page=2"):
        print("request.url  =", request.url)
        print("request.args =", dict(request.args))

        # fire the before_request handlers by hand, then the view, then after_request
        app.preprocess_request()
        response = app.make_response("Hello, Shell!")
        response = app.process_response(response)
        print("body         =", response.get_data(as_text=True))
        print("X-Lab-Step   =", response.headers.get("X-Lab-Step"))

    initialize_database()
    drop_tables()
    print("OK")
