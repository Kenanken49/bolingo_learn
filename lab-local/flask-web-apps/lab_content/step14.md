# Step 14 · Enable Debug Mode

**Module 3 of 17 — Working with the Development Server**

**Goal:** Turn on debug mode so the reloader and interactive debugger are active.

## Instructions

To enable debug mode, which provides an interactive debugger and automatically reloads the code when changes are made, add the --debug option to the flask run command:

Now, any changes you make to your code will trigger an automatic reload of the development server.

```bash
flask run --debug
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 14` from a second terminal.

## Expected filesystem state afterwards

```
workspace/devserver-lab/          (as it should look after step 14)
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
./lab check 14
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `running` on `devserver-lab` — live process on port 8080

Stuck? `./lab solve --step 14` lays down the finished code up to this step, `./lab reset --module 3` puts the module back to its starter state.
