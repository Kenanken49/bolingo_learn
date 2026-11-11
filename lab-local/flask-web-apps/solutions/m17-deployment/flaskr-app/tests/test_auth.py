from flaskr.db import get_db


def test_register(client, app):
    # the form is there before anything is submitted
    response = client.get("/auth/register")
    assert response.status_code == 200
    assert b'<input name="username"' in response.data

    # a real POST writes a real row
    response = client.post(
        "/auth/register", data={"username": "tester", "password": "test-password"}
    )
    assert response.status_code == 302
    assert response.headers["Location"] in ("/", "http://localhost/")

    with app.app_context():
        assert (
            get_db()
            .execute("SELECT * FROM user WHERE username = ?", ("tester",))
            .fetchone()
            is not None
        )


def test_register_rejects_empty(client):
    response = client.post("/auth/register", data={"username": "", "password": ""})
    assert b"Username is required." in response.data


def test_login_logout_edit(client, app, auth):
    # the guard sends anonymous visitors to the login page
    response = client.get("/create")
    assert response.status_code == 302
    assert "/auth/login" in response.headers["Location"]

    auth.login()
    response = client.get("/create")
    assert response.status_code == 200
    assert b'<input name="title"' in response.data

    with app.app_context():
        post_id = get_db().execute("SELECT id FROM post ORDER BY id LIMIT 1").fetchone()[0]

    response = client.get(f"/{post_id}/update")
    assert response.status_code == 200

    response = auth.logout()
    assert response.status_code == 302

    response = client.get("/create")
    assert response.status_code == 302
    assert "/auth/login" in response.headers["Location"]


def test_login_bad_password(client, auth):
    response = auth.login(password="wrong-password")
    assert b"Incorrect password." in response.data
