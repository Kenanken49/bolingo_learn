def test_hello(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Hello, World!" in response.data


def test_login(client):
    response = client.post("/login", data={"username": "admin", "password": "dev-password"})
    assert response.status_code == 302

    with client.session_transaction() as sess:
        assert sess["username"] == "admin"

    # and the greeting now knows who is logging in
    assert b"Hello, admin!" in client.get("/").data


def test_login_rejects_bad_password(client):
    response = client.post("/login", data={"username": "admin", "password": "wrong"})
    assert response.status_code == 401


def test_hello_command(runner):
    result = runner.invoke(args=["hello"])
    assert result.exit_code == 0
    assert "Hello, CLI!" in result.output
