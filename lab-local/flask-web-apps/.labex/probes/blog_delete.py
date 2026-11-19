"""Step 47 probe - delete() must remove the row for the author, never for others."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _labhelpers import (boot, cleanup, create_post, db, fail, find_post,  # noqa: E402
                         register, say_ok, ensure_lab_dir)

ensure_lab_dir()
app = boot()
owner, user_a, _pw = register(app, "labda")
other, user_b, _pw2 = register(app, "labdb")

title, _body = create_post(owner, "LabDel")
row = find_post(app, title)
if row is None:
    fail("setup failed: the created post %r is not in the database" % title)
post_id = row[0]

# foreign delete attempt must be refused and must not remove anything
r = other.post("/%d/delete" % post_id, data={"confirm": "Delete"})
if r.status_code not in (403, 404):
    fail("another user POSTing /%d/delete got status %s, expected 404" % (post_id, r.status_code))
if find_post(app, title) is None:
    fail("post %s was deleted by a user who does not own it" % post_id)

# the delete view should render a confirmation page on GET
page = owner.get("/%d/delete" % post_id).get_data(as_text=True)
if 'name="confirm"' not in page and "Delete" not in page:
    fail("GET /%d/delete must render a confirmation page with a form" % post_id)

r = owner.post("/%d/delete" % post_id, data={"confirm": "Delete"})
if r.status_code >= 500:
    fail("POST /%d/delete crashed (status %s)" % (post_id, r.status_code))
if find_post(app, title) is not None:
    fail("the author's POST /%d/delete did not remove the row - check the DELETE statement and commit()" % post_id)
with app.app_context():
    gone = db(app).execute("SELECT COUNT(*) FROM post WHERE id = ?", (post_id,)).fetchone()[0]
if gone:
    fail("the row with id %s is still present" % post_id)

listing = owner.get("/").get_data(as_text=True)
if title in listing:
    fail("the deleted post is still listed on / - index() must re-query after the delete")

cleanup(app, [user_a, user_b])
say_ok("delete() removes only the author's row and the index reflects it")
