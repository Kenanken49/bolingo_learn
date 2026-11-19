from flask import Flask, render_template

app = Flask(__name__)

POSTS = [
    {"title": "First post", "author": "Amina", "body": "Jinja2 keeps the markup out of Python."},
    {"title": "Second post", "author": "Kimani", "body": "Autoescaping turns <b> into data, not tags."},
]


@app.route("/")
def index():
    return render_template("index.html", title="Welcome to Flask Jinja2 Templates Lab", posts=POSTS)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
