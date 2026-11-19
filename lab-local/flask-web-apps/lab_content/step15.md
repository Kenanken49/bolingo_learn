# Step 15 · Specify Application File

**Module 3 of 17 — Working with the Development Server**

**Goal:** Point the CLI at a differently named application file with --app.

## Instructions

By default, Flask will look for a file named app.py to run as the Flask application. If your file has a different name or is located in a different directory, you can use the --app option to specify the application file:

Replace myapp.py with the name of your application file.

```bash
flask run --app myapp.py
```

## Expected filesystem state afterwards

```
workspace/devserver-lab/          (as it should look after step 15)
├── myapp.py   (this step)
├── app.py   (earlier step)
```

## Files this step touches

- `workspace/devserver-lab/myapp.py`

## Verify

```bash
./lab check 15
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `devserver-lab/myapp.py` — Python AST of devserver-lab/myapp.py — defines hello, routes /
- `http` on `devserver-lab` — GET http://localhost:8080/ — must contain "Hello, Flask!", HTTP 200

Stuck? `./lab solve --step 15` lays down the finished code up to this step, `./lab reset --module 3` puts the module back to its starter state.
