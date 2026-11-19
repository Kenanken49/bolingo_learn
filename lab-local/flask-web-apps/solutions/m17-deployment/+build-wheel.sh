#!/usr/bin/env bash
# Post-install hook for module 17: turn the packaged flaskr into a real
# installation. Runs after `lab solve` copies the files into the workspace.
#
#   1. build a wheel with `python -m build`
#   2. install it into /labenv, so flaskr is importable from anywhere -
#      not just from the directory that holds the code
#   3. write the deployment instance/config.py that step 83 inspects
set -uo pipefail

WS="${LAB_WORKSPACE:?LAB_WORKSPACE must be set}"
PY="${LAB_PYTHON:-python3}"
APP="$WS/flaskr-app"
[ -d "$APP" ] || { echo "no $APP - run this through ./lab solve, not by hand." >&2; exit 1; }

# The container exports PORT=0 for code-server; Flask reads PORT and tries to
# bind it during the import-time checks below.
unset PORT

cd "$APP"

# `build --no-isolation` uses the packages already in this environment instead
# of downloading a PEP 517 build system. The lab image installs setuptools and
# wheel for exactly that reason, so check for them and say so plainly instead
# of letting the backend error scroll past.
if ! "$PY" -c 'import setuptools, wheel' >/dev/null 2>&1; then
  echo "  ERROR: this environment has no setuptools/wheel, so the build cannot run."
  echo "         Fix: \"$PY\" -m pip install setuptools wheel   (the lab image ships both)"
  exit 1
fi

echo "  building the wheel ..."
"$PY" -m build --wheel --no-isolation 2>&1 | tail -3

echo "  installing flaskr into $(dirname "$PY") ..."
WHL="$(ls -1 dist/flaskr-1.0.0-py3-none-any.whl 2>/dev/null | head -1)"
[ -n "$WHL" ] || { echo "  the build produced no wheel." >&2; exit 1; }
"$PY" -m pip install --quiet --force-reinstall --no-deps "$WHL" \
  || echo "  (pip install reported a problem - continuing so the graders can say what is missing)"

echo "  writing instance/config.py ..."
mkdir -p instance
"$PY" -c "import secrets, pathlib
pathlib.Path('instance/config.py').write_text('# Real deployment configuration. Never commit this.\nSECRET_KEY = \"' + secrets.token_hex(16) + '\"\n')
print('  wrote instance/config.py')"

echo "  smoke test: flask --app flaskr init-db"
"$PY" -m flask --app flaskr init-db 2>&1 | tail -1 || true

echo "  Done. Try: cd $APP && flask --app flaskr routes"
echo "  flaskr is now installed in $(dirname "$PY"), not just present in this directory."
