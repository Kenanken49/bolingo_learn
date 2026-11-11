import pytest

from my_app import create_app


@pytest.fixture
def app():
    """One fresh application per test, in testing mode."""
    app = create_app({"TESTING": True, "WTF_CSRF_ENABLED": False})
    yield app


@pytest.fixture
def client(app):
    """A test client that talks to the app without a socket."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Used to invoke the app's CLI commands."""
    return app.test_cli_runner()
