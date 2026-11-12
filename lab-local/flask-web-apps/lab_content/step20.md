# Step 20 · Run the Development Server

**Module 4 of 17 — The Flask Command Line Interface**

**Goal:** Serve the app with flask run instead of python app.py.

## Instructions

Instead of manually running the Flask application using python app.py, you can use the Flask CLI to start the development server. Stop the currently running application (if any) and execute the following command:

You should see the Flask development server start and display the URL where your application is running (usually http://127.0.0.1:5000/). Open that URL in your browser and you should see the "Hello, Flask!" message.

```text
flask run
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 20` from a second terminal.

## Expected filesystem state afterwards

```
workspace/cli-lab/          (as it should look after step 20)
├── app.py   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
pip install flask
python app.py
flask run
python commands.py John
flask greet John
```

## Verify

```bash
./lab check 20
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `cli-lab` — GET http://localhost:8080/ — must contain "Hello, Flask!", HTTP 200

Stuck? `./lab solve --step 20` lays down the finished code up to this step, `./lab reset --module 4` puts the module back to its starter state.
