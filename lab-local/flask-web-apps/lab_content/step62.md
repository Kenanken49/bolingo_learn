# Step 62 · Creating a Request Context

**Module 12 of 17 — Working with the Shell and Request Context**

**Goal:** Push a test request context outside a request and read request data from it.

## Instructions

To create a proper request context in the shell, use the test_request_context() method, which creates a RequestContext object. In the shell, manually push and pop the request context using the push() and pop() methods.

```python
# File: shell.py
# Execution: python shell.py

from flask import Flask

app = Flask(__name__)

# Create a request context
ctx = app.test_request_context()

# Push the request context
ctx.push()

# Work with the request object

# Pop the request context
ctx.pop()
```

## Expected filesystem state afterwards

```
workspace/shell-lab/          (as it should look after step 62)
├── shell.py   (this step)
```

## Files this step touches

- `workspace/shell-lab/shell.py`

## Verify

```bash
./lab check 62
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `shell-lab/shell.py` — Python AST of shell-lab/shell.py — imports flask:request, calls app.test_request_context
- `cli` on `python shell.py` — command python, shell.py — must contain "/?page=2"

Stuck? `./lab solve --step 62` lays down the finished code up to this step, `./lab reset --module 12` puts the module back to its starter state.
