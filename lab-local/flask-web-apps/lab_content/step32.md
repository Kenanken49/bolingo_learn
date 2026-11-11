# Step 32 · Create a Blueprint

**Module 7 of 17 — Modular Application with Blueprints and Authentication**

**Goal:** Create the auth blueprint module with its URL prefix.

## About this module

In this lab, we will walk through how to create and use Flask blueprints to structure your application using views. Flask blueprints allow you to group related views, code, and resources together making your application modular and scalable. We will create a simple application which will include user authentication and blog posts functionality.

Work in `workspace/flaskr-app/`. `./lab check 32` grades this step.

## Instructions

Let's start by creating a blueprint for our application. This blueprint will be named 'auth' and will handle user authentication related views. We will define our blueprint in a separate module named flaskr/auth.py.

```python
# flaskr/auth.py

import functools
from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from flaskr.db import get_db

# Create a Blueprint named 'auth'
bp = Blueprint('auth', __name__, url_prefix='/auth')
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 32)
├── flaskr/auth.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/auth.py`

## Verify

```bash
./lab check 32
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/auth.py` — Python AST of flaskr-app/flaskr/auth.py — imports functools:, flask:Blueprint, werkzeug.security:generate_password_hash, werkzeug.security:check_password_hash, flaskr.db:get_db
- `app` on `flaskr.auth:bp` — application factory flaskr.auth:bp — blueprint {"name":"auth","url_prefix":"/auth"}

Stuck? `./lab solve --step 32` lays down the finished code up to this step, `./lab reset --module 7` puts the module back to its starter state.
