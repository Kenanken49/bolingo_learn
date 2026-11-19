from flask import Flask, render_template, request

app = Flask(__name__)


@app.route("/")
def greet():
    """User input goes to the template as data, never as markup."""
    name = request.args.get("name", "stranger")
    return render_template("greet.html", name=name)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
