# Step 72 · Test Blog Posts

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Test the blog views: index, create, update, delete and their guards.

## Instructions

Finally, we will write tests for blog posts. These tests ensure that users can create, update, and delete blog posts as expected.

Here is the code to add in tests/test_blog.py:

```python
# tests/test_blog.py

import pytest
from flaskr.db import get_db

def test_create(client, auth, app):
    auth.login()
    assert client.get('/create').status_code == 200
    client.post('/create', data={'title': 'created', 'body': ''})

    with app.app_context():
        db = get_db()
        count = db.execute('SELECT COUNT(id) FROM post').fetchone()[0]
        assert count == 2
```

This step runs a test suite. The checker executes it for real and reads the results.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 72)
├── tests/test_blog.py   (this step)
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
├── tests/test_auth.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/tests/test_blog.py`

## Verify

```bash
./lab check 72
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/tests/test_blog.py` — Python AST of flaskr-app/tests/test_blog.py — defines test_index, test_create, test_update_get, test_delete_post
- `pytest` on `flaskr-app` — pytest tests/test_blog.py

Stuck? `./lab solve --step 72` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
