"""Step 75 probe - the CSRF token must actually be verified on the state-changing route.

POST /delete with no token has to be refused; POST /delete with the token that
the served form carries has to be accepted. Matching a string in the source
would not prove anything, so this talks to the app through its test client.
"""
import os
import re
import sys

sys.path.insert(0, os.getcwd())

try:
    from app import app
except Exception as exc:
    raise SystemExit("FAIL cannot import app from secure-lab/csrf/app.py (%s: %s)" % (type(exc).__name__, exc))

app.config["TESTING"] = True
client = app.test_client()

refused = client.post("/delete", data={})
if refused.status_code < 400:
    raise SystemExit("FAIL POST /delete without a CSRF token returned status %s. The view must reject "
                     "requests whose token is missing or does not match the session (use abort(400) or "
                     "return an error status)." % refused.status_code)

page = client.get("/form")
if page.status_code != 200:
    raise SystemExit("FAIL GET /form returned %s, expected the form page" % page.status_code)
html = page.get_data(as_text=True)
match = re.search(r"name=[\"']csrf_token[\"'][^>]*value=[\"']([^\"']+)[\"']", html, re.I) or \
    re.search(r"value=[\"']([^\"']+)[\"'][^>]*name=[\"']csrf_token[\"']", html, re.I)
if not match:
    raise SystemExit("FAIL the served form has no hidden input named 'csrf_token' with a value - "
                     "generate one in the view (secrets.token_hex()) and put it in the template")
token = match.group(1)

if token in ("", "CSRF_TOKEN", "{{ token }}"):
    raise SystemExit("FAIL the form renders the literal placeholder %r instead of a generated token" % token)

second_page_token = re.search(r"name=[\"']csrf_token[\"'][^>]*value=[\"']([^\"']+)[\"']",
                              client.get("/form").get_data(as_text=True), re.I)
if second_page_token and second_page_token.group(1) == token:
    print("note: the token is stable per session (acceptable); a fresh token per request is stronger")

accepted = client.post("/delete", data={"csrf_token": token})
if accepted.status_code >= 400:
    raise SystemExit("FAIL POST /delete with the token from the form was refused with %s. The view must "
                     "compare request.form['csrf_token'] against session['csrf_token'] and accept a match."
                     % accepted.status_code)

wrong = client.post("/delete", data={"csrf_token": "not-the-token"})
if wrong.status_code < 400:
    raise SystemExit("FAIL POST /delete with a forged token was accepted (status %s) - compare against the "
                     "session value, do not just check that a field is present" % wrong.status_code)

print("OK /delete refuses a missing or forged token and accepts the one the form issued")
