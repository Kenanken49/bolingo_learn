from flask import Flask

from commands import greet

app = Flask(__name__)


@app.route("/")
def hello():
    return "Hello, Flask!"


# Step 22: put the standalone click command onto `flask`'s command line.
app.cli.add_command(greet)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
