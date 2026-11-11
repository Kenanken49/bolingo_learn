# Step 60 · Running the Application

**Module 11 of 17 — Signals and Application Lifecycle**

**Goal:** Run the application that emits the signal during startup.

## Instructions

Finally, run the Flask application:

```python
if __name__ == '__main__':
    app.run()
```

This step is about **running** something. Do not expect the checker to start your server: start it yourself exactly as described below, leave it running, then run `./lab check 60` from a second terminal.

## Expected filesystem state afterwards

```
workspace/signals-lab/          (as it should look after step 60)
├── app.py   (earlier step)
└── unchanged - this step produces no files
```

## Commands for this module (from the original lab)

```bash
pip install flask blinker
```

## Verify

```bash
./lab check 60
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `running` on `signals-lab` — live process on port 8080

Stuck? `./lab solve --step 60` lays down the finished code up to this step, `./lab reset --module 11` puts the module back to its starter state.
