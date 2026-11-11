# Step 12 · Set up Flask Application

**Module 3 of 17 — Working with the Development Server**

**Goal:** Create the devserver-lab application module used for the whole module.

## About this module

In this tutorial, you will learn how to use the development server in Flask to run your Flask application during local development. The development server provides an interactive debugger and automatically reloads the code when changes are made. This tutorial will guide you through the steps to run the development server and handle common issues that may arise.

Work in `workspace/devserver-lab/`. `./lab check 12` grades this step.

## Instructions

Before we can run the development server, we need to set up a Flask application. Create a new Python file called app.py and add the following code:

In this code, we create a Flask application and define a route that returns a simple "Hello, Flask!" message. The if __name__ == "__main__": block ensures that the Flask application is only run when the script is executed directly, not when it is imported as a module.

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, Flask!'

if __name__ == "__main__":
    app.run(debug=True)
```

## Expected filesystem state afterwards

```
workspace/devserver-lab/          (as it should look after step 12)
├── app.py   (this step)
```

## Files this step touches

- `workspace/devserver-lab/app.py`

## Verify

```bash
./lab check 12
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `devserver-lab/app.py` — Python AST of devserver-lab/app.py — imports flask:Flask, defines hello, routes /

Stuck? `./lab solve --step 12` lays down the finished code up to this step, `./lab reset --module 3` puts the module back to its starter state.
