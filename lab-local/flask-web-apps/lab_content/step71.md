# Step 71 · Test Authentication

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Test registration, login, logout and the login guard.

## Instructions

Next, we will write tests for user authentication. These tests ensure that users can log in and log out as expected, and that appropriate error messages are displayed when necessary.

Here is the code to add in tests/test_auth.py:

```python
# tests/test_auth.py

import pytest
from flask import g, session
from flaskr.db import get_db

def test_login(client, auth):
    assert client.get('/auth/login').status_code == 200
    response = auth.login()
    assert response.headers["Location"] == "/"

    with client:
        client.get('/')
        assert session['user_id'] == 1
        assert g.user['username'] == 'test'
```

This step runs a test suite. The checker executes it for real and reads the results.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 71)
├── tests/test_auth.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
├── flaskr/static/style.css   (earlier step)
├── flaskr/templates/base.html   (earlier step)
├── flaskr/blog.py   (earlier step)
├── flaskr/templates/blog/index.html   (earlier step)
├── flaskr/templates/blog/create.html   (earlier step)
├── flaskr/templates/blog/update.html   (earlier step)
├── flaskr/templates/blog/delete.html   (earlier step)
├── tests/conftest.py   (earlier step)
├── tests/data.sql   (earlier step)
├── tests/test_factory.py   (earlier step)
├── tests/test_db.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/tests/test_auth.py`

## Verify

```bash
./lab check 71
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/tests/test_auth.py` — Python AST of flaskr-app/tests/test_auth.py — defines test_register, test_login_logout_edit
- `pytest` on `flaskr-app` — pytest tests/test_auth.py

Stuck? `./lab solve --step 71` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
