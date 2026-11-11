# Step 46 · Post Update

**Module 9 of 17 — The Blog Application (CRUD)**

**Goal:** Let the author edit their own post.

## Instructions

We'll add the ability for authors to update their own posts. To avoid duplicating code, we'll create a helper function to get a post and check if the current user is the author.

```python
# flaskr/blog.py

@bp.route('/<int:id>/update', methods=('GET', 'POST'))
@login_required
def update(id):
    post = get_post(id)

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
                'UPDATE post SET title = ?, body = ?'
                ' WHERE id = ?',
                (title, body, id)
            )
            db.commit()
            return redirect(url_for('blog.index'))

    return render_template('blog/update.html', post=post)
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 46)
├── flaskr/blog.py   (this step)
├── flaskr/templates/blog/update.html   (this step)
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
├── flaskr/templates/blog/create.html   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/blog.py`
- `workspace/flaskr-app/flaskr/templates/blog/update.html`

## Verify

```bash
./lab check 46
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/blog.py` — Python AST of flaskr-app/flaskr/blog.py — defines update, routes /<int:id>/update
- `script` on `blog_update.py` — probe script blog_update.py

Stuck? `./lab solve --step 46` lays down the finished code up to this step, `./lab reset --module 9` puts the module back to its starter state.
