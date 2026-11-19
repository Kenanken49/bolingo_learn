import click
from flask import Flask, redirect, request, session, url_for


def create_app(test_config=None):
    """The app under test, built the same way flaskr builds itself."""
    app = Flask(__name__)
    app.config.from_mapping(SECRET_KEY="dev", LAB_PASSWORD="dev-password")

    if test_config is not None:
        app.config.from_mapping(test_config)

    @app.route("/")
    def hello():
        if "username" in session:
            return f"Hello, {session['username']}!"
        return "Hello, World!"

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if request.method == "POST":
            username = request.form.get("username")
            password = request.form.get("password")

            if username == "admin" and password == app.config["LAB_PASSWORD"]:
                session["username"] = username
                return redirect(url_for("hello"))

            return "Invalid credentials", 401

        return (
            '<form method="post">'
            '<input name="username"><input name="password" type="password">'
            '<input type="submit" value="Log In">'
            "</form>"
        )

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("hello"))

    @app.cli.command("hello")
    @click.argument("name", default="CLI")
    def hello_command(name):
        """Print a greeting from the command line."""
        click.echo(f"Hello, {name}!")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8080, debug=True)
