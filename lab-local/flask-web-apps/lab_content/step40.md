# Step 40 · Link CSS file in HTML

**Module 8 of 17 — Styling the Application with Static Files**

**Goal:** Attach the stylesheet from the base template with url_for('static').

## Instructions

Now, we need to link our CSS file in the HTML templates. Flask automatically adds a static view that serves static files. We can use the url_for function in the base.html template to link our CSS file.

```html+jinja
<!-- base.html -->

{{ url_for('static', filename='style.css') }}
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 40)
├── flaskr/templates/base.html   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
├── flaskr/static/style.css   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/templates/base.html`

## Verify

```bash
./lab check 40
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `flaskr-app` — GET http://localhost:8080/auth/login — must contain "/static/style.css", HTTP 200

Stuck? `./lab solve --step 40` lays down the finished code up to this step, `./lab reset --module 8` puts the module back to its starter state.
