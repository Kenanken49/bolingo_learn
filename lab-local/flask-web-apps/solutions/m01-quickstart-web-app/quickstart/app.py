from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def hello_world():
    """Step 2 served this view as a plain string; step 4 moved it to a template."""
    return render_template("index.html")


@app.route("/<name>")
def hello(name):
    """Step 6: the URL segment becomes template context."""
    return render_template("index.html", name=name)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
