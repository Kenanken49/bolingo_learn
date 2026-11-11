# Step 41 · Verify the changes

**Module 8 of 17 — Styling the Application with Static Files**

**Goal:** Confirm Flask's static view actually serves the stylesheet.

## Instructions

To verify the changes, start your Flask application and navigate to the login page at http://127.0.0.1:5000/auth/login. The page should now be styled according to the rules in the style.css file.

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 41` from a second terminal.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 41)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
├── flaskr/static/style.css   (earlier step)
├── flaskr/templates/base.html   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
cd flaskr/static
touch style.css
```

## Verify

```bash
./lab check 41
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `flaskr-app` — GET http://localhost:8080/static/style.css — must contain "font-family", HTTP 200, content-type text/css

Stuck? `./lab solve --step 41` lays down the finished code up to this step, `./lab reset --module 8` puts the module back to its starter state.
