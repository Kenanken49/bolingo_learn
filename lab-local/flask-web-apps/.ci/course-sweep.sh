#!/usr/bin/env bash
#
# In-container course sweep — the release bar for the rebuilt Flask lab course.
#
#   bash /lab/.ci/course-sweep.sh          (the image bakes this at /.ci too)
#
# What it proves, in order:
#   1. preflight      the workspace, the venv and the graders are really there
#   2. pristine       with an untouched starter workspace the graders FAIL
#                     (a course that always passes grades nothing)
#   3. solved         `./lab solve --step N` succeeds for every step 1..84 and
#                     `./lab check N` passes (or SKIPs when the step grades
#                     nothing) — live HTTP steps get a real server on :8080
#   4. runner smoke   the generated aggregate runner (.labex/run-all.sh) exits 0,
#                     with a live server up for the steps that want one
#   5. reset          `./lab reset --all` restores the starter source tree (the
#                     same file set as at the start) and a step fails again
#
# Exit 0 only if all of it holds. Thresholds are env-overridable so a local run
# can be stricter or looser while CI keeps the baked values.
set -uo pipefail

LAB_ROOT="${LAB_ROOT:-/lab}"
cd "$LAB_ROOT" || { echo "SETUP: $LAB_ROOT missing"; exit 1; }

export LAB_PYTHON="${LAB_PYTHON:-/labenv/bin/python}"
export PATH="/labenv/bin:$PATH"
PY="$LAB_PYTHON"
LAST_STEP="${LAST_STEP:-84}"
# solved sweep: every gradeable step must pass; steps with no checks SKIP.
SOLVED_FAIL_MAX="${SOLVED_FAIL_MAX:-0}"
# Pristine numbers are measured in the container, not guessed (84 steps =
# 5 pass + 76 fail + 3 skip):
#   PASS 5 — steps 8, 18, 53, 67, 76 only grade that a package is importable,
#          and the image ships flask/jinja2/blinker/pytest/coverage, so those
#          "install X" steps are satisfied by the runtime itself.
#   SKIP 3 — steps 16, 61, 79 are reading/diagnosis steps with no artefact.
#   FAIL 76 — every step that grades real work refuses the empty workspace.
PRISTINE_PASS_MAX="${PRISTINE_PASS_MAX:-5}"
PRISTINE_FAIL_MIN="${PRISTINE_FAIL_MIN:-76}"
# Measured in a fresh container built from this image (what CI gets):
#   pristine PASS=5 FAIL=76 SKIP=3   solved PASS=81 SKIP=3 FAIL=0   ~14 min
CHECK_TIMEOUT="${CHECK_TIMEOUT:-180}"
SOLVER_TIMEOUT="${SOLVER_TIMEOUT:-120}"

LOGS="${LOGS:-/tmp/course-sweep}"
# Empty rather than remove: in CI this directory is a host-mounted volume, and
# `rm -rf` on a mount point fails. -mindepth 1 keeps the directory itself.
mkdir -p "$LOGS" && find "$LOGS" -mindepth 1 -delete
SERVE_MAP="$LOGS/serve-map.tsv"
RUN_MAP="$LOGS/running-checks.tsv"
STARTER_SNAPSHOT="$LOGS/starter-files.txt"

fail_hard() { echo "SETUP FAIL: $1"; exit 1; }
note()      { echo "$@"; }

# ------------------------------------------------------------------- preflight
[ -x ./lab ] || fail_hard "./lab is missing or not executable"
[ -f .labex/verify_step1.sh ] || fail_hard ".labex graders are missing"
[ -f tools/course.json ] || fail_hard "tools/course.json is missing"
[ -d workspace ] || fail_hard "workspace/ is missing"
"$PY" -c 'import flask, sys; sys.stderr.write("flask " + flask.__version__ + "\n")' \
  || fail_hard "$PY cannot import flask"
