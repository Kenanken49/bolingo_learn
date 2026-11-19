# Step 59 · Emitting a Signal

**Module 11 of 17 — Signals and Application Lifecycle**

**Goal:** Emit the signal and confirm the receiver runs.

## Instructions

To emit a signal, call the send method of the signal. Pass the sender as the first argument:

```python
model_saved.send(app)
```

## Expected filesystem state afterwards

```
workspace/signals-lab/          (as it should look after step 59)
├── app.py   (this step)
```

## Files this step touches

- `workspace/signals-lab/app.py`

## Verify

```bash
./lab check 59
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `signals-lab/app.py` — Python AST of signals-lab/app.py — calls model_saved.send
- `script` on `signals_emit.py` — probe script signals_emit.py

Stuck? `./lab solve --step 59` lays down the finished code up to this step, `./lab reset --module 11` puts the module back to its starter state.
