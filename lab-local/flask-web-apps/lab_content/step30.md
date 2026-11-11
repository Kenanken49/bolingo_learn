# Step 30 · Registering with the Application

**Module 6 of 17 — SQLite Database Setup**

**Goal:** Register teardown and CLI hooks from the factory via db.init_app(app).

## Instructions

Registering with the Application

The close_db and init_db_command functions need to be registered with the application instance to be used by the application. Since we're using a factory function, we will write a function that takes an application and does the registration.

Add the following function to the db.py file:

Then, import and call this function from the factory. Add the following code to the __init__.py file:

```python
# flaskr/db.py

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
```

```python
# flaskr/__init__.py

def create_app():
    app = ...
    # existing code omitted

    from . import db
    db.init_app(app)

    return app
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 30)
├── flaskr/db.py   (this step)
├── flaskr/__init__.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/schema.sql   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/db.py`
- `workspace/flaskr-app/flaskr/__init__.py`

## Verify

```bash
./lab check 30
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/db.py` — Python AST of flaskr-app/flaskr/db.py — defines init_app, calls app.teardown_appcontext, app.cli.add_command
- `ast` on `flaskr-app/flaskr/__init__.py` — Python AST of flaskr-app/flaskr/__init__.py — calls db.init_app

Stuck? `./lab solve --step 30` lays down the finished code up to this step, `./lab reset --module 6` puts the module back to its starter state.