"$PY" - <<'PY' > "$SERVE_MAP" || fail_hard "could not read tools/course.json"
import json
course = json.load(open('tools/course.json'))
mods = [m for m in course['modules']]
def owner(step):
    for m in mods:
        if m['step_from'] <= step <= m['step_to']:
            return m
    raise SystemExit('step with no module')
for s in course['steps']:
    kinds = {c.get('t') for c in s.get('checks', [])}
    if kinds & {'http', 'running'}:
        m = owner(s['n'])
        app = 'flaskr' if m['dir'] == 'flaskr-app' else 'app'
        print(f"{s['n']}\t{m['dir']}\t{app}")
PY
"$PY" - <<'PY' > "$RUN_MAP"
import json
course = json.load(open('tools/course.json'))
for s in course['steps']:
    for c in s.get('checks', []):
        if c.get('t') == 'running':
            print(f"{s['n']}\t{c.get('match', '')}\t{c.get('dir', '')}")
PY

# A grader may leave runtime noise behind — the private autostart log it writes
# next to the app it probes, bytecode caches, pytest caches, the SQLite file the
# flaskr app creates when a check boots it. Those are not student work, so the
# workspace comparisons below look at source files only, and the noise is
# reported instead of failing the sweep.
ARTIFACT_RE='(__pycache__/|\.pyc$|\.lab-autostart\.log$|\.pytest_cache/|\.coverage$|\.(db|sqlite|sqlite3)$|/instance/|~$)'
snapshot() { find workspace -type f | grep -Ev "$ARTIFACT_RE" | sort; }
artifacts() { find workspace -type f | grep -E "$ARTIFACT_RE" | sort; }

# The solved sweep mutates the container itself: module 17 runs `pip install .`,
# which puts the finished flaskr into /labenv. A second sweep in the same
# container then sees package steps "pass with nothing built" (measured: steps 40
# and 82 come back PASS on a used container) and the pristine counts are fiction.
# CI always starts a fresh image, so a local rerun must as well.
if [ "${ALLOW_DIRTY_LABENV:-0}" != 1 ] && "$PY" -c 'import importlib.util, sys; sys.exit(0 if importlib.util.find_spec("flaskr") else 1)'; then
  fail_hard "this container is not fresh: flaskr is already installed in /labenv, so the pristine sweep cannot be trusted. Use a new container (docker run --rm IMAGE bash /lab/.ci/course-sweep.sh) or set ALLOW_DIRTY_LABENV=1."
fi

# Start from a known state even when the workspace already has work in it, then
# snapshot the starter file set that ./lab reset --all must restore at the end.
./lab reset --all > "$LOGS/preflight-reset.log" 2>&1 \
  || { echo "SETUP FAIL: ./lab reset --all did not work in this image (see $LOGS/preflight-reset.log)"; exit 1; }
# ./lab reset restores source files only; runtime noise from an earlier run
# (bytecode, pytest cache, the grader's private-boot log, a flaskr.sqlite the
# course's own init-db step wrote) is not student work and would skew both the
# snapshot and the graders, so it is cleared before measuring.
if [ -n "$(artifacts)" ]; then
  note "clearing runtime artifacts left by an earlier run: $(artifacts | tr '\n' ' ')"
  find workspace -type f | grep -E "$ARTIFACT_RE" | xargs -r rm -f
fi
snapshot > "$STARTER_SNAPSHOT"
[ "$(wc -l < "$STARTER_SNAPSHOT")" -ge 1 ] || fail_hard "starter workspace has no files to snapshot"
note "preflight ok — $(wc -l < "$STARTER_SNAPSHOT") starter file(s), $(wc -l < "$SERVE_MAP") step(s) need a live server"

# -------------------------------------------------------------- shared helpers
needs_server() { awk -F'\t' -v n="$1" '$1 == n { print $2 "\t" $3; found = 1 } END { exit !found }' "$SERVE_MAP"; }

