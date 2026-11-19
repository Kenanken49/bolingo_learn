# Step 25 · Configuring the Application

**Module 5 of 17 — Building a Flask Application (Application Factory)**

**Goal:** Load instance/test config, create the instance folder, and add the hello route.

## Instructions

In the same __init__.py file, add the necessary configuration details for your application. This includes setting up a secret key and specifying the location of your database file.

```python
# flaskr/__init__.py

# More code above...

if test_config is None:
    # load the instance config, if it exists, when not testing
    app.config.from_pyfile('config.py', silent=True)
else:
    # load the test config if passed in
    app.config.from_mapping(test_config)

# ensure the instance folder exists
try:
    os.makedirs(app.instance_path)
except OSError:
    pass

# a simple page that says hello
@app.route('/')
def hello():
    return 'Hello, World!'
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 25)
├── flaskr/__init__.py   (this step)
├── flaskr/   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/__init__.py`

## Verify

```bash
./lab check 25
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/__init__.py` — Python AST of flaskr-app/flaskr/__init__.py — defines hello, calls app.config.from_pyfile, os.makedirs

Stuck? `./lab solve --step 25` lays down the finished code up to this step, `./lab reset --module 5` puts the module back to its starter state.
