# Step 35 · Implement Login View

**Module 7 of 17 — Modular Application with Blueprints and Authentication**

**Goal:** Implement the login view that checks the password hash and opens a session.

## Instructions

Next, we will implement the login view in flaskr/auth.py. This view will handle user login functionality.

```python
# flaskr/auth.py

@bp.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        db = get_db()
        error = None
        user = db.execute(
            'SELECT * FROM user WHERE username = ?', (username,)
        ).fetchone()

        if user is None:
            error = 'Incorrect username.'
        elif not check_password_hash(user['password'], password):
            error = 'Incorrect password.'

        if error is None:
            session.clear()
            session['user_id'] = user['id']
            return redirect(url_for('index'))

        flash(error)

    return render_template('auth/login.html')
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 35)
├── flaskr/auth.py   (this step)
├── flaskr/templates/auth/login.html   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/auth.py`
- `workspace/flaskr-app/flaskr/templates/auth/login.html`

## Verify

```bash
./lab check 35
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/auth.py` — Python AST of flaskr-app/flaskr/auth.py — defines login, routes /login
- `http` on `flaskr-app` — GET http://localhost:8080/auth/login — HTTP 200

Stuck? `./lab solve --step 35` lays down the finished code up to this step, `./lab reset --module 7` puts the module back to its starter state.
