# Step 42 · Define Blueprint

**Module 9 of 17 — The Blog Application (CRUD)**

**Goal:** Define the blog blueprint module.

## About this module

In this lab, we'll walk through creating a blog application using Flask, a popular web framework in Python. This application will list all blog posts, allow logged-in users to create posts, and let authors edit or delete their own posts.

Work in `workspace/flaskr-app/`. `./lab check 42` grades this step.

## Instructions

Firstly, we'll define a blueprint for our blog. A blueprint is a way to organize a group of related views and other code.

```python
# flaskr/blog.py

from flask import Blueprint, flash, g, redirect, render_template, request, url_for
from werkzeug.exceptions import abort

from flaskr.auth import login_required
from flaskr.db import get_db

# The Blueprint is named 'blog'. It's defined in the same file.
# The blueprint needs to know where it's defined, so __name__ is passed as the second argument.
bp = Blueprint('blog', __name__)
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 42)
├── flaskr/blog.py   (this step)
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
```

## Files this step touches

- `workspace/flaskr-app/flaskr/blog.py`

## Verify

```bash
./lab check 42
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/blog.py` — Python AST of flaskr-app/flaskr/blog.py — imports flask:Blueprint, flaskr.auth:login_required, flaskr.db:get_db
- `app` on `flaskr.blog:bp` — application factory flaskr.blog:bp — blueprint {"name":"blog"}

Stuck? `./lab solve --step 42` lays down the finished code up to this step, `./lab reset --module 9` puts the module back to its starter state.
