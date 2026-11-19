# Step 78 · Set-Cookie Options

**Module 15 of 17 — Secure Web Application Development**

**Goal:** Set the session cookie with Secure, HttpOnly and SameSite attributes.

## Instructions

When setting cookies in Flask, it's important to consider security options to protect sensitive data. Some recommended options are:

• Secure: Limits cookies to HTTPS traffic only. • HttpOnly: Protects the contents of cookies from being read with JavaScript. • SameSite: Restricts how cookies are sent with requests from external sites.

To run the code, save it in a file called app.py and execute the command flask run.

```python
# app.py

from flask import Flask, make_response

app = Flask(__name__)

@app.route('/')
def index():
    response = make_response('Hello, world!')
    response.set_cookie('username', 'flask', secure=True, httponly=True, samesite='Lax')
    return response

if __name__ == '__main__':
    app.run()
```

## Expected filesystem state afterwards

```
workspace/secure-lab/          (as it should look after step 78)
├── cookies/app.py   (this step)
├── xss/app.py   (earlier step)
├── xss/templates/greet.html   (earlier step)
├── csrf/app.py   (earlier step)
├── csrf/templates/form.html   (earlier step)
├── headers/app.py   (earlier step)
```

## Files this step touches

- `workspace/secure-lab/cookies/app.py`

## Verify

```bash
./lab check 78
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `secure-lab/cookies/app.py` — Python AST of secure-lab/cookies/app.py — defines index, routes /
- `app` on `app:app` — application factory app:app — in-process GET /, cookie ["Secure","HttpOnly","SameSite=Lax"], HTTP 200

Stuck? `./lab solve --step 78` lays down the finished code up to this step, `./lab reset --module 15` puts the module back to its starter state.
