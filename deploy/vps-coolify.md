# Deploying on the InterServer VPS (vps3753677)

The VPS already runs the production tutor LLM behind nginx for
`bolingo.co.ke`, so it is **not** a blank box. The rule for this deploy:
Coolify owns the build and the container, nginx keeps owning 80/443. Coolify's
own proxy (Traefik) must not bind those ports or it will take the live
`/llm-<token>/` endpoint down with it.

```
bingers/browser ──► nginx :443 (TLS, /llm-<token>/ → Ollama)
                      └── proxy_pass 127.0.0.1:3000 ──► Bolingo container (Coolify)
                                                        ├── dist/  (Expo web export)
                                                        └── /api/* (credentials, jobs)
                                                              └── Postgres
```

## Two boxes, two layouts

| Host | What runs on it | Edge |
| --- | --- | --- |
| `vps3753817` (fresh, this deploy) | Coolify, Postgres, the app container | **Coolify's own proxy** on 80/443 with Let's Encrypt. Bootstrap: `bash deploy/bootstrap-vps.sh` |
| `vps3753677` = `162.35.183.161` (legacy) | nginx + Ollama, the `/llm-<token>/` tutor endpoint | **nginx stays the edge**; Coolify would publish on `127.0.0.1:3000` and nginx proxies to it (`deploy/nginx-bolingo-web.conf`) |

Only one of these needs to serve the site. The sections below describe the
legacy layout because it carries the live tutor endpoint; on the fresh box,
skip the proxy surgery in step 1 and point the domain straight at Coolify's
Traefik proxy (Coolify → Application → Domains → HTTPS).

## 0. Access

Everything below is run as `root` over SSH on the VPS (`162.35.183.161`,
hostname `vps3753677`). Ports 22/80/443 are open; root login currently accepts
neither the workstation key nor a password, so grant access before deploying:

```bash
# from the workstation that will run the deploy
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@162.35.183.161

# or, from a shell already on the VPS, append the same key
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo '<workstation-public-key>' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

## 1. Install Coolify without taking the edge

```bash
# as root on the VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

The installer starts its proxy on 80/443. Because nginx already owns those,
stop the proxy container and leave Coolify as a build/deploy manager only:

```bash
docker ps --format '{{.Names}}' | grep -i proxy      # note the name, e.g. coolify-proxy
docker stop <proxy-name> && docker update --restart=no <proxy-name>
```

Coolify's dashboard answers on `http://<vps-ip>:8000` (open it over an SSH
tunnel: `ssh -L 8000:127.0.0.1:8000 root@<vps-ip>`). Finish the first-run
account, then add a **Postgres** database resource and copy its internal
`postgres://…` URL.

## 2. Create the application

- Source: this GitHub repo, branch `main`.
- Build pack: **Dockerfile** (already in the repo root).
- Port: **3000**.
- Ports mapping: `127.0.0.1:3000:3000` so only nginx can reach it.
- Health check: path `/api/health` (the image also has a Docker `HEALTHCHECK`).

Environment — build variables are the ones Expo compiles into the bundle:

| Name | Kind |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | build |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | build |
| `EXPO_PUBLIC_SITE_URL` | build |
| `DATABASE_URL` | runtime |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | runtime (optional, falls back to the `EXPO_PUBLIC_*` values) |
| `DATABASE_SSL` | runtime, only if that Postgres needs TLS |
| `MIGRATE_ON_START` | runtime, `1` while there is a single replica |

## 3. Database schema

```bash
# inside the running container (Coolify → Terminal), or from the repo:
node server/migrate.mjs
```

## 4. Put nginx in front

```bash
install -m 644 deploy/nginx-bolingo-web.conf /etc/nginx/snippets/bolingo-web.conf
# add inside the server block with `server_name bolingo.co.ke;`
#   include /etc/nginx/snippets/bolingo-web.conf;
nginx -t && systemctl reload nginx
```

Then verify before touching DNS:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: bolingo.co.ke' http://127.0.0.1/
curl -s http://127.0.0.1:3000/api/health
```

## 5. DNS cutover and retiring Netlify

1. Lower the `bolingo.co.ke` A record TTL, then point it at the VPS IP.
2. Confirm `https://bolingo.co.ke/`, a deep link (`/verify/ABC-123-456`),
   `/api/health`, `/app-ads.txt` and `/wireframes/` from the public domain —
   with the certificate renewed for the new origin (`certbot --nginx -d bolingo.co.ke`).
3. Check Ask Bingo in the app: it calls the VPS `/llm-<token>/` path, which the
   nginx change must leave working.
4. Only then delete the Netlify site.

## Rolling back

Coolify keeps previous images: **Application → Deployments → Redeploy** on the
last good build. Because nginx is independent, an app rollback never touches
TLS or the tutor endpoint. To go back to Netlify entirely, restore the DNS
record — keep the Netlify site for one week after the cutover.
