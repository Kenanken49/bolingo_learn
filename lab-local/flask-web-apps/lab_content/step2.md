# Step 2 · Creating a Basic Route

**Module 1 of 17 — Getting Started with the Flask Web Framework**

**Goal:** Add the first route so the app answers '/' with a plain-text greeting.

## Instructions

Routes in Flask define the URL patterns for your application. Let's create a basic route that displays a "Hello, World!" message.

• Add the following code to your app.py file:

```python
@app.route("/")
   def hello_world():
       return "Hello, World!"
```

## Expected filesystem state afterwards

```
workspace/quickstart/          (as it should look after step 2)
├── app.py   (this step)
```

## Files this step touches

- `workspace/quickstart/app.py`

## Verify

```bash
./lab check 2
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `quickstart/app.py` — Python AST of quickstart/app.py — defines hello_world, routes /
- `http` on `quickstart` — GET http://localhost:8080/ — must contain "Hello, World!", HTTP 200

Stuck? `./lab solve --step 2` lays down the finished code up to this step, `./lab reset --module 1` puts the module back to its starter state.
