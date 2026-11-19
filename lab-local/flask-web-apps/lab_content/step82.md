# Step 82 · Install the Application on the Server

**Module 17 of 17 — Deploying the Application**

**Goal:** Install the built wheel and run the CLI against the installed package.

## Instructions

Install the Application on the Server

```bash
# Install the wheel file
pip install flaskr-1.0.0-py3-none-any.whl
```

```bash
# Initialize the database
flask --app flaskr init-db
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 82` from a second terminal.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 82)
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
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
pip install build
python -m build --wheel
pip install flaskr-1.0.0-py3-none-any.whl
flask --app flaskr init-db
python -c 'import secrets; print(secrets.token_hex())'
pip install waitress
```

## Verify

```bash
./lab check 82
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkgpath` on `flaskr` — imported flaskr must resolve under site-packages — must contain "site-packages"
- `cli` on `flask --app flaskr init-db` — command flask, --app, flaskr, init-db — must contain "Initialized the database."

Stuck? `./lab solve --step 82` lays down the finished code up to this step, `./lab reset --module 17` puts the module back to its starter state.
