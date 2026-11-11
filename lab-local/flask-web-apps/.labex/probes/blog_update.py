"""Step 46 probe - update() must change the stored row, for the author only."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _labhelpers import (boot, cleanup, create_post, db, fail, find_post,  # noqa: E402
                         register, say_ok, ensure_lab_dir)

ensure_lab_dir()
app = boot()
owner, user_a, _pw = register(app, "laba")
other, user_b, _pw2 = register(app, "labb")

title, body = create_post(owner, "LabUpd")
row = find_post(app, title)
if row is None:
    fail("setup failed: the created post %r is not in the database" % title)
post_id = row[0]

form = owner.get("/%d/update" % post_id)
if form.status_code != 200:
    fail("GET /%d/update returned %s, expected the edit form" % (post_id, form.status_code))
if 'name="title"' not in form.get_data(as_text=True):
    fail("the update form must contain an input named 'title'")
if title not in form.get_data(as_text=True):
    fail("the update form should pre-fill the current title")

new_title = title + " EDITED"
new_body = "updated body written by the verification engine"
r = owner.post("/%d/update" % post_id, data={"title": new_title, "body": new_body})
if r.status_code >= 500:
    fail("POST /%d/update crashed (status %s)" % (post_id, r.status_code))
changed = find_post(app, new_title)
if changed is None:
    same = find_post(app, title)
    fail("POST /%d/update left the row unchanged (title is still %r) - the UPDATE statement "
         "or commit() is missing" % (post_id, title if same else "?"))
if changed[2] != new_body:
    fail("the stored body is %r after update, expected %r" % (changed[2], new_body))
if changed[0] != post_id:
    fail("update changed a different row (%s instead of %s)" % (changed[0], post_id))

stolen = other.post("/%d/update" % post_id, data={"title": "HIJACKED", "body": "not mine"})
if stolen.status_code not in (403, 404):
    fail("another user updating post %s got status %s, expected 404 - update() must abort when "
         "post['author_id'] != g.user['id']" % (post_id, stolen.status_code))
still = find_post(app, "HIJACKED")
if still is not None:
    fail("a different user was able to overwrite post %s" % post_id)

with app.app_context():
    db(app).execute("DELETE FROM post WHERE id = ?", (post_id,))
    db(app).commit()
cleanup(app, [user_a, user_b])
say_ok("update() rewrites the author's row and returns 404 for other users")
