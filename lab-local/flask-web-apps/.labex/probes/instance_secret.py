"""Step 83 probe - create_app() must load a real SECRET_KEY from the instance folder."""
import os
import re

from flaskr import create_app

app = create_app()
instance_file = os.path.join(app.instance_path, "config.py")
if not os.path.isfile(instance_file):
    raise SystemExit("FAIL no instance/config.py at %s - create it with SECRET_KEY = '<token>'" % instance_file)

text = open(instance_file, encoding="utf-8").read()
match = re.search(r"SECRET_KEY\s*=\s*[\"']([^\"']+)[\"']", text)
if not match:
    raise SystemExit("FAIL instance/config.py must contain a line like: SECRET_KEY = \"<token>\" (found %r)" % text[:120])

wanted = match.group(1)
got = app.config.get("SECRET_KEY")
if got is None:
    raise SystemExit("FAIL create_app() exposes no SECRET_KEY at all - add "
                     "app.config.from_pyfile('config.py', silent=True) inside create_app()")
if got == "dev":
    raise SystemExit("FAIL the running app still uses the in-code 'dev' default: instance/config.py is not loaded. "
                     "Flask needs Flask(__name__, instance_relative_config=True) plus "
                     "app.config.from_pyfile('config.py', silent=True) after from_mapping()")
if got != wanted:
    raise SystemExit("FAIL app.config['SECRET_KEY'] is %r but instance/config.py sets %r - from_pyfile order is wrong"
                     % (got, wanted))
if len(got) < 16:
    raise SystemExit("FAIL the secret is only %d characters; generate a long one with "
                     "python -c \"import secrets; print(secrets.token_hex())\"" % len(got))
import flaskr

pkg_dir = os.path.dirname(os.path.abspath(flaskr.__file__))
for wrong in (os.path.join(pkg_dir, "config.py"), os.path.join(os.path.dirname(pkg_dir), "config.py")):
    if os.path.isfile(wrong) and re.search(r"SECRET_KEY", open(wrong, encoding="utf-8").read()):
        raise SystemExit(
            "FAIL SECRET_KEY is committed inside the application tree (%s). The instance folder "
            "(%s) is the place that stays out of version control - move the file there and load it "
            "with app.config.from_pyfile('config.py', silent=True)." % (wrong, app.instance_path)
        )

print("OK app.config['SECRET_KEY'] comes from %s (%d chars, not the 'dev' default)" % (instance_file, len(got)))
