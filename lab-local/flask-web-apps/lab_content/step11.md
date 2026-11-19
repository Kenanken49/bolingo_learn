# Step 11 · Run the Flask Application

**Module 2 of 17 — Flask + Jinja2 Templates**

**Goal:** Run the app and check the template is served at http://localhost:8080.

## Instructions

Save the app.py file and run it using the following command:

Open your web browser and visit http://localhost:5000. You should see the content of the index.html template rendered in your browser.

```text
python app.py
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 11` from a second terminal.

## Expected filesystem state afterwards

```
workspace/templates-lab/          (as it should look after step 11)
├── app.py   (earlier step)
├── templates/index.html   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
pip install Flask
pip install Jinja2
python app.py
```

## Verify

```bash
./lab check 11
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `templates-lab` — GET http://localhost:8080/ — must contain "Welcome to Flask Jinja2 Templates Lab", HTTP 200, content-type text/html

Stuck? `./lab solve --step 11` lays down the finished code up to this step, `./lab reset --module 2` puts the module back to its starter state.
