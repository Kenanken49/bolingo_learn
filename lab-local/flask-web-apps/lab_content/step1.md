# Step 1 · Setting up Flask

**Module 1 of 17 — Getting Started with the Flask Web Framework**

**Goal:** Install Flask and create the app module that the rest of the module builds on.

## About this module

This lab will guide you through the process of getting started with Flask, a lightweight web framework for Python. You will learn how to create a basic Flask application, run it locally, and understand the basic concepts of routing and rendering templates.

Work in `workspace/quickstart/`. `./lab check 1` grades this step.

## Instructions

To get started with Flask, you need to install it and set up a new project. Follow the instructions below:

• Open a new file and save it as app.py.

• Import the Flask module and create an instance of the Flask class:

```bash
pip install flask
```

```bash
cd ~/project
   touch app.py
```

```python
from flask import Flask

   app = Flask(__name__)
```

## Expected filesystem state afterwards

```
workspace/quickstart/          (as it should look after step 1)
├── app.py   (this step)
```

## Files this step touches

- `workspace/quickstart/app.py`

## Verify

```bash
./lab check 1
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `flask` — importable package flask
- `ast` on `quickstart/app.py` — Python AST of quickstart/app.py — imports flask:Flask, assigns app

Stuck? `./lab solve --step 1` lays down the finished code up to this step, `./lab reset --module 1` puts the module back to its starter state.
