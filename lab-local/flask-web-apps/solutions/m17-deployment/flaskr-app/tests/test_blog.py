from flaskr.db import get_db


def test_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Posts" in response.data
    assert b"First post" in response.data


def test_create(client, auth, app):
    auth.login()
    response = client.post(
        "/create", data={"title": "From the test", "body": "Written by pytest."}
    )
    assert response.status_code == 302

    with app.app_context():
        row = (
            get_db()
            .execute("SELECT title, body FROM post WHERE title = ?", ("From the test",))
            .fetchone()
        )
        assert row is not None
        assert row["body"] == "Written by pytest."

    assert b"From the test" in client.get("/").data


def test_create_requires_title(client, auth, app):
    auth.login()
    response = client.post("/create", data={"title": "", "body": "no title"})
    assert b"Title is required." in response.data

    with app.app_context():
        assert (
            get_db().execute("SELECT * FROM post WHERE body = ?", ("no title",)).fetchone()
            is None
        )


def test_update_get(client, auth, app):
    auth.login()

    with app.app_context():
        post = get_db().execute("SELECT id, title FROM post ORDER BY id LIMIT 1").fetchone()

    response = client.get(f"/{post['id']}/update")
    assert response.status_code == 200
    assert post["title"].encode() in response.data

    response = client.post(
        f"/{post['id']}/update", data={"title": "Renamed by test", "body": "new body"}
    )
    assert response.status_code == 302

    with app.app_context():
        row = get_db().execute("SELECT title FROM post WHERE id = ?", (post["id"],)).fetchone()
        assert row["title"] == "Renamed by test"


def test_delete_post(client, auth, app):
    auth.login()

    with app.app_context():
        post_id = get_db().execute("SELECT id FROM post ORDER BY id DESC LIMIT 1").fetchone()[0]

    # the confirmation page is a real form
    response = client.get(f"/{post_id}/delete")
    assert response.status_code == 200
    assert b'name="confirm"' in response.data

    response = client.post(f"/{post_id}/delete", data={"confirm": "Delete"})
    assert response.status_code == 302

    with app.app_context():
        assert (
            get_db().execute("SELECT * FROM post WHERE id = ?", (post_id,)).fetchone() is None
        )

    assert f'/{post_id}/update'.encode() not in client.get("/").data
