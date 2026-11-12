"""Step 45 probe - create() must write a real row owned by the logged-in user."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _labhelpers import (boot, cleanup, create_post, fail, find_post, register,  # noqa: E402
                         say_ok, ensure_lab_dir)

ensure_lab_dir()
app = boot()
client, username, _pw = register(app, "labw")
made = [username]

form = client.get("/create")
if form.status_code != 200:
    fail("GET /create returned %s, expected the create form" % form.status_code)
if 'name="title"' not in form.get_data(as_text=True):
    fail("GET /create must render a form with an input named 'title'")

blank = client.post("/create", data={"title": "", "body": "body without a title"})
if blank.status_code >= 500:
    fail("submitting an empty title crashed the view (status %s)" % blank.status_code)
with app.app_context():
    from _labhelpers import db
    stored = db(app).execute("SELECT COUNT(*) FROM post WHERE body = ?", ("body without a title",)).fetchone()[0]
if stored:
    fail("a post with an empty title was stored - create() must validate request.form['title'] and reject it")

title, body = create_post(client, "LabWrite")
row = find_post(app, title)
if row is None:
    fail("POST /create with title=%r stored nothing in the database - the INSERT did not run or was not committed" % title)
_post_id, stored_title, stored_body, author_id = row
if stored_body != body:
    fail("the stored body is %r, expected %r" % (stored_body, body))
if author_id is None:
    fail("post.author_id is NULL - create() must store session['user_id'] as the author")
with app.app_context():
    from _labhelpers import db
    own = db(app).execute("SELECT username FROM user WHERE id = ?", (author_id,)).fetchone()
if own is None or own[0] != username:
    fail("post.author_id=%s does not point at the logged-in user (%s)" % (author_id, username))

page = client.get("/").get_data(as_text=True)
if title not in page:
    fail("the new post is not listed on the blog index at / - index() must query the post table")

cleanup(app, made)
say_ok("create() stores title/body with the correct author_id and the post shows on /")
