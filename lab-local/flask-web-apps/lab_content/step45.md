# Step 45 · Post Creation

**Module 9 of 17 — The Blog Application (CRUD)**

**Goal:** Let a logged-in user create a post that is written to the database.

## Instructions

Next, we'll create a view that allows logged-in users to create new blog posts.

```python
# flaskr/blog.py

@bp.route('/create', methods=('GET', 'POST'))
@login_required
def create():
    if request.method == 'POST':
        title = request.form['title']
        body = request.form['body']
        error = None

        if not title:
            error = 'Title is required.'

        if error is not None:
            flash(error)
        else:
            db = get_db()
            db.execute(
                'INSERT INTO post (title, body, author_id)'
                ' VALUES (?, ?, ?)',
                (title, body, g.user['id'])
            )
            db.commit()
            return redirect(url_for('blog.index'))

    return render_template('blog/create.html')
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 45)
├── flaskr/blog.py   (this step)
├── flaskr/templates/blog/create.html   (this step)
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
├── flaskr/templates/blog/index.html   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/blog.py`
- `workspace/flaskr-app/flaskr/templates/blog/create.html`

## Verify

```bash
./lab check 45
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/blog.py` — Python AST of flaskr-app/flaskr/blog.py — defines create, routes /create
- `script` on `blog_write.py` — probe script blog_write.py

Stuck? `./lab solve --step 45` lays down the finished code up to this step, `./lab reset --module 9` puts the module back to its starter state.
