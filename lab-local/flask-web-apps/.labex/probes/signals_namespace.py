"""Step 56 probe - my_signals must be a live blinker.Namespace instance."""
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

if not hasattr(lab, "my_signals"):
    raise SystemExit("FAIL app.py does not define my_signals - add: my_signals = Namespace()")

if not isinstance(lab.my_signals, blinker.Namespace):
    raise SystemExit("FAIL my_signals is a %s, expected a blinker.Namespace instance" % type(lab.my_signals).__name__)

# a Namespace really is doing the work: asking for a name returns a Signal
probe = lab.my_signals.signal("lab-probe-check")
if not isinstance(probe, SignalClass):
    raise SystemExit("FAIL my_signals.signal('x') returned %s, not a blinker Signal" % type(probe).__name__)

print("OK my_signals is a blinker.Namespace (%s) and hands out Signal objects" % type(lab.my_signals).__name__)
