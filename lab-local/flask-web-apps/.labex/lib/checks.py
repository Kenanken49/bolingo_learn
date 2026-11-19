#!/usr/bin/env python3
"""Local LabEx "Check" engine: reads an array of check objects on stdin, runs
each one against the live filesystem/process state of the workspace, prints a
line per check and exits 0 only when every check passes.

Environment:
  LAB_WORKSPACE  directory that holds the student's code (default: ../.. workspace)
  LAB_STEP_KIND  build | run | test | read  (only build steps may autostart a server)
  LAB_STEP_N     step number, for the report header
"""
import ast
import json
import os
import re
import shutil
import subprocess
import sqlite3
import sys
import importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
LAB_ROOT = os.path.dirname(os.path.dirname(HERE))
WORKSPACE = os.path.abspath(os.environ.get("LAB_WORKSPACE") or os.path.join(LAB_ROOT, "workspace"))
PROBES = os.path.join(LAB_ROOT, ".labex", "probes")
STEP_KIND = os.environ.get("LAB_STEP_KIND", "build")

sys.path.insert(0, HERE)
import webchecks  # noqa: E402


def ok(label, detail=""):
    print("  PASS  %s%s" % (label, (" - " + detail) if detail else ""))
    return True


def bad(label, hint="", detail=""):
    print("  FAIL  %s%s" % (label, (" - " + detail) if detail else ""))
    if hint:
        print("        how to fix: %s" % hint)
    return False


def abspath(rel):
    return rel if os.path.isabs(rel) else os.path.join(WORKSPACE, rel)


def lab_dir(spec):
    return abspath(spec.get("dir", "."))


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def python_bin():
    return sys.executable


def resolve_cmd(cmd, cwd):
    """Make a command list runnable on host venvs and inside the container."""
    cmd = list(cmd)
    bindir = os.path.dirname(python_bin())
    head = cmd[0]
    if head in ("python", "python3"):
        cmd[0] = python_bin()
    elif head in ("flask", "pytest", "coverage", "waitress-serve", "pip", "pip3"):
        exe = shutil.which(head)
        if not exe:
            cand = os.path.join(bindir, head)
            for suffix in ("", ".exe", "-script.py"):
                if os.path.exists(cand + suffix):
                    exe = cand + suffix
                    break
        if exe:
            cmd[0] = exe if not exe.endswith("-script.py") else [python_bin(), exe]
        else:
            cmd = [python_bin(), "-m", head] + cmd[1:]
    if isinstance(cmd[0], list):
        cmd = cmd[0] + cmd[1:]
    return cmd


def run_subprocess(cmd, cwd, extra_env=None, timeout=120):
    env = dict(os.environ)
    env["PYTHONPATH"] = os.pathsep.join([cwd, WORKSPACE, PROBES, env.get("PYTHONPATH", "")]).strip(os.pathsep)
    env["FLASK_SKIP_DOTENV"] = "1"
    if extra_env:
        env.update(extra_env)
    proc = subprocess.run([str(c) for c in cmd], cwd=cwd, env=env, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, timeout=timeout)
    return proc.returncode, proc.stdout.decode("utf-8", "replace")


# ---------------------------------------------------------------- AST checks
def _dotted(node):
    parts = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        parts.append(node.id)
        return ".".join(reversed(parts))
    return None


def _collect(tree):
    imports, assigns, funcs, routes, calls, names = {}, set(), [], set(), set(), set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                parts = alias.name.split(".")
                for i in range(1, len(parts) + 1):
                    imports.setdefault(".".join(parts[:i]), set())
                imports[alias.name].add(alias.asname or parts[0])
        elif isinstance(node, ast.ImportFrom):
            mod = ("." * node.level) + (node.module or "")
            imports.setdefault(mod, set())
            for alias in node.names:
                imports[mod].add(alias.asname or alias.name)
        elif isinstance(node, ast.Assign):
            for tgt in node.targets:
                if isinstance(tgt, ast.Name):
                    assigns.add(tgt.id)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            funcs.append(node.name)
            names.add(node.name)
            for dec in node.decorator_list:
                expr = dec.func if isinstance(dec, ast.Call) else dec
                dotted = _dotted(expr)
                if dotted:
                    calls.add(dotted)
                if dotted and dotted.endswith(".route") and isinstance(dec, ast.Call) and dec.args:
                    first = dec.args[0]
                    if isinstance(first, ast.Constant) and isinstance(first.value, str):
                        routes.add(first.value)
        elif isinstance(node, ast.Call):
            dotted = _dotted(node.func)
            if dotted:
                calls.add(dotted)
    return imports, assigns, funcs, routes, calls, names


