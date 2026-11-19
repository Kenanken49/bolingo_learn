import secrets

from flask import Flask, abort, render_template, request, session

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev"


@app.route("/form")
def form():
    """Issue a per-session token and put it in the form as a hidden field."""
    token = session.get("csrf_token")
    if token is None:
        token = secrets.token_hex(16)
        session["csrf_token"] = token

    return render_template("form.html", token=token)


@app.route("/delete", methods=["POST"])
def delete():
    """A state-changing route: refuse anything whose token is not ours.

    A request that carries no token at all must be refused too, so the session
    token is checked for first - comparing two missing values would match.
    """
    expected = session.get("csrf_token")
    if expected is None or expected != request.form.get("csrf_token"):
        abort(400, description="CSRF token missing or incorrect.")

    return "Post deleted."


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
