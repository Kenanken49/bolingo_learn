#!/usr/bin/env bash
# Container entrypoint for the local Flask lab.
#   1. seeds the bind-mounted workspace with the pristine starter if it is empty
#   2. starts code-server (browser VS Code) on port 3000, if it was installed
#   3. hands you an interactive shell in /lab
set -uo pipefail

LAB_ROOT=/lab
WORKSPACE_DIR="${LAB_WORKSPACE:-$LAB_ROOT/workspace}"
CODE_SERVER_PORT="${LAB_CODE_SERVER_PORT:-3000}"
WEB_PORT="${LAB_WEB_PORT:-8080}"

mkdir -p "$WORKSPACE_DIR"
# Idempotent seed: -n never overwrites a file you already created, so this is
# safe on every start and also repairs a workspace whose skeleton was deleted.
if [ -d /opt/workspace-default ]; then
  before=$(find "$WORKSPACE_DIR" -type f | wc -l)
  cp -an /opt/workspace-default/. "$WORKSPACE_DIR/" 2>/dev/null || true
  after=$(find "$WORKSPACE_DIR" -type f | wc -l)
  [ "$after" != "$before" ] && echo "seeded $((after-before)) starter file(s) into $WORKSPACE_DIR"
fi

# make the graders executable even if the repo came from a filesystem that lost +x
chmod +x "$LAB_ROOT"/.labex/verify_step*.sh "$LAB_ROOT"/.labex/run-all.sh "$LAB_ROOT"/lab 2>/dev/null || true

if [ -d "$WORKSPACE_DIR/flaskr-app" ]; then
  export FLASK_APP="$WORKSPACE_DIR/flaskr-app/flaskr"
fi

start_editor() {
  command -v code-server >/dev/null 2>&1 || return 1
  nohup code-server \
    --auth none \
    --bind-addr "0.0.0.0:${CODE_SERVER_PORT}" \
    --user-data-dir /root/.local/share/code-server \
    --extensions-dir /root/.local/share/code-server/extensions \
    "$WORKSPACE_DIR" >>/tmp/code-server.log 2>&1 &
  echo $! > /tmp/code-server.pid
}

start_editor || echo "note: code-server is not installed in this image - open the repo in your own editor instead"

cat <<MOTD
==============================================================================
 Flask Web Applications - local lab (17 modules, 84 steps)
==============================================================================
 workspace : $WORKSPACE_DIR   (also reachable as /workspace)
 web app   : http://localhost:${WEB_PORT}     (start your own server there)
 editor    : http://localhost:${CODE_SERVER_PORT}    (code-server, no password)
 python    : /labenv/bin/python (Flask $(/labenv/bin/python -c 'import flask; print(flask.__version__)' 2>/dev/null || echo '?'))

   ./lab check <step>          verify one step
   ./lab check <step> --verbose
   ./lab next                  the step you are on, with its instructions
   ./lab solve --step <n>      lay down the finished code up to step n
   ./lab reset --module <m>    back to the pristine starter for module m
   ./.labex/run-all.sh         run every grader against the current tree
==============================================================================
MOTD

exec "$@"
