# Step 55 · Creating a Flask Application

**Module 11 of 17 — Signals and Application Lifecycle**

**Goal:** Instantiate the Flask application object.

## Instructions

Create a Flask application instance:

```python
app = Flask(__name__)
```

## Expected filesystem state afterwards

```
workspace/signals-lab/          (as it should look after step 55)
├── app.py   (this step)
```

## Files this step touches

- `workspace/signals-lab/app.py`

## Verify

```bash
./lab check 55
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `signals-lab/app.py` — Python AST of signals-lab/app.py — assigns app

Stuck? `./lab solve --step 55` lays down the finished code up to this step, `./lab reset --module 11` puts the module back to its starter state.
