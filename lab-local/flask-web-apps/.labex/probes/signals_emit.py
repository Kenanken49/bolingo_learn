"""Step 59 probe - emitting model_saved must really run the receiver and print its message.

Two legitimate designs are accepted: the view sends the signal during a request,
or the code sends it directly. Both are proven by capturing what the receiver
does, not by reading the source.
"""
import contextlib
import io
import os
import sys

sys.path.insert(0, os.getcwd())

try:
    from blinker.base import Signal as SignalClass
except Exception as exc:
    raise SystemExit("FAIL blinker is not importable (%s). Run: pip install blinker" % exc)

try:
    import app as lab
except Exception as exc:
    raise SystemExit("FAIL cannot import app.py from signals-lab (%s: %s)" % (type(exc).__name__, exc))

sig = getattr(lab, "model_saved", None)
if not isinstance(sig, SignalClass):
    raise SystemExit("FAIL model_saved is missing (steps 56-57 come first)")
if not getattr(sig, "receivers", {}):
    raise SystemExit("FAIL no receiver is connected, so emitting proves nothing (step 58)")


def capture(call):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        result = call()
    return buf.getvalue(), result


emitted_by_request = ""
if hasattr(lab, "app"):
    client = lab.app.test_client()
    for path in ("/", "/save", "/signal", "/model"):
        try:
            out, _ = capture(lambda: client.get(path))
        except Exception:
            continue
        if "model saved" in out.lower():
            emitted_by_request = path
            break

if emitted_by_request:
    print("OK GET %s emitted model_saved and the receiver printed its message" % emitted_by_request)
    raise SystemExit(0)

out, receipts = capture(lambda: sig.send(getattr(lab, "app", None), model="lab-article"))
if not out.strip() and not receipts:
    raise SystemExit("FAIL sending model_saved produced no receiver output - the receiver must print "
                     "'Model saved!' and the view/startup code must call model_saved.send(app)")
if "model saved" not in out.lower():
    raise SystemExit("FAIL the receiver ran but printed %r; the step asks for 'Model saved!'" % out.strip()[:120])

print("OK model_saved.send() ran the receiver and printed: %s" % out.strip().splitlines()[0][:80])
