# Step 58 · Subscribing to a Signal

**Module 11 of 17 — Signals and Application Lifecycle**

**Goal:** Subscribe a receiver function to the signal.

## Instructions

To subscribe to a signal, use the connect method of the signal. Provide a function that should be called when the signal is emitted:

```python
@model_saved.connect
def on_model_saved(sender):
    print("Model saved!")
```

## Expected filesystem state afterwards

```
workspace/signals-lab/          (as it should look after step 58)
├── app.py   (this step)
```

## Files this step touches

- `workspace/signals-lab/app.py`

## Verify

```bash
./lab check 58
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `signals-lab/app.py` — Python AST of signals-lab/app.py — defines on_model_saved
- `script` on `signals_subscribe.py` — probe script signals_subscribe.py

Stuck? `./lab solve --step 58` lays down the finished code up to this step, `./lab reset --module 11` puts the module back to its starter state.
