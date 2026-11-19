# Step 48 · Create a Flask Application

**Module 10 of 17 — Configuration Management**

**Goal:** Create the config-lab application that configuration will be attached to.

## About this module

In this lab, you will learn how to handle configuration in a Flask application. Configuration allows you to change settings in your application based on different environments, such as toggling debug mode, setting secret keys, and other environment-specific variables.

Work in `workspace/config-lab/`. `./lab check 48` grades this step.

## Instructions

First, let's create a basic Flask application. Create a file called app.py and add the following code:

Open your web browser and visit http://localhost:5000 to see the "Hello, Flask!" message.

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, Flask!'
```

```bash
python app.py
```

## Expected filesystem state afterwards

```
workspace/config-lab/          (as it should look after step 48)
├── app.py   (this step)
```

## Files this step touches

- `workspace/config-lab/app.py`

This step replaces configuration written by an earlier step: `solutions/_states/m10-step-48/` holds that exact tree, and `./lab solve --step 48` applies it.

## Verify

```bash
./lab check 48
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `config-lab/app.py` — Python AST of config-lab/app.py — defines hello, routes /

Stuck? `./lab solve --step 48` lays down the finished code up to this step, `./lab reset --module 10` puts the module back to its starter state.
