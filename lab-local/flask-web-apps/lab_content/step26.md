# Step 26 · Running the Application

**Module 5 of 17 — Building a Flask Application (Application Factory)**

**Goal:** Run flaskr from the project root and confirm it serves the hello page.

## Instructions

With your application set up and configured, you can now run it using the flask command. Be sure to run this command from the top-level directory, not the flaskr package.

You should see output similar to this:

Then, open the tab **Web 5000**, and you should see the following:

![Flask app hello world page](../assets/hello-world.png)

```bash
flask --app flaskr run --debug --host=0.0.0.0
```

```bash
* Serving Flask app "flaskr"
 * Debug mode: on
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: nnn-nnn-nnn
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 26` from a second terminal.

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 26)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
cd ~/project
mkdir flaskr
flask --app flaskr run --debug --host=0.0.0.0
```

## Verify

```bash
./lab check 26
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `http` on `flaskr-app` — GET http://localhost:8080/ — must contain "Hello, World!", HTTP 200

Stuck? `./lab solve --step 26` lays down the finished code up to this step, `./lab reset --module 5` puts the module back to its starter state.
