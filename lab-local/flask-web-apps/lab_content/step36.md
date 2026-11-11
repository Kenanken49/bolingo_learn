# Step 36 · Implement Logout View

**Module 7 of 17 — Modular Application with Blueprints and Authentication**

**Goal:** Add the logout view that clears the session.

## Instructions

Let's now add a logout view in flaskr/auth.py. This view will handle user logout functionality.

```python
# flaskr/auth.py

@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 36)
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
./lab check 36
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/auth.py` — Python AST of flaskr-app/flaskr/auth.py — defines logout, calls session.clear, routes /logout
- `app` on `flaskr:create_app` — application factory flaskr:create_app — endpoints auth.logout

Stuck? `./lab solve --step 36` lays down the finished code up to this step, `./lab reset --module 7` puts the module back to its starter state.
