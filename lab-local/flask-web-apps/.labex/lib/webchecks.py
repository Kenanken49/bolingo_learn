#!/usr/bin/env python3
"""HTTP / app / running checkers for the lab engine.

Rules that keep the graders honest:
  * a `run` step is only satisfied by a server the STUDENT started - the engine
    never starts one for those steps, it fails with a clear instruction instead;
  * a `build` step may have a server autostarted by the engine, on a private
    port, so the student's own server on 8080 is never disturbed or faked.
"""
import atexit
import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

STUDENT_PORT = int(os.environ.get("LAB_WEB_PORT") or 8080)
PRIVATE_BASE = int(os.environ.get("LAB_PRIVATE_PORT") or 18080)
_pool = {}
_started = []


def ok(label, detail=""):
    print("  PASS  %s%s" % (label, (" - " + detail) if detail else ""))
    return True


def bad(label, hint="", detail=""):
    print("  FAIL  %s%s" % (label, (" - " + detail) if detail else ""))
    if hint:
        print("        how to fix: %s" % hint)
    return False


def port_open(port, host="127.0.0.1", timeout=0.4):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0


def _free_private_port():
    for cand in range(PRIVATE_BASE, PRIVATE_BASE + 40):
        if not port_open(cand):
            return cand
    return PRIVATE_BASE


def _kill_all():
    for proc, _port in _started:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


atexit.register(_kill_all)


def _autostart_allowed():
    return os.environ.get("LAB_STEP_KIND", "build") == "build"


def serve_for(directory, app_spec):
    """Return (base_url, live_by_student). Autostarts only on build steps."""
    key = (directory, app_spec)
    if key in _pool:
        return _pool[key]
    if not _autostart_allowed():
        if port_open(STUDENT_PORT):
            url = "http://127.0.0.1:%d" % STUDENT_PORT
            _pool[key] = (url, True)
            return url, True
        _pool[key] = (None, False)
        return None, False
    port = _free_private_port()
    log_path = os.path.join(directory, ".lab-autostart.log")
    log = open(log_path, "w", encoding="utf-8")
    cmd = [sys.executable, "-m", "flask", "--app", app_spec, "run",
           "--host=127.0.0.1", "--port=%d" % port]
    env = dict(os.environ)
    env["PYTHONPATH"] = directory
    env["FLASK_SKIP_DOTENV"] = "1"
    proc = subprocess.Popen(cmd, cwd=directory, env=env, stdout=log, stderr=subprocess.STDOUT)
    deadline = time.time() + 15
    while time.time() < deadline:
        if proc.poll() is not None:
            break
        if port_open(port):
            break
        time.sleep(0.25)
    if proc.poll() is not None or not port_open(port):
        try:
            tail = open(log_path, encoding="utf-8", errors="replace").read().strip().splitlines()[-3:]
        except Exception:
            tail = []
        _pool[key] = (None, False)
        proc.stderr = tail  # stash for the caller's message
        return None, False
    _started.append((proc, port))
    url = "http://127.0.0.1:%d" % port
    _pool[key] = (url, False)
    return url, False


def fetch(base, path, query=None, headers=None, timeout=10):
    url = base + path
    if query:
        url += ("&" if "?" in url else "?") + query
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", "replace")
            return resp.status, dict(resp.headers), body, None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
        return exc.code, dict(exc.headers), body, None
    except Exception as exc:
        return None, {}, "", "%s: %s" % (type(exc).__name__, exc)


# ------------------------------------------------------------------ http
def check_http(c):
    hint = c.get("hint", "")
    directory = c["_dir"]
    app_spec = c.get("app", "app")
    path = c.get("path", "/")
    label = "GET %s" % path
    base, live = serve_for(directory, app_spec)
    if base is None:
        if not _autostart_allowed():
            return bad(label, hint,
                       "no server answering on port %d. Start it yourself: %s" % (STUDENT_PORT, hint or "flask run --host=0.0.0.0 --port 8080"))
        logtail = ""
        try:
            logtail = " | ".join(open(os.path.join(directory, ".lab-autostart.log"),
                                      encoding="utf-8", errors="replace").read().strip().splitlines()[-2:])
        except Exception:
            pass
        return bad(label, hint, "app %r would not start (%s)" % (app_spec, logtail[:250]))
    if not live:
        label += " [engine-started private server :%s]" % base.rsplit(":", 1)[-1]
    status, headers, body, err = fetch(base, path, c.get("query"))
    if err:
        return bad(label, hint, err)
    problems = []
    if c.get("status") and status != c["status"] and not c.get("any_status"):
        problems.append("status %s, expected %s" % (status, c["status"]))
    if c.get("ctype") and c["ctype"] not in headers.get("Content-Type", ""):
        problems.append("Content-Type %r, expected %s" % (headers.get("Content-Type"), c["ctype"]))
    for hdr in ([c["header"]] if c.get("header") else []):
        key, _, want = hdr.partition(":")
        got = headers.get(key.strip(), "")
        if want.strip() and want.strip().lower() not in got.lower():
            problems.append("header %s: %r, expected %r" % (key.strip(), got, want.strip()))
    if c.get("contains") and c["contains"] not in body:
        frag = " | ".join(ln.strip() for ln in body.strip().splitlines() if ln.strip())[:200]
        problems.append("body does not contain %r (got: %s)" % (c["contains"], frag))
    if c.get("not_contains") and c["not_contains"] in body:
        problems.append("body must not contain %r - that is the unescaped/unsafe output" % c["not_contains"])
    if c.get("form_field"):
        if not re.search(r"<(input|textarea|select)[^>]+name=[\"']%s[\"']" % re.escape(c["form_field"]), body, re.I):
            problems.append("no form control named %r in the response" % c["form_field"])
    if problems:
        return bad(label, hint, "; ".join(problems))
    return ok(label, "%s %s, %d bytes" % (status, headers.get("Content-Type", "").split(";")[0], len(body)))


