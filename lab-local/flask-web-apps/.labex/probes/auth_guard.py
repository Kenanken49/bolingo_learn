"""Step 37 probe - does flaskr.auth.login_required actually protect a view?

The blog blueprint does not exist yet at this step, so the probe attaches its
own guarded view to the student's real app and checks what the server does for
an anonymous visitor versus a logged-in one. Nothing here reads the source.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _labhelpers import boot, cleanup, fail, register, say_ok, ensure_lab_dir  # noqa: E402

ensure_lab_dir()

try:
    from flaskr.auth import login_required
except Exception as exc:
    fail("cannot import login_required from flaskr.auth (%s: %s)" % (type(exc).__name__, exc))

SECRET = "LAB-GUARDED-SECRET-%d" % os.getpid()
app = boot()


def guarded():
    return SECRET


app.add_url_rule("/lab-guarded", "lab_guarded", login_required(guarded))

anon = app.test_client()
r = anon.get("/lab-guarded")
loc = r.headers.get("Location", "")
if r.status_code not in (301, 302, 303):
    fail("GET /lab-guarded while logged out returned status %s. login_required must redirect, "
         "not render the view." % r.status_code)
if "/auth/login" not in loc:
    fail("GET /lab-guarded while logged out redirected to %r, expected the login page (/auth/login)" % loc)
if SECRET in r.get_data(as_text=True):
    fail("the guarded response body leaked the protected content while logged out")

client, username, _pw = register(app)
r = client.get("/lab-guarded")
if r.status_code != 200:
    fail("GET /lab-guarded while logged in returned %s, expected 200. session['user_id'] is probably not set by login()"
         % r.status_code)
if SECRET not in r.get_data(as_text=True):
    fail("GET /lab-guarded while logged in did not render the protected view")

followed = anon.get("/lab-guarded", follow_redirects=True)
if "log in" not in followed.get_data(as_text=True).lower():
    fail("redirect after a blocked request should flash a 'You must log in to access this page.' message")

cleanup(app, [username])
say_ok("login_required redirects anonymous users to /auth/login and lets the session through")
