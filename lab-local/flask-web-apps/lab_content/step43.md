# Step 43 · Register Blueprint

**Module 9 of 17 — The Blog Application (CRUD)**

**Goal:** Register the blog blueprint and bind '/' to the blog index endpoint.

## Instructions

Next, we'll register the blueprint with our application.

```python
# flaskr/__init__.py

def create_app():
    app = ...
    # existing code omitted

    # import and register the blueprint from the factory using app.register_blueprint()
    from . import blog
    app.register_blueprint(blog.bp)
    app.add_url_rule('/', endpoint='index')

    return app
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 43)
├── flaskr/__init__.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
├── flaskr/static/style.css   (earlier step)
├── flaskr/templates/base.html   (earlier step)
├── flaskr/blog.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/__init__.py`

## Verify

```bash
./lab check 43
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `app` on `flaskr:create_app` — application factory flaskr:create_app — registers blueprint "blog"
- `app` on `flaskr:create_app` — application factory flaskr:create_app — url rule {"endpoint":"index","rule":"/"}

Stuck? `./lab solve --step 43` lays down the finished code up to this step, `./lab reset --module 9` puts the module back to its starter state.
