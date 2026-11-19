import sqlite3

from flask import Flask, g

app = Flask(__name__)
app.config["DATABASE"] = "lab.sqlite"


@app.before_request
def before_request():
    g.db = sqlite3.connect(app.config["DATABASE"])


@app.teardown_appcontext
def teardown_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


@app.after_request
def after_request(response):
    response.headers["X-Lab-Step"] = "shell"
    return response


@app.route("/")
def index():
    return "Hello, Shell!"
