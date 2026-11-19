# Step 66 · Writing Tests

**Module 13 of 17 — Testing Flask Applications (pytest basics)**

**Goal:** Write view tests and a CLI test that actually pass.

## Instructions

This test sends a GET request to the root route ("/") and checks that the response status code is 200 and the response data contains the string "Hello, World!".

This test sends a POST request to the login route ("/login") with form data containing a username and password. It checks that the response status code is 200 and the response data contains the string "Logged in successfully".

This test invokes a command named "hello" and checks that the command exits with a code of 0 and the output contains the string "Hello, World!".

```python
def test_hello(client):
       response = client.get("/")
       assert response.status_code == 200
       assert b"Hello, World!" in response.data
```

```python
def test_login(client):
       response = client.post("/login", data={"username": "test", "password": "pass"})
       assert response.status_code == 200
       assert b"Logged in successfully" in response.data
```

```python
def test_hello_command(runner):
       result = runner.invoke(args=["hello"])
       assert result.exit_code == 0
       assert "Hello, World!" in result.output
```

This step runs a test suite. The checker executes it for real and reads the results.

## Expected filesystem state afterwards

```
workspace/test-lab/          (as it should look after step 66)
├── tests/test_app.py   (this step)
├── tests/conftest.py   (earlier step)
```

## Files this step touches

- `workspace/test-lab/tests/test_app.py`

## Verify

```bash
./lab check 66
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `test-lab/tests/test_app.py` — Python AST of test-lab/tests/test_app.py — defines test_hello, test_login, test_hello_command
- `pytest` on `test-lab` — pytest tests/test_app.py

Stuck? `./lab solve --step 66` lays down the finished code up to this step, `./lab reset --module 13` puts the module back to its starter state.
