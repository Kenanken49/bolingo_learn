import os

from flask import Flask

app = Flask(__name__, instance_relative_config=True)

# Step 51: the environment picks which settings module is loaded.
app.config.from_object("config")

if os.environ.get("FLASK_ENV") == "production":
    app.config.from_object("config_prod")


@app.route("/")
def hello():
    return "Hello, Config Lab!"
