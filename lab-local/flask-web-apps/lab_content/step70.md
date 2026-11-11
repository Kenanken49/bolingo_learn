# Step 70 · Test Database Connection

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Test that database connections are registered on g and closed after the context.

## Instructions

After testing the factory, we will test the database connection. These tests ensure that the database connection is established and closed as expected.

Here is the code to add in tests/test_db.py:

```python
# tests/test_db.py

import sqlite3
import pytest
from flaskr.db import get_db

def test_get_close_db(app):
    with app.app_context():
        db = get_db()
        assert db is get_db()

    with pytest.raises(sqlite3.ProgrammingError) as e:
        db.execute('SELECT 1')

    assert 'closed' in str(e.value)
```

This step runs a test suite. The checker executes it for real and reads the results.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 70)
├── tests/test_db.py   (this step)
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
```

## Files this step touches

- `workspace/flaskr-app/tests/test_db.py`

## Verify

```bash
./lab check 70
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/tests/test_db.py` — Python AST of flaskr-app/tests/test_db.py — defines test_get_close
- `pytest` on `flaskr-app` — pytest tests/test_db.py

Stuck? `./lab solve --step 70` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
