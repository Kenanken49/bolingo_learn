# Step 56 · Creating a Namespace for Signals

**Module 11 of 17 — Signals and Application Lifecycle**

**Goal:** Create a signal namespace so your signals do not collide with Flask's.

## Instructions

Creating a Namespace for Signals

Create a namespace for your signals using the Blinker library:

```python
my_signals = Namespace()
```

## Expected filesystem state afterwards

```
workspace/signals-lab/          (as it should look after step 56)
├── app.py   (this step)
```

## Files this step touches

- `workspace/signals-lab/app.py`

## Verify

```bash
./lab check 56
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `signals-lab/app.py` — Python AST of signals-lab/app.py — assigns my_signals
- `script` on `signals_namespace.py` — probe script signals_namespace.py

Stuck? `./lab solve --step 56` lays down the finished code up to this step, `./lab reset --module 11` puts the module back to its starter state.