# A `running` check greps the command line of the live process, so the sweep has
# to start the process the step actually teaches — a plain dev server is not
# always the answer. Measured in the container: of the three steps with such a
# check (14, 60, 84), only these two need their own command line; 60 is satisfied
# by the default server. The strings mirror each step's own `how to fix:` hint in
# tools/course.json, and the preflight below proves the table stays complete.
server_override() { # <step> -> command line to run from the step's workspace dir
  case "$1" in
    14) printf 'flask --app app run --debug --host=0.0.0.0 --port %s' "${LAB_WEB_PORT:-8080}" ;;
    84) printf "waitress-serve --listen=0.0.0.0:%s --call 'flaskr:create_app'" "${LAB_WEB_PORT:-8080}" ;;
  esac
}

# Steps whose server needs state prepared first. flaskr's schema.sql starts with
# DROP TABLE IF EXISTS, so re-running it is safe.
server_prelude() { # <step> -> command to run in the step's workspace dir first
  case "$1" in
    84) printf 'flask --app flaskr init-db' ;;
  esac
}

start_server() { # start_server <step> -> 0 when a server is up for that step
  local spec dir app cmd log n="$1"
  spec="$(needs_server "$n")" || return 0
  dir="${spec%%$'\t'*}"; app="${spec##*$'\t'}"
  log="$LOGS/serve-$n.log"
  ./lab stop "$dir" >/dev/null 2>&1
  local pre; pre="$(server_prelude "$n")"
  if [ -n "$pre" ]; then
    note "  step $n: preparing state first: (cd $dir && $pre)"
    ( cd "$LAB_ROOT/workspace/$dir" && sh -c "$pre" ) > "$LOGS/prelude-$n.log" 2>&1 \
      || note "  ! step $n: prelude exited non-zero (see $LOGS/prelude-$n.log)"
  fi
  cmd="$(server_override "$n")"
  if [ -n "$cmd" ]; then
    note "  step $n: starting what the step teaches: (cd $dir && $cmd)"
    ( cd "$LAB_ROOT/workspace/$dir" && setsid nohup sh -c "$cmd" >"$log" 2>&1 & echo $! > "$LOGS/serve-$n.pid" )
  else
    ./lab serve "$dir" "$app" >"$log" 2>&1
  fi
  local deadline=$((SECONDS + 45))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if (exec 3<>/dev/tcp/127.0.0.1/"${LAB_WEB_PORT:-8080}") 2>/dev/null; then
      exec 3>&- 3<&-
      return 0
    fi
    sleep 1
  done
  note "  ! step $1: no listener on :${LAB_WEB_PORT:-8080} (see $LOGS/serve-$1.log)"
  return 1
}

stop_all_servers() {
  ./lab stop >/dev/null 2>&1
  # servers started outside ./lab serve: kill the whole process group so a
  # reloader child (flask run --debug) does not keep the port.
  local pf pid
  for pf in "$LOGS"/serve-*.pid; do
    [ -e "$pf" ] || continue
    pid="$(cat "$pf")"
    kill -TERM -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$pf"
  done
  # belt and braces: kill anything still bound to the web port
  local pids
  pids="$("$PY" - <<'PY' 2>/dev/null || true
import re, subprocess
out = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True).stdout
for line in out.splitlines():
    if re.search(r'flask --app \S+ run|waitress-serve', line):
        print(line.split()[0])
PY
)"
  for pid in $pids; do kill "$pid" 2>/dev/null || true; done
  sleep 1
}

classify() { # classify <label-prefix> <step> <rc> <logfile>
  local tag="$1" n="$2" rc="$3" log="$4" verdict
  if grep -qE 'no runnable artefact|nothing to grade' "$log" 2>/dev/null; then
    verdict=SKIP
  elif [ "$rc" -eq 0 ]; then
    verdict=PASS
  else
    verdict=FAIL
  fi
  printf 'RESULT %s step %-3s %s\n' "$tag" "$n" "$verdict" >> "$LOGS/${tag}-results.txt"
  printf '%-6s %s\n' "$verdict" "$n"
}

