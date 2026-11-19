# Flask Web Applications — local lab

A self-contained rebuild of the LabEx *Flask Web Applications* course path.
Everything runs on your machine: the runtime is a Docker container, the
instructions are markdown files in this repo, and the orange **Check** button is
`./lab check <step>` — a real grader that looks at your files, imports your app,
and talks to your running server.

| | |
|---|---|
| Modules | 17 |
| Steps | 84 |
| Graded checks | 138 |
| Web app port | `8080` |
| Browser editor port | `3000` (code-server) |
| Runtime | `python:3.12-slim` + Flask 3.x venv at `/labenv` |

No course content was scraped from labex.io: the text and the checks are
derived from the Flask distillation already licensed into this repository
(`lib/labex/guided/flask`) plus the official Flask tutorial, whose `flaskr`
code is BSD-3-Clause. See `LICENSE-notes.md`.

---

## 1. Quick start

```bash
cd lab-local/flask-web-apps
docker compose up -d --build          # ~2 min on a warm cache
docker compose exec lab bash          # a shell inside the lab
```

Inside the container you land in `/lab`:

```bash
./lab next                # which step you are on, and what to do
./lab check 3             # grade step 3   (exit 0 = pass)
./lab serve quickstart    # cd quickstart && flask --app app run --host=0.0.0.0 --port 8080
./lab stop                # stop servers started by ./lab serve
./lab solve --step 31     # lay down the finished code up to step 31
./lab reset --module 5    # pristine starter for flaskr-app (replays modules 5-4)
./.labex/run-all.sh       # run all 84 graders against the current tree
```

From the host:

* **Editor** — <http://localhost:3000> (code-server, no password, opens `workspace/`)
* **Your app** — <http://localhost:8080> (whatever you last ran with `./lab serve`)
* **Files** — `workspace/` in this repo is bind-mounted to `/lab/workspace`, so
  your edits are on disk the moment you save, and survive `docker compose down`.

`./lab check` also works **without Docker** if you make a local venv in
`.venv/` with `pip install -r requirements-lab.txt`; the graders resolve paths
relative to the repo, not to `/lab`. The container is the authoritative
environment — on a host where something already owns `127.0.0.1:8080` (a local
Apache or nginx will do it) export `LAB_WEB_PORT` to a free port and pass the
same port to `./lab serve`, or the `http`/`running` checks will grade the wrong
server. `LAB_PYTHON` picks the interpreter when it is not `.venv`.

## 2. Layout

```
.
├── Dockerfile                  # the lab VM: Debian slim, /labenv, code-server
├── docker-compose.yml          # ports 8080 + 3000, workspace bind-mount
├── requirements-lab.txt        # Flask, pytest, coverage, waitress, asgiref, build
├── docker/entrypoint.sh        # seeds the workspace, starts code-server, prints MOTD
├── lab                         # the command palette (check/next/serve/solve/reset/run-all)
├── .labex/
│   ├── config.json             # lab metadata + the 84-step sequence (machine readable)
│   ├── verify_step1.sh … verify_step84.sh   # one grader per step
│   ├── run-all.sh              # every grader, one command
│   ├── lib/verify.sh           # the grader harness (bash)
│   ├── lib/checks.py           # check dispatcher (AST, files, CLI, pytest, …)
│   ├── lib/webchecks.py        # live HTTP + app-boot + DB/CSS/SQL checks
│   └── probes/                 # 11 small probe apps the graders boot in-process
├── .ci/
│   └── course-sweep.sh         # the course's release bar, run inside the image (CI)
├── lab_content/
│   └── step1.md … step84.md    # the instructions, one file per step
├── workspace/                  # YOUR code. Start here. 11 project directories
│   ├── quickstart/  templates-lab/  devserver-lab/  cli-lab/
│   ├── flaskr-app/  config-lab/  signals-lab/  shell-lab/
│   └── test-lab/  secure-lab/  async-lab/
├── starter/                    # pristine copy of each workspace dir (used by ./lab reset)
├── solutions/                  # finished code, one overlay per module + step snapshots
│   ├── m01-quickstart-web-app/ … m17-deployment/
│   ├── _states/m10-step-48 … m10-step-51     # mid-module snapshots (config.py evolves)
│   └── */+*.sh                 # post-install hooks (e.g. module 17 builds a wheel)
├── tools/
│   ├── course.json             # the spec: modules, steps, goals, checks  (source of truth)
│   ├── source-corpus.json      # the prose each step's markdown is written from
│   └── generate.mjs            # regenerates lab_content/, .labex/*, config.json
└── README.md  LICENSE-notes.md
```

