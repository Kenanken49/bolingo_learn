# Step 37 · Implement Login Required Decorator

**Module 7 of 17 — Modular Application with Blueprints and Authentication**

**Goal:** Write the login_required decorator that guards views behind the session.

## Instructions

Implement Login Required Decorator

We will also need a decorator to protect our views that require a user to be logged in. This decorator will be implemented in flaskr/auth.py.

```python
# flaskr/auth.py

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('auth.login'))

        return view(**kwargs)

    return wrapped_view
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 37)
├── flaskr/auth.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/auth.py`

## Verify

```bash
./lab check 37
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/auth.py` — Python AST of flaskr-app/flaskr/auth.py — imports functools:, defines login_required
- `script` on `auth_guard.py` — probe script auth_guard.py

Stuck? `./lab solve --step 37` lays down the finished code up to this step, `./lab reset --module 7` puts the module back to its starter state.