# Before grading anything: prove that every `running` check in the course is
# satisfiable by a command this sweep knows how to start. Cheap to check up front,
# and it turns a future course.json edit into a one-line setup failure with the
# pattern to add, rather than an unexplained FAIL in the middle of the sweep.
running_checked=0
while IFS=$'\t' read -r rn rpattern rdir; do
  [ -n "$rn" ] || continue
  rcmd="$(server_override "$rn")"
  if [ -z "$rcmd" ]; then
    rapp=app
    [ "$rdir" = "flaskr-app" ] && rapp=flaskr
    rcmd="$LAB_PYTHON -m flask --app $rapp run --host=0.0.0.0 --port ${LAB_WEB_PORT:-8080}"
  fi
  "$PY" -c 'import re, sys; sys.exit(0 if re.search(sys.argv[1], sys.argv[2]) else 1)' \
    "$rpattern" "$rcmd" \
    || fail_hard "step $rn's running check wants /$rpattern/ but the sweep would run: $rcmd — add it to server_override()"
  running_checked=$((running_checked + 1))
done < "$RUN_MAP"
note "running-check table ok — $running_checked process-level check(s) have a matching start command"

# --------------------------------------------------------------- 2. pristine
: > "$LOGS/pristine-results.txt"
note ""
note "== pristine sweep (nothing built): steps 1..$LAST_STEP must not pass =="
pristine_pass=0; pristine_fail=0; pristine_skip=0
for n in $(seq 1 "$LAST_STEP"); do
  line="$(classify pristine "$n" "$( { timeout "$CHECK_TIMEOUT" ./lab check "$n" >"$LOGS/pristine-$n.log" 2>&1; echo $?; } )" "$LOGS/pristine-$n.log")"
  case "$line" in
    PASS*) pristine_pass=$((pristine_pass + 1)) ;;
    FAIL*) pristine_fail=$((pristine_fail + 1)) ;;
    *)     pristine_skip=$((pristine_skip + 1)) ;;
  esac
done
stop_all_servers
snapshot > "$LOGS/after-pristine-files.txt"
if ! diff -q "$STARTER_SNAPSHOT" "$LOGS/after-pristine-files.txt" > /dev/null; then
  echo "SWEEP FAIL: running graders created or removed student files in the starter workspace"
  diff "$STARTER_SNAPSHOT" "$LOGS/after-pristine-files.txt" | head -20
  exit 1
fi
note "grader artifacts left in workspace (not student work): $(artifacts | tr '\n' ' ')"
note "pristine PASS steps: $(awk '/PASS/{printf "%s ", $4}' "$LOGS/pristine-results.txt")"
note "pristine SKIP steps: $(awk '/SKIP/{printf "%s ", $4}' "$LOGS/pristine-results.txt")"
note "pristine: PASS=$pristine_pass FAIL=$pristine_fail SKIP=$pristine_skip (max pass $PRISTINE_PASS_MAX, min fail $PRISTINE_FAIL_MIN)"
[ "$pristine_pass" -le "$PRISTINE_PASS_MAX" ] || { echo "SWEEP FAIL: $pristine_pass steps passed with nothing built"; exit 1; }
[ "$pristine_fail" -ge "$PRISTINE_FAIL_MIN" ] || { echo "SWEEP FAIL: only $pristine_fail graders rejected an empty workspace"; exit 1; }

# ----------------------------------------------------------------- 3. solved
: > "$LOGS/solved-results.txt"
note ""
note "== solved sweep: ./lab solve --step N then ./lab check N for 1..$LAST_STEP =="
solved_pass=0; solved_fail=0; solved_skip=0; solver_fail=0
for n in $(seq 1 "$LAST_STEP"); do
  if ! timeout "$SOLVER_TIMEOUT" ./lab solve --step "$n" >"$LOGS/solve-$n.log" 2>&1; then
    solver_fail=$((solver_fail + 1))
    note "  ! step $n: ./lab solve --step $n failed (see $LOGS/solve-$n.log)"
    printf 'RESULT solved step %-3s SOLVER\n' "$n" >> "$LOGS/solved-results.txt"
    solved_fail=$((solved_fail + 1))
    continue
  fi
  start_server "$n"
  line="$(classify solved "$n" "$( { timeout "$CHECK_TIMEOUT" ./lab check "$n" >"$LOGS/solved-$n.log" 2>&1; echo $?; } )" "$LOGS/solved-$n.log")"
  case "$line" in
    PASS*) solved_pass=$((solved_pass + 1)) ;;
    FAIL*) solved_fail=$((solved_fail + 1)) ;;
    *)     solved_skip=$((solved_skip + 1)) ;;
  esac
  stop_all_servers
