# Step 83 · Configure the Secret Key

**Module 17 of 17 — Deploying the Application**

**Goal:** Give the installed application a real secret key in its instance folder.

## Instructions

Create a config.py file in the instance folder and set SECRET_KEY to the generated value.

```bash
# Generate a random secret key
python -c 'import secrets; print(secrets.token_hex())'
```

```python
# .venv/var/flaskr-instance/config.py

SECRET_KEY = 'your_generated_secret_key'
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 83)
├── instance/config.py   (this step)
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
├── tests/test_blog.py   (earlier step)
├── .coverage   (earlier step)
├── dist/   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/instance/config.py`

## Verify

```bash
./lab check 83
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `flaskr-app/instance/config.py` — file flaskr-app/instance/config.py — at least 1 bytes
- `script` on `instance_secret.py` — probe script instance_secret.py

Stuck? `./lab solve --step 83` lays down the finished code up to this step, `./lab reset --module 17` puts the module back to its starter state.
