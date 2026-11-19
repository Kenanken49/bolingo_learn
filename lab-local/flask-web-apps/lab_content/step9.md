# Step 9 · Create a Flask Application

**Module 2 of 17 — Flask + Jinja2 Templates**

**Goal:** Create the templates-lab application that renders a template instead of a string.

## Instructions

Create a new file called app.py and import the necessary modules:

In this code, we create a new Flask application and define a route for the root URL ("/"). When a user visits the root URL, the index() function will be called and it will render the index.html template.

```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
```

## Expected filesystem state afterwards

```
workspace/templates-lab/          (as it should look after step 9)
├── app.py   (this step)
```

## Files this step touches

- `workspace/templates-lab/app.py`

## Verify

```bash
./lab check 9
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `templates-lab/app.py` — Python AST of templates-lab/app.py — imports flask:Flask, flask:render_template, defines index, routes /

Stuck? `./lab solve --step 9` lays down the finished code up to this step, `./lab reset --module 2` puts the module back to its starter state.
