# Step 73 · Run the Tests

**Module 14 of 17 — Unit Testing flaskr with pytest and Coverage**

**Goal:** Run the whole suite under coverage and read the report.

## Instructions

Now that we have written our tests, we can run them using the pytest command:

To measure the code coverage of your tests, use the coverage command to run pytest:

```bash
coverage run -m pytest
```

```bash
coverage report
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 73` from a second terminal.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 73)
├── .coverage   (this step)
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
├── tests/conftest.py   (earlier step)
├── tests/data.sql   (earlier step)
├── tests/test_factory.py   (earlier step)
├── tests/test_db.py   (earlier step)
├── tests/test_auth.py   (earlier step)
├── tests/test_blog.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/.coverage`

## Commands for this module (from the original lab)

```bash
pip install pytest coverage
```

## Verify

```bash
./lab check 73
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `cli` on `coverage run -m pytest` — command coverage, run, -m, pytest
- `cli` on `coverage report` — command coverage, report — must contain "TOTAL"
- `cli` on `coverage report` — command coverage, report

Stuck? `./lab solve --step 73` lays down the finished code up to this step, `./lab reset --module 14` puts the module back to its starter state.
