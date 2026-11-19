# Step 3 · Running the Application

**Module 1 of 17 — Getting Started with the Flask Web Framework**

**Goal:** Start the built-in development server bound to all interfaces on the lab port.

## Instructions

Now that you have set up your Flask application and created a basic route, let's run the application and see it in action.

The --host=0.0.0.0 flag is used to make the application publicly available. If you don't specify this, the application will only be available on your local machine.

```bash
flask run --host=0.0.0.0
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 3` from a second terminal.

## Expected filesystem state afterwards

```
workspace/quickstart/          (as it should look after step 3)
├── app.py   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
pip install flask
cd ~/project
touch app.py
flask run --host=0.0.0.0
```

## Verify

```bash
./lab check 3
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `quickstart` — GET http://localhost:8080/ — must contain "Hello, World!", HTTP 200

Stuck? `./lab solve --step 3` lays down the finished code up to this step, `./lab reset --module 1` puts the module back to its starter state.
