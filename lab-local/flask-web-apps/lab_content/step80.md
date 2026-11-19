# Step 80 · Defining an Async View

**Module 16 of 17 — Async and Await in Flask**

**Goal:** Write a view that awaits a coroutine instead of blocking the worker.

## About this module

This lab will guide you through the process of using async and await in Flask, a popular Python web framework. You will learn how to define asynchronous views and handlers, understand the performance implications of using async code, and explore background tasks in Flask.

Work in `workspace/async-lab/`. `./lab check 80` grades this step.

## Instructions

In Flask, you can define views as asynchronous functions using the async def syntax. This allows you to use await to perform asynchronous operations within the view function.

To run this code, save it in a Python file (e.g., app.py) and execute the file using the Flask development server:

```python
@app.route("/get-data")
async def get_data():
    data = await async_db_query(...)
    return jsonify(data)
```

```bash
flask run
```

## Expected filesystem state afterwards

```
workspace/async-lab/          (as it should look after step 80)
├── app.py   (this step)
```

## Files this step touches

- `workspace/async-lab/app.py`

## Verify

```bash
./lab check 80
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `async-lab/app.py` — Python AST of async-lab/app.py — routes /get-data
- `app` on `app:app` — application factory app:app — must contain "LabEx", in-process GET /get-data, HTTP 200, content-type application/json

Stuck? `./lab solve --step 80` lays down the finished code up to this step, `./lab reset --module 16` puts the module back to its starter state.
