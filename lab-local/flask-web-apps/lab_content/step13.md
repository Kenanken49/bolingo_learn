# Step 13 · Run Development Server with Flask CLI

**Module 3 of 17 — Working with the Development Server**

**Goal:** Start the development server through the Flask CLI rather than python app.py.

## Instructions

Run Development Server with Flask CLI

This will start the development server on http://localhost:5000/. You can access your Flask application by opening a web browser and entering this URL.

```bash
flask run
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 13` from a second terminal.

## Expected filesystem state afterwards

```
workspace/devserver-lab/          (as it should look after step 13)
├── app.py   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
flask run
flask run --debug
flask run --app myapp.py
python app.py
```

## Verify

```bash
./lab check 13
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `devserver-lab` — GET http://localhost:8080/ — must contain "Hello, Flask!", HTTP 200

Stuck? `./lab solve --step 13` lays down the finished code up to this step, `./lab reset --module 3` puts the module back to its starter state.
