import os

from flask import Flask

app = Flask(__name__, instance_relative_config=True)

# Development defaults that are safe to commit...
app.config.from_object("config")

if os.environ.get("FLASK_ENV") == "production":
    app.config.from_object("config_prod")

# ...and the deployment's real values, kept out of version control.
# The instance folder is only read because instance_relative_config=True.
app.config.from_pyfile("config.cfg", silent=True)


@app.route("/")
def hello():
    return "Hello, Config Lab!"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=app.config.get("DEBUG", False))
