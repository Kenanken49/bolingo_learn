# Step 68 · Setup and Fixtures

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Build the fixtures that give every test a fresh temporary database loaded from tests/data.sql.

## Instructions

Next, we will set up test fixtures in a file called conftest.py. A fixture is a function that is run before each test function to which it is applied.

In this step, we will create a temporary database and populate it with some data for testing.

Here is the code to add in tests/conftest.py:

```python
# tests/conftest.py

import os
import tempfile
import pytest
from flaskr import create_app
from flaskr.db import get_db, init_db

with open(os.path.join(os.path.dirname(__file__), 'data.sql'), 'rb') as f:
    _data_sql = f.read().decode('utf8')

@pytest.fixture
def app():
    db_fd, db_path = tempfile.mkstemp()

    app = create_app({
        'TESTING': True,
        'DATABASE': db_path,
    })

    with app.app_context():
        init_db()
        get_db().executescript(_data_sql)

    yield app

    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 68)
├── tests/conftest.py   (this step)
├── tests/data.sql   (this step)
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
```

## Files this step touches

- `workspace/flaskr-app/tests/conftest.py`
- `workspace/flaskr-app/tests/data.sql`

## Verify

```bash
./lab check 68
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `flaskr-app/tests/data.sql` — file flaskr-app/tests/data.sql — at least 2 bytes
- `ast` on `flaskr-app/tests/conftest.py` — Python AST of flaskr-app/tests/conftest.py — imports tempfile:, pytest:, flaskr:create_app, flaskr.db:get_db, defines app, client, runner
- `cli` on `python -m pytest --collect-only -q` — command python, -m, pytest, --collect-only, -q

Stuck? `./lab solve --step 68` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
