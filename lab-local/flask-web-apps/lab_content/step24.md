# Step 24 · Setting up the Application Factory

**Module 5 of 17 — Building a Flask Application (Application Factory)**

**Goal:** Write the application factory that instantiates and configures the app.

## Instructions

Setting up the Application Factory

Next, create an __init__.py file in the flaskr directory. This file serves two purposes: it will contain the application factory, and it signals to Python that the flaskr directory should be treated as a package.

In your __init__.py file, import the necessary modules and define a function, create_app(), that will instantiate and configure your application.

```python
# flaskr/__init__.py

import os
from flask import Flask

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
    )

    # More code to be added here...

    return app
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 24)
├── flaskr/__init__.py   (this step)
├── flaskr/   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/__init__.py`

## Verify

```bash
./lab check 24
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/__init__.py` — Python AST of flaskr-app/flaskr/__init__.py — imports os:, flask:Flask, defines create_app
- `app` on `flaskr:create_app` — application factory flaskr:create_app — config {"SECRET_KEY":"dev"}

Stuck? `./lab solve --step 24` lays down the finished code up to this step, `./lab reset --module 5` puts the module back to its starter state.
