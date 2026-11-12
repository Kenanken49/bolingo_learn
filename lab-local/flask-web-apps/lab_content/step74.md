# Step 74 · Cross-Site Scripting (XSS)

**Module 15 of 17 — Secure Web Application Development**

**Goal:** Render user input through Jinja2 autoescaping so a script tag stays inert data.

## About this module

In this lab, we will explore important security considerations when developing web applications using Flask. We will cover topics such as Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), JSON security, security headers, and secure cookie options. By following these steps, you will learn how to enhance the security of your Flask applications.

Work in `workspace/secure-lab/`. `./lab check 74` grades this step.

## Instructions

Cross-Site Scripting (XSS) is a vulnerability that allows attackers to inject malicious scripts into web pages viewed by users. To prevent XSS attacks in Flask, follow these guidelines:

• Always escape text to prevent the inclusion of arbitrary HTML tags. • Be cautious when generating HTML without the help of Jinja2 templates. • Use the Markup class to escape user-submitted data. • Avoid sending out HTML or text files from uploaded files.

To run the code, save it in a file called app.py and execute the command flask run.

```python
# app.py

from flask import Flask, render_template_string, Markup

app = Flask(__name__)

@app.route('/')
def index():
    value = '<script>alert("XSS Attack")</script>'
    safe_value = Markup.escape(value)
    return render_template_string('<input value="{{ value }}">', value=safe_value)
```

## Expected filesystem state afterwards

```
workspace/secure-lab/          (as it should look after step 74)
├── xss/app.py   (this step)
├── xss/templates/greet.html   (this step)
```

## Files this step touches

- `workspace/secure-lab/xss/app.py`
- `workspace/secure-lab/xss/templates/greet.html`

## Verify

```bash
./lab check 74
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `secure-lab/xss/app.py` — Python AST of secure-lab/xss/app.py — defines greet, routes /
- `app` on `app:app` — application factory app:app — must contain "&lt;script&gt;", in-process GET /, HTTP 200

Stuck? `./lab solve --step 74` lays down the finished code up to this step, `./lab reset --module 15` puts the module back to its starter state.
