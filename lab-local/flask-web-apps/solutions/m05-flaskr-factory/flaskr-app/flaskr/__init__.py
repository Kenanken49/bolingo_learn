import os

from flask import Flask


def create_app(test_config=None):
    """Application factory: a fresh, configured Flask app per call.

    `instance_relative_config=True` makes config paths resolve against the
    instance folder, which is outside the package and never checked in.
    """
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY="dev",
    )

    if test_config is None:
        # real runs: read instance/config.py if the deployment put one there
        app.config.from_pyfile("config.py", silent=True)
    else:
        # tests: an explicit mapping wins over anything on disk
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    # local-lab deviation from the upstream tutorial: this placeholder view
    # stays at "/" through module 8, because step 26 checks GET / for
    # "Hello, World!". Module 9 moves it to /hello when blog.index takes "/".
    @app.route("/")
    def hello():
        return "Hello, World!"

    return app
