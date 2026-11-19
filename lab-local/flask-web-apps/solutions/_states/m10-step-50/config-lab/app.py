from flask import Flask

app = Flask(__name__, instance_relative_config=True)

# Step 50: the keys live in another module and are copied in one call.
app.config.from_object("config")


@app.route("/")
def hello():
    return "Hello, Config Lab!"
