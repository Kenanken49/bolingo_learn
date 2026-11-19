# Step 31 · Initializing the Database File

**Module 6 of 17 — SQLite Database Setup**

**Goal:** Create the real database file on disk with the flask CLI.

## Instructions

Initializing the Database File

Now that init-db has been registered with the app, it can be called using the flask command.

```bash
flask --app flaskr init-db
Initialized the database.
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 31` from a second terminal.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 31)
├── instance/flaskr.sqlite   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/instance/flaskr.sqlite`

## Commands for this module (from the original lab)

```bash
flask --app flaskr init-db
```

## Verify

```bash
./lab check 31
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `cli` on `flask --app flaskr init-db` — command flask, --app, flaskr, init-db — must contain "Initialized the database."
- `db` on `flaskr-app/instance/flaskr.sqlite` — SQLite flaskr-app/instance/flaskr.sqlite — tables user, post

Stuck? `./lab solve --step 31` lays down the finished code up to this step, `./lab reset --module 6` puts the module back to its starter state.