# ------------------------------------------------------------------- app
def _load_target(directory, target):
    mod_name, _, attr = target.partition(":")
    sys.path.insert(0, directory)
    os.chdir(directory)
    import importlib
    for pre in list(sys.modules):
        if pre == mod_name or pre.startswith(mod_name + "."):
            del sys.modules[pre]
    # import_module, not __import__: for "flaskr.auth" the latter hands back the
    # top-level package, so the attribute lookup would miss the submodule.
    mod = importlib.import_module(mod_name)
    # Grade the student's own copy only. Without this, a package installed into
    # site-packages (the wheel from the deployment module) would silently answer
    # for a workspace where the code has not been written yet.
    origin = os.path.abspath(getattr(mod, "__file__", "") or "")
    root = os.path.abspath(directory)
    if not origin.startswith(root + os.sep):
        raise ImportError(
            "there is no %r package inside %s - this check grades the copy in your "
            "workspace, not one installed into site-packages" % (mod_name, root)
        )
    obj = mod
    for part in ([attr] if attr else []):
        for piece in part.split("."):
            obj = getattr(obj, piece)
    if callable(obj) and not hasattr(obj, "test_client"):
        obj = obj()
    return obj


def check_app(c):
    """Run the app checks with any per-check environment variables applied.

    Several configuration steps decide which settings module to load from an
    environment variable (FLASK_ENV here), so the check's `env` block has to be
    in os.environ while the app object is created and exercised.
    """
    env = c.get("env") or {}
    if not env:
        return _check_app(c)
    saved = {key: os.environ.get(key) for key in env}
    for key, value in env.items():
        os.environ[key] = value
    try:
        return _check_app(c)
    finally:
        for key, value in saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def _check_app(c):
    hint = c.get("hint", "")
    problems = []
    try:
        obj = _load_target(c["_dir"], c["target"])
    except Exception as exc:
        return bad("load %s" % c["target"], hint, "%s: %s" % (type(exc).__name__, exc))
    from flask import Blueprint
    if isinstance(obj, Blueprint):
        bp = obj
        want = c.get("blueprint") or {}
        if want.get("name") and bp.name != want["name"]:
            problems.append("blueprint name %r, expected %r" % (bp.name, want["name"]))
        if want.get("url_prefix") and bp.url_prefix != want["url_prefix"]:
            problems.append("blueprint url_prefix %r, expected %r" % (bp.url_prefix, want["url_prefix"]))
        if problems:
            return bad("blueprint %s" % c["target"], hint, "; ".join(problems))
        return ok("blueprint %s" % c["target"], "name=%s url_prefix=%s" % (bp.name, bp.url_prefix))
    app = obj
    for key, want in (c.get("expect_config") or {}).items():
        got = app.config.get(key)
        same = (got == want) or (isinstance(want, bool) and bool(got) is want)
        if not same:
            problems.append("app.config[%r] = %r, expected %r" % (key, got, want))
    if c.get("blueprint_registered"):
        name = c["blueprint_registered"]
        if name not in app.blueprints:
            problems.append("blueprint %r not registered (found: %s)" % (name, ", ".join(sorted(app.blueprints)) or "none"))
    for ep in c.get("endpoints", []):
        if ep not in {r.endpoint for r in app.url_map.iter_rules()}:
            problems.append("endpoint %r missing from url_map" % ep)
    if c.get("url_rule"):
        ep, rule = c["url_rule"]["endpoint"], c["url_rule"]["rule"]
        match = [r.rule for r in app.url_map.iter_rules() if r.endpoint == ep]
        if rule not in match:
            problems.append("endpoint %r serves %s, expected %r" % (ep, match or "nothing", rule))
    if c.get("get"):
        client = app.test_client()
        url = c["get"] + ("?" + c["query"] if c.get("query") else "")
        resp = client.get(url)
        body = resp.get_data(as_text=True)
        label = "test client GET %s" % url
        if c.get("status") and resp.status_code != c["status"]:
            problems.append("status %s, expected %s" % (resp.status_code, c["status"]))
        if c.get("ctype") and c["ctype"] not in resp.headers.get("Content-Type", ""):
            problems.append("Content-Type %r, expected %r" % (resp.headers.get("Content-Type"), c["ctype"]))
        if c.get("contains") and c["contains"] not in body:
            frag = " | ".join(ln.strip() for ln in body.strip().splitlines() if ln.strip())[:200]
            problems.append("body lacks %r (got: %s)" % (c["contains"], frag))
        if c.get("not_contains") and c["not_contains"] in body:
            problems.append("body must not contain %r" % c["not_contains"])
        for hdr in c.get("expect_headers", []):
            if hdr not in resp.headers:
                problems.append("response header %r missing (got: %s)" % (hdr, ", ".join(resp.headers.keys())))
        if c.get("expect_cookie"):
            set_cookie = resp.headers.get("Set-Cookie", "")
            for attr in c["expect_cookie"]:
                key, _, val = attr.partition("=")
                if val:
                    if key.lower() not in set_cookie.lower() or val.lower() not in set_cookie.lower():
                        problems.append("cookie must set %s=%s (Set-Cookie: %r)" % (key, val, set_cookie))
                elif key.lower() not in set_cookie.lower():
                    problems.append("cookie missing flag %s (Set-Cookie: %r)" % (key, set_cookie))
            if not set_cookie:
                problems.append("response set no cookie at all")
    else:
        label = "app probe %s" % c["target"]
    if problems:
        return bad(label, hint, "; ".join(problems))
    detail = c.get("contains") or c.get("get") or json.dumps(c.get("expect_config") or c.get("blueprint_registered"))
    return ok(label, str(detail)[:80])


