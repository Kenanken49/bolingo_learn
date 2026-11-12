# Step 34 · Implement Registration View

**Module 7 of 17 — Modular Application with Blueprints and Authentication**

**Goal:** Implement the registration view that stores a hashed password.

## Instructions

Now, let's implement the registration view in flaskr/auth.py. This view will render a registration form and handle form submission.

```python
# flaskr/auth.py

@bp.route('/register', methods=('GET', 'POST'))
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        db = get_db()
        error = None

        if not username:
            error = 'Username is required.'
        elif not password:
            error = 'Password is required.'

        if error is None:
            try:
                db.execute(
                    "INSERT INTO user (username, password) VALUES (?, ?)",
                    (username, generate_password_hash(password)),
                )
                db.commit()
            except db.IntegrityError:
                error = f"User {username} is already registered."
            else:
                return redirect(url_for("auth.login"))

        flash(error)

    return render_template('auth/register.html')
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 34)
├── flaskr/auth.py   (this step)
├── flaskr/templates/auth/register.html   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/auth.py`
- `workspace/flaskr-app/flaskr/templates/auth/register.html`

## Verify

```bash
./lab check 34
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/auth.py` — Python AST of flaskr-app/flaskr/auth.py — defines register, routes /register
- `http` on `flaskr-app` — GET http://localhost:8080/auth/register — HTTP 200

Stuck? `./lab solve --step 34` lays down the finished code up to this step, `./lab reset --module 7` puts the module back to its starter state.