def check_ast(c):
    path = abspath(c["f"])
    hint = c.get("hint", "")
    if not os.path.exists(path):
        return bad("file %s exists" % c["f"], hint, "not found under %s" % WORKSPACE)
    try:
        tree = ast.parse(read_text(path), filename=path)
    except SyntaxError as exc:
        return bad("%s parses as Python" % c["f"], hint, "SyntaxError line %s: %s" % (exc.lineno, exc.msg))
    imports, assigns, funcs, routes, calls, names = _collect(tree)
    problems = []
    for spec in c.get("imports", []):
        mod, _, want = spec.partition(":")
        imported = imports.get(mod)
        if imported is None:
            problems.append("missing: from %s import ... (or import %s)" % (mod, mod))
        elif want and want not in imported:
            problems.append("missing: from %s import %s" % (mod, want))
    for name in c.get("assigns", []):
        if name not in assigns:
            problems.append("missing module-level assignment: %s =" % name)
    for name in c.get("funcs", []):
        if name not in funcs:
            problems.append("missing function: def %s()" % name)
    for rule in c.get("routes", []):
        norm = {r.rstrip("/") or "/" for r in routes} | routes
        if rule not in norm and rule.rstrip("/") not in norm:
            problems.append("missing route rule %r (found: %s)" % (rule, ", ".join(sorted(routes)) or "none"))
    for dotted in c.get("calls", []):
        if not any(call == dotted or call.endswith("." + dotted) or dotted.endswith("." + call) for call in calls):
            problems.append("missing call: %s()" % dotted)
    if c.get("main_guard") and "__main__" not in read_text(path):
        problems.append('missing: if __name__ == "__main__":')
    if problems:
        return bad("AST of %s" % c["f"], hint, "; ".join(problems))
    return ok("AST of %s" % c["f"], "%d funcs, %d routes" % (len(funcs), len(routes)))


# --------------------------------------------------------------- file / pkg
def check_file(c):
    path = abspath(c["f"])
    hint = c.get("hint", "")
    if not os.path.isfile(path):
        return bad("file %s" % c["f"], hint, "not found")
    text = read_text(path)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    need = int(c.get("min", 0))
    if need and len(lines) < need:
        return bad("file %s has content" % c["f"], hint, "%d non-empty lines, need >= %d" % (len(lines), need))
    return ok("file %s" % c["f"], "%d bytes, %d lines" % (os.path.getsize(path), len(lines)))


def check_dir(c):
    rel = c.get("f") or c.get("dir")
    if os.path.isdir(abspath(rel)):
        return ok("directory %s" % rel)
    return bad("directory %s" % rel, c.get("hint", ""), "not found")


def _version_tuple(v):
    return tuple(int(x) for x in re.findall(r"\d+", v)[:3]) or (0,)


def check_pkg(c, minimum=None):
    name = c["import"]
    hint = c.get("hint", "")
    spec = importlib.util.find_spec(name) if "." not in name else None
    version = None
    try:
        from importlib.metadata import version as _v
        version = _v(name)
    except Exception:
        version = None
    if spec is None and version is None:
        try:
            mod = __import__(name)
            spec = type("x", (), {"origin": getattr(mod, "__file__", "")})
        except Exception:
            return bad("package %s installed" % name, hint, "cannot import %r" % name)
    if minimum:
        if not version:
            return bad("%s version >= %s" % (name, minimum), hint, "version unknown")
        if _version_tuple(version) < _version_tuple(minimum):
            return bad("%s version >= %s" % (name, minimum), hint, "found %s" % version)
        return ok("%s version %s >= %s" % (name, version, minimum))
    return ok("package %s importable" % name, version or "")


