from flask import Flask

app = Flask(__name__, instance_relative_config=True)

# Step 49: configuration set one key at a time, straight on the dict.
app.config["DEBUG"] = True
app.config["SECRET_KEY"] = "mysecretkey"


@app.route("/")
def hello():
    return "Hello, Config Lab!"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=app.config["DEBUG"])
