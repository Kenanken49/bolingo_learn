# Step 65 · Set up the Testing Environment

**Module 13 of 17 — Testing Flask Applications (pytest basics)**

**Goal:** Create the pytest fixtures that hand the app, test client and CLI runner to tests.

## About this module

In this lab, you will learn how to test Flask applications using the pytest framework. Testing is an important part of the software development process, as it helps to ensure the correctness and reliability of your application. Flask provides utilities for testing, making it easy to write tests for different parts of your application.

Work in `workspace/test-lab/`. `./lab check 65` grades this step.

## Instructions

• Install the pytest framework by running the following command:

• Create a new file called conftest.py in the tests folder of your Flask application.

• In the conftest.py file, import the necessary modules:

• Define a fixture named app that creates and configures an app instance:

```bash
pip install pytest
```

```python
import pytest
   from my_app import create_app
```

```python
@pytest.fixture()
   def app():
       app = create_app()
       app.config.update({
           "TESTING": True,
       })
       yield app
```

## Expected filesystem state afterwards

```
workspace/test-lab/          (as it should look after step 65)
├── tests/conftest.py   (this step)
```

## Files this step touches

- `workspace/test-lab/tests/conftest.py`

## Verify

```bash
./lab check 65
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `pytest` — importable package pytest
- `ast` on `test-lab/tests/conftest.py` — Python AST of test-lab/tests/conftest.py — imports pytest:, my_app:create_app, defines app, client, runner
- `cli` on `python -m pytest --collect-only -q` — command python, -m, pytest, --collect-only, -q

Stuck? `./lab solve --step 65` lays down the finished code up to this step, `./lab reset --module 13` puts the module back to its starter state.
