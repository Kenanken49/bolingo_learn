"""Step 58 probe - a receiver must really be connected to model_saved."""
import os
import sys

sys.path.insert(0, os.getcwd())

try:
    import blinker  # noqa: F401
    from blinker.base import Signal as SignalClass
except Exception as exc:
    raise SystemExit("FAIL blinker is not importable (%s). Run: pip install blinker" % exc)

try:
    import app as lab
except Exception as exc:
    raise SystemExit("FAIL cannot import app.py from signals-lab (%s: %s)" % (type(exc).__name__, exc))

sig = getattr(lab, "model_saved", None)
if not isinstance(sig, SignalClass):
    raise SystemExit("FAIL model_saved is missing or is not a blinker Signal (that is step 57's work)")

receivers = getattr(sig, "receivers", {}) or {}
if not isinstance(receivers, dict) or len(receivers) < 1:
    raise SystemExit("FAIL model_saved has %d connected receivers. Subscribe with "
                     "@model_saved.connect def on_model_saved(sender, **kwargs): ..." % len(receivers))

# prove the registration is live: every connected receiver must run on send()
names = []
for _key, value in receivers.items():
    func = value[-1] if isinstance(value, (tuple, list)) and value else value
    names.append(getattr(func, "__name__", type(func).__name__))

receipts = sig.send(getattr(lab, "app", None), extra="probe")
if not isinstance(receipts, list) or len(receipts) < len(receivers):
    raise SystemExit("FAIL sending model_saved reached %d of your %d receiver(s) - a receiver raised an "
                     "exception, so the signal did not complete" % (len(receipts or []), len(receivers)))

print("OK model_saved delivers to its receiver(s): %s" % ", ".join(names))
