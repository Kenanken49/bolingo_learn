# Step 69 · Write Tests for Factory

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Test the application factory: configuration and the hello view.

## Instructions

Next, we will write tests for the factory function which is responsible for creating the Flask application. These tests ensure that the application behaves as expected based on the configuration passed to it.

Here is the code to add in tests/test_factory.py:

```python
# tests/test_factory.py

from flaskr import create_app

def test_config():
    assert not create_app().testing
    assert create_app({'TESTING': True}).testing

def test_hello(client):
    response = client.get('/hello')
    assert response.data == b'Hello, World!'
```

This step runs a test suite. The checker executes it for real and reads the results.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 69)
├── tests/test_factory.py   (this step)
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
```

## Files this step touches

- `workspace/flaskr-app/tests/test_factory.py`

## Verify

```bash
./lab check 69
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/tests/test_factory.py` — Python AST of flaskr-app/tests/test_factory.py — defines test_config, test_index
- `pytest` on `flaskr-app` — pytest tests/test_factory.py

Stuck? `./lab solve --step 69` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
