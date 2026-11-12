# ---------------------------------------------------------------------------
# Local rebuild of the LabEx "Flask Web Applications" lab environment.
#
#   docker compose up -d          -> editor on http://localhost:3000
#                                    lab web app on http://localhost:8080
#   docker compose exec lab bash  -> a shell in the same environment
#
# The image is deliberately close to what the hosted VM gives you: Debian slim,
# CPython 3.12, Flask 3.x, a venv on PATH, procps/iproute2 so the graders can
# really see your running server, and code-server for the browser editor.
# ---------------------------------------------------------------------------
FROM python:3.12-slim

ARG DEBIAN_FRONTEND=noninteractive
ARG CODE_SERVER_VERSION=4.96.4
ARG INSTALL_CODE_SERVER=true

LABEL org.opencontainers.image.title="flask-web-apps" \
      org.opencontainers.image.description="Self-contained local Flask lab: 17 modules, 84 steps, 138 graded checks" \
      org.opencontainers.image.licenses="BSD-3-Clause (Flask tutorial code) + MIT (lab tooling)"

# --- make every download in this image use IPv4 -----------------------------
# Some Docker runtimes (Docker Desktop on Windows/WSL2 in particular) have no
# working IPv6 route: a dual-stack host like deb.debian.org or pypi.org then
# black-holes mid-transfer, and apt stalls on the Packages index forever. glibc
# gets an IPv4-first preference order and apt is told the same explicitly.
RUN printf 'precedence ::ffff:0:0/96  100\n' > /etc/gai.conf \
 && printf 'Acquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99force-ipv4

# --- system tools the curriculum and the verification engine need -----------
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl wget git \
      procps iproute2 net-tools lsof \
      vim nano less jq unzip xz-utils tree \
      build-essential python3-dev \
 && rm -rf /var/lib/apt/lists/* \
 && apt-get clean

# --- the lab's own Python environment --------------------------------------
# /labenv is on PATH, so `flask`, `pytest`, `coverage` and `waitress-serve`
# resolve exactly the way the graders expect them to.
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH=/labenv/bin:${PATH} \
    LAB_WEB_PORT=8080 \
    LAB_CODE_SERVER_PORT=3000 \
    LAB_PRIVATE_PORT=18080 \
    FLASK_RUN_HOST=0.0.0.0 \
    FLASK_RUN_PORT=8080

RUN python -m venv /labenv \
 && /labenv/bin/pip install --retries 5 --timeout 60 --upgrade pip setuptools wheel
COPY requirements-lab.txt /tmp/requirements-lab.txt
RUN /labenv/bin/pip install -r /tmp/requirements-lab.txt

# --- code-server (browser VS Code), best effort -----------------------------
# A failed download must not break the lab: the terminal workflow is complete
# on its own, so this layer degrades to a warning instead of a build error.
#
# The archive name is picked from `uname -m` so an arm64 host (Apple Silicon,
# Graviton) gets the native linux-arm64 build instead of running amd64 under
# Rosetta/QEMU. Unknown architectures skip the download rather than pull a
# binary the kernel cannot execute.
RUN set -eux; \
    if [ "${INSTALL_CODE_SERVER}" = "true" ]; then \
      case "$(uname -m)" in \
        x86_64|amd64)   cs_arch=amd64 ;; \
        aarch64|arm64)  cs_arch=arm64 ;; \
        armv7l|armhf)   cs_arch=armhf ;; \
        *) echo "WARNING: no code-server build for $(uname -m) - skipping, the terminal lab still works" >&2; cs_arch="" ;; \
      esac; \
      url="https://github.com/coder/code-server/releases/download/v${CODE_SERVER_VERSION}/code-server-${CODE_SERVER_VERSION}-linux-${cs_arch}.tar.gz"; \
      if [ -n "$cs_arch" ] && curl -4 -fsSL --retry 3 --max-time 900 "$url" -o /tmp/cs.tar.gz; then \
        tar -xzf /tmp/cs.tar.gz -C /opt; \
        ln -sf "/opt/code-server-${CODE_SERVER_VERSION}-linux-${cs_arch}/bin/code-server" /usr/local/bin/code-server; \
        rm -f /tmp/cs.tar.gz; \
      else \
        echo "WARNING: code-server ${cs_arch:-unknown} download failed - the lab still works in the terminal" >&2; \
      fi; \
    else \
      echo "code-server install skipped by build arg"; \
    fi

# --- lab content -----------------------------------------------------------
# /lab holds the engine, instructions and solutions; /lab/workspace is the
# student-editable tree (bind-mounted from the repo by docker-compose).
COPY . /lab/
# Keep an untouched copy of the starter workspace: the repo bind-mount shadows
# /lab/workspace, and the entrypoint seeds it on first run from here.
RUN cp -a /lab/workspace /opt/workspace-default
RUN chmod +x /lab/.labex/verify_step*.sh /lab/.labex/run-all.sh /lab/lab /lab/docker/entrypoint.sh \
 && mkdir -p /lab/workspace /root/.local/share/code-server \
 && ln -sfn /lab/workspace /workspace

# --- keep the lab venv on PATH in login shells ------------------------------
# Debian's /etc/profile overwrites PATH with the stock system path, and this
# container's own CMD is `bash -l` (as is code-server's integrated terminal), so
# without this `flask`, `pytest` and `waitress-serve` are "command not found"
# the moment you open the editor's terminal. /etc/profile sources /etc/profile.d
# after setting PATH, so re-prepending /labenv/bin here wins in every shell.
RUN printf 'export PATH=/labenv/bin:$PATH\n' > /etc/profile.d/labenv.sh

WORKDIR /lab

EXPOSE 8080 3000

ENTRYPOINT ["/lab/docker/entrypoint.sh"]
CMD ["bash", "-l"]