def check_pkgpath(c):
    name, want = c["import"], c.get("contains", "")
    hint = c.get("hint", "")
    spec = importlib.util.find_spec(name)
    origin = getattr(spec, "origin", "") or "" if spec else ""
    if not spec:
        return bad("%s is installed as a package" % name, hint, "not importable")
    if want and want not in origin.replace("\\", "/"):
        return bad("%s resolves under %s" % (name, want), hint,
                   "imported from %s - install the built wheel instead of using the source tree" % origin)
    return ok("%s resolves to %s" % (name, origin))


def check_cli(c):
    hint, cmd = c.get("hint", ""), resolve_cmd(c["cmd"], lab_dir(c))
    rc, out = run_subprocess(cmd, lab_dir(c), c.get("env"))
    label = "run: %s" % " ".join(c["cmd"])
    if rc != 0:
        tail = " | ".join(out.strip().splitlines()[-2:])
        return bad(label, hint, "exit %d: %s" % (rc, tail[:300]))
    for needle in ([c["contains"]] if c.get("contains") else []):
        if needle not in out:
            return bad(label + ' prints %r' % needle, hint, "output was: %s" % out.strip()[:300])
    any_of = c.get("contains_any") or []
    if any_of and not any(needle in out for needle in any_of):
        want = " or ".join(repr(needle) for needle in any_of)
        return bad(label + " prints %s" % want, hint, "output was: %s" % out.strip()[:300])
    return ok(label, out.strip().splitlines()[-1][:120] if out.strip() else "")


def check_pytest(c):
    d = lab_dir(c)
    target = c.get("file", "tests")
    rc, out = run_subprocess([python_bin(), "-m", "pytest", "-q", "--no-header", "-p", "no:cacheprovider", target], d, timeout=180)
    label = "pytest %s" % target
    if rc != 0:
        tail = " | ".join(out.strip().splitlines()[-3:])
        return bad(label, c.get("hint", ""), "exit %d: %s" % (rc, tail[:400]))
    summary = [ln for ln in out.splitlines() if "passed" in ln]
    return ok(label, summary[-1] if summary else "exit 0")


def check_script(c):
    probe = os.path.join(PROBES, c["name"])
    label = "probe %s" % c["name"]
    if not os.path.isfile(probe):
        return bad(label, "", "probe missing from .labex/probes")
    d = lab_dir(c)
    rc, out = run_subprocess([python_bin(), probe], d, timeout=120)
    if rc != 0:
        msg = " | ".join(ln.strip() for ln in out.strip().splitlines() if ln.strip())
        return bad(label, c.get("hint", ""), msg[:400] or "probe exited %d" % rc)
    last = [ln for ln in out.strip().splitlines() if ln.strip()]
    return ok(label, last[-1] if last else "")


def check_sql(c):
    path = abspath(c["f"])
    hint = c.get("hint", "")
    if not os.path.isfile(path):
        return bad("schema %s exists" % c["f"], hint, "not found")
    try:
        con = sqlite3.connect(":memory:")
        con.executescript(read_text(path))
    except Exception as exc:
        return bad("%s executes in SQLite" % c["f"], hint, str(exc)[:200])
    found = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    missing = [t for t in c.get("tables", []) if t not in found]
    if missing:
        return bad("%s creates tables" % c["f"], hint, "missing %s (found: %s)" % (",".join(missing), ",".join(sorted(found))))
    for table, cols in (c.get("columns") or {}).items():
        have = {r[1] for r in con.execute("PRAGMA table_info(%s)" % table)}
        lack = [x for x in cols if x not in have]
        if lack:
            return bad("%s.%s columns" % (c["f"], table), hint, "missing %s (found: %s)" % (",".join(lack), ",".join(sorted(have))))
    con.close()
    return ok("%s is valid SQLite DDL" % c["f"], "tables: " + ",".join(sorted(found)))


def check_db(c):
    path = abspath(c["f"])
    hint = c.get("hint", "")
    if not os.path.isfile(path):
        return bad("database %s exists" % c["f"], hint, "run: flask --app flaskr init-db")
    try:
        con = sqlite3.connect("file:%s?mode=ro" % path.replace("\\", "/"), uri=True)
        found = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        con.close()
    except Exception as exc:
        return bad("database %s readable" % c["f"], hint, str(exc)[:200])
    missing = [t for t in c.get("tables", []) if t not in found]
    if missing:
        return bad("database %s has tables" % c["f"], hint, "missing %s (found: %s)" % (",".join(missing), ",".join(sorted(found)) or "none"))
    return ok("database %s ready" % c["f"], "tables: " + ",".join(sorted(found)))


