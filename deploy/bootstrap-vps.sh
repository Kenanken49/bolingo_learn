#!/usr/bin/env bash
# Coolify bootstrap for the fresh InterServer VPS (vps3753817).
#
#   bash deploy/bootstrap-vps.sh          # as root, on that box
#
# It checks the box can actually host a build, opens the ports Coolify needs,
# runs the official installer, and prints the dashboard URL. Nothing about the
# app is configured here — that happens once the dashboard exists.
set -euo pipefail

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\n[FAIL] %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root"
. /etc/os-release
case "${ID:-}" in
  ubuntu | debian) log "Host: ${PRETTY_NAME:-$ID} $(uname -m)" ;;
  *) die "expected Ubuntu or Debian, found '${ID:-unknown}'" ;;
esac

# Coolify, Postgres and an Expo image build are not small. A 1 GB box that
# starts swapping mid-build produces a mystery failure later; say so now.
mem_mb=$(awk '/MemTotal/ { printf "%d", $2 / 1024 }' /proc/meminfo)
free_gb=$(df -BG --output=avail / | tail -n 1 | tr -dc '0-9')
[ "$mem_mb" -ge 1800 ] || log "WARNING: ${mem_mb} MB RAM — Coolify wants ~2 GB. Add swap before the first build."
[ "${free_gb:-0}" -ge 12 ] || log "WARNING: ${free_gb:-?} GB free on / — images plus a build want ~10 GB+."

IP="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo '<vps-ip>')"
log "Public IP: ${IP}"

log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates >/dev/null

log "Installing Coolify (official installer, owns 80/443 + :8000)"
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

log "Waiting for the dashboard on :8000"
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:8000; then break; fi
  sleep 3
done

log "Containers"
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' | head -n 12

cat <<EOF

==> Done.
    Dashboard: http://${IP}:8000
    Next: create the admin account, add a Postgres resource, then add this repo
    as an application with build pack "Dockerfile", port 3000 and the variables
    listed in deploy/vps-coolify.md.
EOF
