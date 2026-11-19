# Step 4 · Adding HTML Templates

**Module 1 of 17 — Getting Started with the Flask Web Framework**

**Goal:** Move the response into a Jinja2 template rendered with render_template().

## Instructions

Flask uses Jinja2 templates to generate HTML content. Let's create a template file and render it in our route.

• Create a new directory in your project called templates.

• Inside the templates directory, create a new file called index.html.

• Open the index.html file and add the following HTML code:

```html
<!doctype html>
   <html>
     <head>
       <title>Flask Quickstart</title>
     </head>
     <body>
       <h1>Hello, Flask!</h1>
     </body>
   </html>
```

```python
from flask import render_template

   @app.route("/")
   def hello_world():
       return render_template("index.html")
```

## Expected filesystem state afterwards

```
workspace/quickstart/          (as it should look after step 4)
├── templates/index.html   (this step)
├── app.py   (this step)
```

## Files this step touches

- `workspace/quickstart/templates/index.html`
- `workspace/quickstart/app.py`

## Verify

```bash
./lab check 4
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `quickstart/templates/index.html` — file quickstart/templates/index.html — at least 5 bytes
- `ast` on `quickstart/app.py` — Python AST of quickstart/app.py — imports flask:render_template, calls render_template
- `http` on `quickstart` — GET http://localhost:8080/ — must contain "Flask Quickstart", HTTP 200

Stuck? `./lab solve --step 4` lays down the finished code up to this step, `./lab reset --module 1` puts the module back to its starter state.
