# Step 75 · Cross-Site Request Forgery (CSRF)

**Module 15 of 17 — Secure Web Application Development**

**Goal:** Reject a state-changing request that carries no CSRF token, accept one that does.

## Instructions

Cross-Site Request Forgery (CSRF)

Cross-Site Request Forgery (CSRF) is an attack that tricks users into performing unintended actions on a website. To prevent CSRF attacks in Flask, follow these guidelines:

• Use one-time tokens to validate requests that modify server content. • Store the token in the cookie and transmit it with form data. • Compare the token received on the server with the one stored in the cookie.

To run the code, save it in a file called app.py and execute the command flask run.

```python
# app.py

from flask import Flask, request, session, redirect, url_for

app = Flask(__name__)
app.secret_key = 'secret_key'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/delete', methods=['POST'])
def delete_user():
    if request.method == 'POST':
        token = request.form.get('token')
        if token and token == session.get('csrf_token'):
            # Delete user profile
            return redirect(url_for('index'))
    return 'Invalid request'

if __name__ == '__main__':
    app.run()
```

## Expected filesystem state afterwards

```
workspace/secure-lab/          (as it should look after step 75)
├── csrf/app.py   (this step)
├── csrf/templates/form.html   (this step)
├── xss/app.py   (earlier step)
├── xss/templates/greet.html   (earlier step)
```

## Files this step touches

- `workspace/secure-lab/csrf/app.py`
- `workspace/secure-lab/csrf/templates/form.html`

## Verify

```bash
./lab check 75
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `secure-lab/csrf/app.py` — Python AST of secure-lab/csrf/app.py — defines form, delete
- `script` on `csrf_guard.py` — probe script csrf_guard.py

Stuck? `./lab solve --step 75` lays down the finished code up to this step, `./lab reset --module 15` puts the module back to its starter state.
