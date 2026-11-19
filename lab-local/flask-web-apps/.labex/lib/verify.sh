#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# .labex/lib/verify.sh - shared front-end for the generated step verifiers.
#
# Each .labex/verify_stepN.sh sources this file, declares its step metadata,
# queues its checks with `v '<json>'`, then calls `run_checks`.
# Exit code: 0 = every check passed, 1 = at least one failed, 2 = setup error.
# ---------------------------------------------------------------------------

LABEX_LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEX_ROOT="$(cd "$LABEX_LIB/../.." && pwd)"
WORKSPACE="${LAB_WORKSPACE:-$LABEX_ROOT/workspace}"
LAB_STEP_TITLE="${LAB_STEP_TITLE:-}"
LAB_STEP_GOAL="${LAB_STEP_GOAL:-}"
CHECKS=()

# v '<check json>' - queue one check.
v() { CHECKS+=("$1"); }

resolve_python() {
  if [ -n "${LAB_PYTHON:-}" ]; then
    command -v "$LAB_PYTHON" >/dev/null 2>&1 && { echo "$LAB_PYTHON"; return 0; }
    [ -x "$LAB_PYTHON" ] && { echo "$LAB_PYTHON"; return 0; }
  fi
  for candidate in "$LABEX_ROOT/.venv/bin/python" "$LABEX_ROOT/.venv/Scripts/python.exe" \
                   "$LABEX_ROOT/.venv/Scripts/python" /labenv/bin/python; do
    [ -x "$candidate" ] && { echo "$candidate"; return 0; }
  done
  command -v python3 2>/dev/null && return 0
  command -v python 2>/dev/null && return 0
  return 1
}

run_checks() {
  # Each generated verifier declares its checks in `queue`; calling it here is
  # what fills CHECKS, so a verifier that forgets to call it still gets graded.
  if declare -F queue >/dev/null 2>&1; then queue; fi
  PY="$(resolve_python)" || {
    echo "ERROR: no Python interpreter found. Inside the container run 'source /labenv/bin/activate'," >&2
    echo "       on the host create one with: python3 -m venv .venv && .venv/bin/pip install -r requirements-lab.txt" >&2
    return 2
  }
  if [ ! -d "$WORKSPACE" ]; then
    echo "ERROR: workspace directory $WORKSPACE does not exist. Run: ./lab reset --module <M>" >&2
    return 2
  fi

  echo "=============================================================================="
  echo " Step ${LAB_STEP_N:-?} - ${LAB_STEP_TITLE}"
  echo " Goal: ${LAB_STEP_GOAL}"
  echo " kind=${LAB_STEP_KIND:-build}  workspace=$WORKSPACE  python=$PY"
  echo "=============================================================================="

  if [ "${#CHECKS[@]}" -eq 0 ]; then
    export LAB_STEP_N="${LAB_STEP_N:-0}" LAB_STEP_KIND="${LAB_STEP_KIND:-read}" LAB_WORKSPACE="$WORKSPACE"
    printf '[]\n' | "$PY" "$LABEX_LIB/checks.py"
    return $?
  fi

  payload="[ "
  for i in "${!CHECKS[@]}"; do
    [ "$i" -gt 0 ] && payload="$payload, "
    payload="$payload${CHECKS[$i]}"
  done
  payload="$payload ]"

  export LAB_STEP_N="${LAB_STEP_N:-0}" LAB_WORKSPACE="$WORKSPACE"
  payload_out="$(printf '%s\n' "$payload" | "$PY" "$LABEX_LIB/checks.py")"
  status=$?
  printf '%s\n' "$payload_out"
  echo "------------------------------------------------------------------------------"
  if [ $status -eq 0 ]; then
    echo "Step ${LAB_STEP_N} verified. Next: ./lab check $(( ${LAB_STEP_N:-0} + 1 )) (or open the next step file)"
  else
    echo "Not yet. Fix the FAILed checks above, then re-run: ./${LAB_EXE:-lab} check ${LAB_STEP_N}"
  fi
  return $status
}
