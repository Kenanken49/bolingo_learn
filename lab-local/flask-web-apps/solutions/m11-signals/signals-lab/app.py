from blinker import Namespace

from flask import Flask

my_signals = Namespace()
model_saved = my_signals.signal("model-saved")


@model_saved.connect
def on_model_saved(sender, instance=None, **extra):
    """A receiver is just a function that got subscribed to the signal."""
    name = getattr(instance, "title", "unknown")
    print("Model saved!")
    print(f"  sender={sender!r} instance={name}")


app = Flask(__name__)
app.config["SECRET_KEY"] = "dev"

SAVED = []


@app.route("/")
def index():
    return (
        "<h1>Signals lab</h1>"
        "<p><a href='/save'>Save a model</a> - fires model_saved.</p>"
        f"<p>Saves so far: {len(SAVED)}</p>"
    )


@app.route("/save")
def save():
    class Model:
        title = "First post"

    instance = Model()
    SAVED.append(instance)
    # the framework never calls this for you: emitting is what runs receivers
    model_saved.send(app, instance=instance)
    return "Saved - check the server log for 'Model saved!'"


model_saved.send(app, instance=None)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
