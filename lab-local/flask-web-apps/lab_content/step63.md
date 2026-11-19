# Step 63 · Firing Before/After Request Functions

**Module 12 of 17 — Working with the Shell and Request Context**

**Goal:** Fire the before-request and after-request functions from a script.

## Instructions

Firing Before/After Request Functions

By creating a request context, the code that is normally run before a request is not triggered. To simulate the before-request functionality, call the preprocess_request() method. This ensures that database connections and other resources are available.

To simulate the after-request functionality, call the process_response() method with a dummy response object before popping the request context.

```python
# File: shell.py
# Execution: python shell.py

from flask import Flask

app = Flask(__name__)

# Create a request context
ctx = app.test_request_context()
ctx.push()

# Simulate the before-request functionality
app.preprocess_request()

# Work with the request object

# Pop the request context
ctx.pop()
```

```python
# File: shell.py
# Execution: python shell.py

from flask import Flask

app = Flask(__name__)

# Create a request context
ctx = app.test_request_context()
ctx.push()

# Simulate the before-request functionality
app.preprocess_request()

# Work with the request object

# Simulate the after-request functionality
app.process_response(app.response_class())

# Pop the request context
ctx.pop()
```

## Expected filesystem state afterwards

```
workspace/shell-lab/          (as it should look after step 63)
├── shell.py   (this step)
```

## Files this step touches

- `workspace/shell-lab/shell.py`

## Verify

```bash
./lab check 63
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `shell-lab/shell.py` — Python AST of shell-lab/shell.py — calls app.preprocess_request, app.process_response

Stuck? `./lab solve --step 63` lays down the finished code up to this step, `./lab reset --module 12` puts the module back to its starter state.
