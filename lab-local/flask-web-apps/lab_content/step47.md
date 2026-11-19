# Step 47 · Post Deletion

**Module 9 of 17 — The Blog Application (CRUD)**

**Goal:** Let the author delete their own post.

## Instructions

Lastly, we'll add the ability for authors to delete their own posts.

```python
# flaskr/blog.py

@bp.route('/<int:id>/delete', methods=('POST',))
@login_required
def delete(id):
    get_post(id)
    db = get_db()
    db.execute('DELETE FROM post WHERE id = ?', (id,))
    db.commit()
    return redirect(url_for('blog.index'))
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 47)
├── flaskr/blog.py   (this step)
├── flaskr/templates/blog/delete.html   (this step)
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
├── flaskr/templates/blog/update.html   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/blog.py`
- `workspace/flaskr-app/flaskr/templates/blog/delete.html`

## Verify

```bash
./lab check 47
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/blog.py` — Python AST of flaskr-app/flaskr/blog.py — defines delete, routes /<int:id>/delete
- `script` on `blog_delete.py` — probe script blog_delete.py

Stuck? `./lab solve --step 47` lays down the finished code up to this step, `./lab reset --module 9` puts the module back to its starter state.
