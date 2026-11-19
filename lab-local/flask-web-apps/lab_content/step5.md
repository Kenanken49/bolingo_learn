# Step 5 · Running the Application Again

**Module 1 of 17 — Getting Started with the Flask Web Framework**

**Goal:** Restart the server and confirm the rendered template is what the browser receives.

## Instructions

Now that we have added an HTML template, let's run the application again and see the rendered template.

• Stop the Flask development server if it is still running (press Ctrl+C).

• Run the following command to start the server again:

You should now see the "Hello, Flask!" message displayed in the HTML template.

```bash
flask run --host=0.0.0.0
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 5` from a second terminal.

## Expected filesystem state afterwards

```
workspace/quickstart/          (as it should look after step 5)
├── app.py   (earlier step)
├── templates/index.html   (earlier step)
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
./lab check 5
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `quickstart` — GET http://localhost:8080/ — must contain "<h1>Hello, Flask!</h1>", HTTP 200, content-type text/html

Stuck? `./lab solve --step 5` lays down the finished code up to this step, `./lab reset --module 1` puts the module back to its starter state.