To change the course, edit `tools/course.json` and re-run the generator — the
markdown, the graders and `config.json` are all derived, never hand-edited:

```bash
node tools/generate.mjs        # "generated 84 markdown files and 84 graders"
```

## 3. How a step is graded

`./lab check N` runs `.labex/verify_stepN.sh`. That script declares its target
directory and step, then queues one JSON check per requirement:

```bash
source .labex/lib/verify.sh
queue() {
  v '{"t":"ast","f":"quickstart/app.py","funcs":["hello_world"],"routes":["/"]}'
  v '{"t":"http","dir":"quickstart","app":"app","path":"/","status":200,"contains":"Hello, World!"}'
}
run_checks        # -> .labex/lib/checks.py -> 0 = pass, 1 = fail, 2 = cannot grade
```

The check types are real, not keyword grepping:

| `t` | What it actually does |
|---|---|
| `file`, `dir` | stats the path under `workspace/`, checks size/line minimums |
| `ast` | parses your Python with `ast`, looks for imports, functions, decorators, `@app.route` rules, assignments, calls |
| `pkg`, `pkgmin`, `pkgpath` | imports a package in the lab venv, reads `__version__`, inspects where `site-packages` it came from |
| `http` | opens a socket to `127.0.0.1:8080` and asserts status, headers and body |
| `running` | `ss`/`/proc` — proves a real dev-server process with your command line is listening on 8080 |
| `app` | imports your factory in-process (`flaskr:create_app`) and reads `app.config`, `url_map`, blueprints |
| `cli` | runs your command (`flask --app … init-db`, `python commands.py John`) and asserts stdout + exit code |
| `pytest` | runs your test file with the lab interpreter |
| `sql`, `db`, `css` | parses `schema.sql`, reads SQLite tables/columns, parses your CSS |
| `script` | boots a probe from `.labex/probes/` against your app and exercises real requests (auth guards, CSRF rejection, XSS escaping, secret-key isolation) |

A grader prints every failed requirement with the file it looked at and a
`hint:` line telling you the command to run. Exit code `0` = pass, `1` = fail,
`2` = the grader could not grade it (missing interpreter, unreadable file).

### Honesty rules this lab follows

* **Nothing is faked.** A step passes only if the file, the import, the HTTP
  response or the process is really there. `running` and `http` checks against
  port 8080 fail with *"no server answering on port 8080 — run ./lab serve …"*
  until you start one. `kind: run` / `test` steps never start a server for you.
* `kind: build` steps may boot your app **in-process on a private port
  (`LAB_PRIVATE_PORT`, 18080)** to evaluate a template or a route. That never
  touches your 8080, and the grader says `via private boot` when it does it.
* `app` checks import **your copy in `workspace/`**, never a wheel you installed
  in an earlier module: if `flaskr` is only in `site-packages`, the check fails
  and says so instead of quietly grading the installed package. The one check
  that *wants* `site-packages` is `pkgpath` in step 82, where installing the
  application is the point.
* Three steps are reading comprehension, not filesystem state: **16, 61, 79**.
  They have no checks, are listed in `config.json → honesty.ungradeable_steps`,
  and print `SKIP` with exit code 0. You cannot "pass" them by writing code, and
  they are not counted as passes.

## 4. Working through the course

