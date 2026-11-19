# Step 44 · Create Blog Index

**Module 9 of 17 — The Blog Application (CRUD)**

**Goal:** List every post with its author, newest first.

## Instructions

Now, let's create an index view to display all blog posts. We'll use a SQL JOIN to include author information from the user table in our results.

```python
# flaskr/blog.py

@bp.route('/')
def index():
    db = get_db()
    posts = db.execute(
        'SELECT p.id, title, body, created, author_id, username'
        ' FROM post p JOIN user u ON p.author_id = u.id'
        ' ORDER BY created DESC'
    ).fetchall()
    return render_template('blog/index.html', posts=posts)
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 44)
├── flaskr/blog.py   (this step)
├── flaskr/templates/blog/index.html   (this step)
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
- `workspace/flaskr-app/flaskr/templates/blog/index.html`

## Verify

```bash
./lab check 44
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/blog.py` — Python AST of flaskr-app/flaskr/blog.py — defines index, routes /
- `http` on `flaskr-app` — GET http://localhost:8080/ — must contain "Posts", HTTP 200

Stuck? `./lab solve --step 44` lays down the finished code up to this step, `./lab reset --module 9` puts the module back to its starter state.
