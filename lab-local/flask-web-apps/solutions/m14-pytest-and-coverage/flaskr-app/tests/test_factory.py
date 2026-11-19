from flaskr import create_app


def test_config():
    """The factory builds a configured, non-testing app by default."""
    assert not create_app().testing
    assert create_app({"TESTING": True}).testing
    assert create_app().config["SECRET_KEY"] == "dev"


def test_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Posts" in response.data

    response = client.get("/hello")
    assert response.data == b"Hello, World!"