```bash
docker compose exec lab bash
cd /lab
./lab show 1          # read the step
# …edit workspace/quickstart/app.py in the browser editor…
./lab check 1
```

Steps are sequential; each module's directory is independent, so you can do
module 10 (`config-lab`) without finishing `flaskr-app`. If you want the answer
for a step: `./lab solve --step 31`, read it, then `./lab reset --module 6` to
get back to your own work — `reset` replays the finished code of every earlier
module that shares that directory (the `flaskr-app` chain is 5 → 6 → 7 → 8 → 9 →
14 → 17), so module 9 always starts from a working flaskr.

Useful checks while you work:

```bash
curl -i http://localhost:8080/            # from the host, against your app
docker compose logs -f lab                # code-server + MOTD output
docker compose exec lab ps aux            # what is running in the lab
```

## 5. Resetting everything

```bash
docker compose down
rm -rf workspace && docker compose up -d --build   # entrypoint re-seeds the starter
```

## 6. Verifying the whole course (CI)

`.ci/course-sweep.sh` is this directory's release bar, and it runs **inside the
built image** — that is the only place the `http` / `running` checks can be
trusted, since a host may have something else sitting on port 8080.

```bash
docker build -t labex-flask-web-apps:local .
docker run --rm -v "$(pwd)/.ci/logs:/tmp/course-sweep" labex-flask-web-apps:local \
  bash /lab/.ci/course-sweep.sh          # ~15 min; exit 0 means the course is sound
```

Four phases have to hold, or it exits non-zero:

| Phase | Assertion |
|---|---|
| **pristine** | With an untouched workspace, 76 of the 84 graders FAIL. Five pass by design — steps 8, 18, 53, 67, 76 only grade that a package is importable and the image ships flask / jinja2 / blinker / pytest / coverage. Steps 16, 61, 79 report SKIP. A grader that passes with nothing built grades nothing. |
| **solved** | `./lab solve --step N` succeeds for every N from 1 to 84, and `./lab check N` then passes (or SKIPs for the reading steps). Steps whose checks talk to a live server get a real `./lab serve` on port 8080 first, and the server is stopped again afterwards. |
| **runner** | The generated aggregate runner, `.labex/run-all.sh 1 7`, exits 0. |
| **reset** | `./lab reset --all` puts `workspace/` back to exactly the starter file set it began with, and a step that passed now fails again. |

Thresholds are measured in the container, not guessed, and are baked into the
script; each one is overridable (`PRISTINE_PASS_MAX`, `PRISTINE_FAIL_MIN`,
`SOLVED_FAIL_MAX`, `LAST_STEP`) for a focused local run. Logs land in
`/tmp/course-sweep` (mount it to keep them).

GitHub Actions runs the same sweep in the `course-lab` job of
`.github/workflows/ci.yml`, alongside `npm run gate` for the app. That job also
asserts the code-server architecture mapping below still has a real upstream
archive, so a missing asset fails the build instead of shipping a half-installed
editor.

The app side of the same course is generated from these files: from the repo
root, `npm run course:flask` rebuilds `lib/labex/guided/flask` (17 walkthroughs,
all 84 steps with their code and graded checks) for the phone and web players.

## 7. Requirements

Docker (with the Compose plugin) and ~1.5 GB of disk for the image, or a local
Python 3.12 venv if you would rather skip Docker and use your own editor.
Ports 8080 and 3000 must be free on the host; override with `LAB_WEB_PORT` /
`LAB_CODE_SERVER_PORT` and the matching `ports:` entries if they are not.

The image picks the code-server archive from `uname -m` — `x86_64`/`amd64` get
`linux-amd64`, `aarch64`/`arm64` get `linux-arm64` — so an Apple Silicon build
runs the browser editor natively instead of under emulation. `armhf` has no
upstream archive: the build says so, skips code-server, and the terminal lab
still works. Pin or skip the editor with `--build-arg CODE_SERVER_VERSION=…` /
`--build-arg INSTALL_CODE_SERVER=false`.