done
note "solved FAIL steps: $(awk '/FAIL|SOLVER/{printf "%s ", $4}' "$LOGS/solved-results.txt")"
note "solved SKIP steps: $(awk '/SKIP/{printf "%s ", $4}' "$LOGS/solved-results.txt")"
note "solved: PASS=$solved_pass SKIP=$solved_skip FAIL=$solved_fail (solver failures: $solver_fail)"
[ "$solver_fail" -eq 0 ] || { echo "SWEEP FAIL: ./lab solve broke on $solver_fail step(s)"; exit 1; }
[ "$solved_fail" -le "$SOLVED_FAIL_MAX" ] || { echo "SWEEP FAIL: $solved_fail step(s) failed their own grader when solved"; exit 1; }

# --------------------------------------------------------- 4. runner aggregate
note ""
note "== aggregate runner smoke: .labex/run-all.sh 1 7 (module 1, solved) =="
# Steps 1..7 include the "run the application" checks, so a live server has to be
# up. ./lab serve is keyed by directory, not by step, so boot it for the first
# step in the range that actually asks for one rather than for step 1, which does
# not (that silently graded the http steps with nothing listening).
smoke_step="$(awk -F'\t' -v last="$LAST_STEP" '$1 >= 1 && $1 <= last { print $1; exit }' "$SERVE_MAP")"
note "starting the server for step ${smoke_step:-1} before the aggregate runner"
start_server "${smoke_step:-1}"
if bash .labex/run-all.sh 1 7 >"$LOGS/run-all-1-7.log" 2>&1; then
  note "run-all 1..7 ok — $(tail -1 "$LOGS/run-all-1-7.log")"
else
  note "SWEEP FAIL: .labex/run-all.sh 1 7 exited non-zero (see $LOGS/run-all-1-7.log)"
  stop_all_servers
  exit 1
fi
stop_all_servers

# ------------------------------------------------------------------ 5. reset
note ""
note "== reset sweep: ./lab reset --all restores the starter workspace =="
./lab reset --all >"$LOGS/reset.log" 2>&1 || { echo "SWEEP FAIL: ./lab reset --all exited non-zero"; exit 1; }
snapshot > "$LOGS/after-reset-files.txt"
if ! diff -q "$STARTER_SNAPSHOT" "$LOGS/after-reset-files.txt" > /dev/null; then
  echo "SWEEP FAIL: workspace/ is not the starter tree after ./lab reset --all"
  diff "$STARTER_SNAPSHOT" "$LOGS/after-reset-files.txt" | head -20
  exit 1
fi
leftover="$(artifacts)"
[ -z "$leftover" ] || note "runtime artifacts survived reset (not student files): $(printf '%s' "$leftover" | tr '\n' ' ')"
probe=43
timeout "$CHECK_TIMEOUT" ./lab check "$probe" >"$LOGS/reset-check-$probe.log" 2>&1
probe_rc=$?
if [ "$probe_rc" -eq 0 ]; then
  echo "SWEEP FAIL: step $probe still passes after ./lab reset --all"
  exit 1
fi
note "reset ok — workspace back to $(wc -l < "$LOGS/after-reset-files.txt") starter file(s), step $probe fails again as expected"

note ""
note "== SUMMARY =="
note "pristine PASS=$pristine_pass FAIL=$pristine_fail SKIP=$pristine_skip"
note "solved   PASS=$solved_pass FAIL=$solved_fail SKIP=$solved_skip"
note "logs in $LOGS"
note "SWEEP OK"
