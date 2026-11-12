# Step 67 · Install Pytest and Coverage

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Install the test and coverage tooling for the flaskr suite.

## About this module

In this lab, we will learn how to write unit tests for a Flask application. We will use pytest and coverage to test and measure our code. By the end of this lab, you will understand how to ensure your application works as expected and identify areas that need improvement.

Work in `workspace/flaskr-app/`. `./lab check 67` grades this step.

## Instructions

```bash
pip install pytest coverage
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 67)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
├── flaskr/static/style.css   (earlier step)
├── flaskr/templates/base.html   (earlier step)
├── flaskr/blog.py   (earlier step)
├── flaskr/templates/blog/index.html   (earlier step)
├── flaskr/templates/blog/create.html   (earlier step)
├── flaskr/templates/blog/update.html   (earlier step)
├── flaskr/templates/blog/delete.html   (earlier step)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 67
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `pytest` — importable package pytest
- `pkg` on `coverage` — importable package coverage

Stuck? `./lab solve --step 67` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
