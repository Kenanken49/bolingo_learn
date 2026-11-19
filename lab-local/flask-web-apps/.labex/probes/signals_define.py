"""Step 57 probe - model_saved must be a real named blinker signal."""
import os
import sys

sys.path.insert(0, os.getcwd())

try:
    import blinker
    from blinker.base import Signal as SignalClass
except Exception as exc:
    raise SystemExit("FAIL blinker is not importable (%s). Run: pip install blinker" % exc)

try:
    import app as lab
except Exception as exc:
    raise SystemExit("FAIL cannot import app.py from signals-lab (%s: %s)" % (type(exc).__name__, exc))

if not hasattr(lab, "model_saved"):
    raise SystemExit("FAIL app.py defines no model_saved - add: model_saved = my_signals.signal('model-saved')")

sig = lab.model_saved
if not isinstance(sig, SignalClass):
    raise SystemExit("FAIL model_saved is a %s, expected a blinker Signal (use my_signals.signal(...) or Signal(...))"
                     % type(sig).__name__)

name = getattr(sig, "name", "") or ""
if name.lower().replace("_", "-") != "model-saved":
    raise SystemExit("FAIL the signal is named %r, expected 'model-saved' - receivers listen by name" % name)

if not hasattr(lab, "my_signals"):
    raise SystemExit("FAIL the signal must come from your Namespace so it cannot collide with Flask's own "
                     "signals: model_saved = my_signals.signal('model-saved')")
if sig is not lab.my_signals.signal("model-saved"):
    print("note: model_saved is not the Namespace-cached instance for 'model-saved'; using "
          "my_signals.signal('model-saved') keeps one shared signal")

print("OK model_saved is blinker Signal %r from %r" % (name, type(lab.my_signals).__name__))
