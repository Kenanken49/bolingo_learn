from flask import Flask

app = Flask(__name__)


@app.route("/")
def hello():
    return "Hello, Flask!"


# Step 17: the app can now be started straight from Python, which is what the
# debugger tutorial in this module uses. `flask run` simply ignores this block.
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
