# Step 33 · Register the Blueprint

**Module 7 of 17 — Modular Application with Blueprints and Authentication**

**Goal:** Register the auth blueprint from the application factory.

## Instructions

After creating the blueprint, we need to register it with our application. This is done in the application factory function in flaskr/__init__.py.

```python
# flaskr/__init__.py

def create_app():
    app = ...
    # existing code omitted

    # Import and register the blueprint
    from . import auth
    app.register_blueprint(auth.bp)

    return app
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 33)
├── flaskr/__init__.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/__init__.py`

## Verify

```bash
./lab check 33
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/__init__.py` — Python AST of flaskr-app/flaskr/__init__.py — calls app.register_blueprint
- `app` on `flaskr:create_app` — application factory flaskr:create_app — registers blueprint "auth"

Stuck? `./lab solve --step 33` lays down the finished code up to this step, `./lab reset --module 7` puts the module back to its starter state.
