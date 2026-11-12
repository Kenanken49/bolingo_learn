# Step 81 · Build the Application

**Module 17 of 17 — Deploying the Application**

**Goal:** Build a wheel for the flaskr project so it can be installed on a server.

## About this module

In this lab, we will learn how to deploy a Flask application to a server. We will create a distribution file for our application and install it on the server. The lab assumes you have a basic understanding of Flask, Python's virtual environments, and the command line.

Work in `workspace/flaskr-app/`. `./lab check 81` grades this step.

## Instructions

First, we need to create a wheel file for our application. We will use the build tool for this. Install the build tool using pip if you haven't already:

Now, use the build tool to create the wheel file:

The wheel file should be in the dist directory with a name like flaskr-1.0.0-py3-none-any.whl.

```bash
# Install the build tool
pip install build
```

```bash
# Build the wheel file
python -m build --wheel
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 81)
├── dist/   (this step)
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
```

## Files this step touches

- `workspace/flaskr-app/dist/`

## Verify

```bash
./lab check 81
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `build` — importable package build
- `file` on `flaskr-app/dist/flaskr-1.0.0-py3-none-any.whl` — file flaskr-app/dist/flaskr-1.0.0-py3-none-any.whl

Stuck? `./lab solve --step 81` lays down the finished code up to this step, `./lab reset --module 17` puts the module back to its starter state.