# --------------------------------------------------------------- running
def live_processes():
    procs = []
    if os.name == "posix" or os.path.isdir("/proc"):
        try:
            for pid in os.listdir("/proc"):
                if not pid.isdigit():
                    continue
                try:
                    with open("/proc/%s/cmdline" % pid, "rb") as fh:
                        cmd = fh.read().replace(b"\0", b" ").decode("utf-8", "replace").strip()
                    if cmd:
                        procs.append(cmd)
                except Exception:
                    pass
        except Exception:
            procs = []
    if not procs:
        # No /proc: the lab is running outside Docker (macOS, or Windows when
        # you grade straight from the repo). Ask the platform for command lines.
        sources = (
            ["ps", "-A", "-o", "args="],
            ["powershell", "-NoProfile", "-Command",
             "Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }"],
        )
        for cmd in sources:
            try:
                out = subprocess.run(cmd, stdout=subprocess.PIPE,
                                     stderr=subprocess.DEVNULL, timeout=25).stdout
            except Exception:
                continue
            lines = [ln.strip() for ln in out.decode("utf-8", "replace").splitlines() if ln.strip()]
            if lines:
                procs = lines
                break
    return procs


def check_running(c):
    hint = c.get("hint", "")
    port = int(c.get("port") or STUDENT_PORT)
    pattern = c.get("match", "")
    label = "process listening on :%d matching /%s/" % (port, pattern)
    if not port_open(port):
        return bad(label, hint, "nothing is answering on port %d" % port)
    hits = [p for p in live_processes() if re.search(pattern, p)]
    if not hits:
        return bad(label, hint,
                   "port %d is open but no process command line matched /%s/ - start it from the step instructions" % (port, pattern))
    if c.get("path"):
        base = "http://127.0.0.1:%d" % port
        status, headers, body, err = fetch(base, c["path"], c.get("query"))
        if err:
            return bad(label + " then GET %s" % c["path"], hint, err)
        problems = []
        if c.get("status") and status != c["status"] and not c.get("any_status"):
            problems.append("status %s, expected %s" % (status, c["status"]))
        if c.get("contains") and c["contains"] not in body:
            problems.append("body lacks %r" % c["contains"])
        for hdr in ([c["header"]] if c.get("header") else []):
            key, _, want = hdr.partition(":")
            if want.strip().lower() not in headers.get(key.strip(), "").lower():
                problems.append("header %s: %r, expected %r" % (key.strip(), headers.get(key.strip()), want.strip()))
        if c.get("ctype") and c["ctype"] not in headers.get("Content-Type", ""):
            problems.append("Content-Type %r, expected %r" % (headers.get("Content-Type"), c["ctype"]))
        if problems:
            return bad(label + " + GET %s" % c["path"], hint, "; ".join(problems))
    return ok(label, hits[0][:110])
