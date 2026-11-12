# Step 10 · Create a Jinja2 Template

**Module 2 of 17 — Flask + Jinja2 Templates**

**Goal:** Author the Jinja2 template that the index view renders.

## Instructions

Create a new directory called templates in the same directory as your app.py file. Inside the templates directory, create a new file called index.html. This file will contain the HTML code for your template.

In this template, we have a simple HTML structure with a heading and a paragraph. You can customize the content of the template to fit your needs.

```html
<!doctype html>
<html>
  <head>
    <title>Flask Jinja2 Templates Lab</title>
  </head>
  <body>
    <h1>Welcome to Flask Jinja2 Templates Lab</h1>
    <p>This is a simple Flask application using Jinja2 templates.</p>
  </body>
</html>
```

## Expected filesystem state afterwards

```
workspace/templates-lab/          (as it should look after step 10)
├── templates/index.html   (this step)
├── app.py   (earlier step)
```

## Files this step touches

- `workspace/templates-lab/templates/index.html`

## Verify

```bash
./lab check 10
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `templates-lab/templates/index.html` — file templates-lab/templates/index.html — at least 6 bytes
- `ast` on `templates-lab/app.py` — Python AST of templates-lab/app.py

Stuck? `./lab solve --step 10` lays down the finished code up to this step, `./lab reset --module 2` puts the module back to its starter state.