def check_css(c):
    path = abspath(c["f"])
    hint = c.get("hint", "")
    if not os.path.isfile(path):
        return bad("stylesheet %s exists" % c["f"], hint, "not found")
    text = read_text(path)
    rules = re.findall(r"[^{}@]+\{[^}]*\}", text)
    label = "stylesheet %s" % c["f"]
    if len(rules) < int(c.get("min_rules", 1)):
        return bad(label, hint, "%d rules, need >= %s" % (len(rules), c.get("min_rules")))
    missing = [s for s in c.get("selectors", []) if not re.search(r"(^|[,\s>])%s\s*[,{]" % re.escape(s), text, re.M)]
    if missing:
        return bad(label, hint, "missing selector(s): %s" % ", ".join(missing))
    return ok(label, "%d rules" % len(rules))


def check_async(c):
    path = abspath(c["f"])
    hint = c.get("hint", "")
    if not os.path.isfile(path):
        return bad("file %s exists" % c["f"], hint, "not found")
    tree = ast.parse(read_text(path), filename=path)
    async_names = {n.name for n in ast.walk(tree) if isinstance(n, ast.AsyncFunctionDef)}
    missing = [n for n in c.get("async", []) if n not in async_names]
    if missing:
        return bad("async views in %s" % c["f"], hint,
                   "not declared with `async def`: %s" % ", ".join(missing))
    # await expressions must actually be used somewhere
    awaits = [n for n in ast.walk(tree) if isinstance(n, ast.Await)]
    if not awaits:
        return bad("async defs in %s" % c["f"], hint, "no `await` expression found - the views are not really async")
    routes = _collect(tree)[3]
    for rule in c.get("routes", []):
        if rule not in routes:
            return bad("async defs in %s" % c["f"], hint, "missing route %r" % rule)
    return ok("async views in %s" % c["f"], "%d await expressions" % len(awaits))


def read_check(c):
    return ok("reading step", c.get("hint", ""))


HANDLERS = {
    "pkg": check_pkg,
    "pkgmin": check_pkg,
    "pkgpath": check_pkgpath,
    "ast": check_ast,
    "file": check_file,
    "dir": check_dir,
    "cli": check_cli,
    "pytest": check_pytest,
    "script": check_script,
    "sql": check_sql,
    "db": check_db,
    "css": check_css,
    "async": check_async,
    "http": webchecks.check_http,
    "app": webchecks.check_app,
    "running": webchecks.check_running,
}


def main():
    payload = json.loads(sys.stdin.read() or "[]")
    # verify.sh pipes a bare JSON array; a {"checks": [...]} wrapper is also
    # accepted so the engine can be driven by hand.
    checks = payload.get("checks", []) if isinstance(payload, dict) else payload
    if not checks:
        print("  SKIP  this step has no runnable artefact to verify (it is a reading/")
        print("        diagnosis step). Follow the instructions, then continue.")
        return 0
    failures = 0
    for c in checks:
        c["_dir"] = lab_dir(c)
        handler = HANDLERS.get(c["t"])
        if handler is None:
            print("  FAIL  unknown check type %r (engine bug)" % c["t"])
            failures += 1
            continue
        try:
            if c["t"] == "pkgmin":
                passed = check_pkg(c, minimum=c.get("min"))
            else:
                passed = handler(c)
        except Exception as exc:  # a broken check must never look like a pass
            print("  FAIL  %s check crashed: %s: %s" % (c["t"], type(exc).__name__, exc))
            passed = False
        if not passed:
            failures += 1
    total = len(checks)
    print("")
    if failures:
        print("RESULT: %d/%d checks passed - step %s NOT complete." % (total - failures, total, os.environ.get("LAB_STEP_N", "?")))
        return 1
    print("RESULT: all %d checks passed - step %s complete." % (total, os.environ.get("LAB_STEP_N", "?")))
    return 0


if __name__ == "__main__":
    sys.exit(main())