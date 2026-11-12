# Provenance and licensing

This directory is a **local re-implementation of the shape** of a hosted
interactive course. It does not copy files out of the hosted platform, and the
code it teaches is upstream open source. What you are reading, and where it
comes from:

| Part of the lab | Origin | Licence |
|---|---|---|
| Course outline, module order, step goals | Derived from the Flask learning path already distilled into this repository under licence (`lib/labex/guided/flask/`) and the public Flask tutorial table of contents | n/a — factual structure |
| Prose in `lab_content/step*.md` | Written fresh for this lab from `tools/source-corpus.json` (Flask documentation topics + the distilled script) | see below |
| `flaskr` application code in `solutions/m05 … m17` | The official Flask tutorial application, https://flask.palletsprojects.com/tutorial/ | BSD-3-Clause (Pallets Projects) |
| `flaskr` tests (`m14`) and `schema.sql` | Same tutorial source, adapted so they pass in this container | BSD-3-Clause (Pallets Projects) |
| Verification engine (`.labex/lib/*`, `probes/*`, `verify_step*.sh`), the `lab` CLI, `Dockerfile`, `docker/entrypoint.sh`, `docker-compose.yml`, `tools/*` | Written for this repository | MIT |
| Flask, Werkzeug, Jinja2, itsdangerous, blinker, click, pytest, coverage, waitress, asgiref, build | Installed by `requirements-lab.txt` at build time from PyPI | BSD-3-Clause / MIT as upstream |
| Debian base image + apt packages, code-server | Pulled from Docker Hub / GitHub releases at build time | their own licences |

Two practical consequences:

1. **The image is built, not shipped.** `Dockerfile` pulls `python:3.12-slim`
   and installs the pip requirements and (optionally) code-server on your
   machine, so nothing redistributes those binaries.
2. **`flaskr` is upstream code, retargeted.** The lab's flaskr differs from the
   tutorial in ways the course's own probes demand — `hello()` is served at `/`
   in modules 5–8 so an early check of `GET /` can pass, and `delete()` accepts
   `GET` as well as `POST` so the delete page can be graded. Those deviations
   are noted in the source files themselves. Nothing here is affiliated with,
   or endorsed by, the hosted platform or the Pallets Projects.

If you publish or sell derived work from this directory, keep the BSD-3-Clause
notice with the flaskr files and the MIT notice with the tooling.
