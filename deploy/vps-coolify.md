# Deploying Bolingo on Coolify (InterServer VPS)

Two paid boxes, two jobs. Only the second one hosts the website.

| Host | What runs on it | Edge | Role |
| --- | --- | --- | --- |
| `162.35.183.161` = `vps3753677` | nginx, Ollama, the `/llm-<token>/` tutor path, the old static export in `/var/www/bolingo` | **nginx** on 80/443 | legacy; must keep serving the tutor endpoint the Supabase edge functions call |
| `162.35.183.135` = `vps3753817` | Coolify 4.6, its Postgres, the app container | **Coolify's Traefik** on 80/443 with Let's Encrypt | the website |

```
browser ──► Traefik :443 (Let's Encrypt, bolingo.co.ke)
              └──► Bolingo container :3000   (dist/ + /api/*)
                     └──► Postgres (internal postgres:// URL)

Supabase edge fn ──► 162.35.183.161/llm-<token>/ ──► Ollama   (untouched by the website)
```

## 0. Access

`.135` only accepts SSH from `.161`, so hop through it:

```bash
ssh -J root@162.35.183.161 root@162.35.183.135
```

**ufw is active with `INPUT DROP`** on `.135`. Coolify reaches its own host as
`host.docker.internal:22`, so the docker subnets must be allowed or the server
never validates and `StartProxy` fails forever:

```bash
for sn in 10.0.0.0/24 10.0.1.0/24 10.0.2.0/24; do
  ufw allow from "$sn" to any port 22 proto tcp comment 'coolify ssh from docker'
done
ufw allow 80/tcp && ufw allow 443/tcp
ufw reload
```

## 1. Install Coolify

```bash
# free the port first: the stock nginx holds :80
systemctl disable --now nginx
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

The dashboard answers on `http://162.35.183.135:8000`. Create the root account
within **10 minutes** of install; if the window lapses, `docker restart coolify`
resets it. Then, in the UI: **Keys & Tokens → API tokens** (the API is disabled
until it is switched on in instance settings).

The Traefik proxy only starts once the `localhost` server validates — after the
ufw rules above, restart Coolify and confirm both `coolify-proxy` and
`coolify-sentinel` are healthy and 80/443 are listening.

## 2. The stack

| Piece | Value |
| --- | --- |
| Project | `bolingo` |
| Database | Postgres resource `bolingo-db`; use its **internal** `postgres://…` URL |
| Application | `bolingo-web`, public repo `Kenanken49/bolingo_learn`, branch `coolify-hosting` |
| Build pack | **Dockerfile** (repo root), exposed port **3000** |
| Domain | `https://bolingo.co.ke` (Coolify issues the certificate) |

## 3. Environment

`EXPO_PUBLIC_*` values are compiled into the JS by `expo export`, so they must be
marked **build** variables — a runtime-only value never reaches the browser.

| Name | Kind | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | **build** | arrived as a Docker build arg |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **build** | ditto |
| `EXPO_PUBLIC_SITE_URL` | **build** | `https://bolingo.co.ke`, used for share links |
| `DATABASE_URL` | runtime | the Postgres internal URL from step 2 |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | runtime | optional; fall back to the `EXPO_PUBLIC_*` values |
| `DATABASE_SSL` | runtime | only if that Postgres requires TLS |
| `MIGRATE_ON_START` | runtime | `1` with a single replica |

The `Dockerfile` declares matching `ARG`s (`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SITE_URL`) and installs with
`npm ci --ignore-scripts --legacy-peer-deps`. Both details are load-bearing:

- the pinned `drizzle-orm`/`drizzle-kit` versions keep `npm ci` in sync (the
  `^1.0.0-beta.22` range resolved to `1.0.0-rc.5` and broke the install);
- npm 10 in the image auto-installs peers demanded by `@prisma/composer`'s
  bundled `alchemy`, which `--legacy-peer-deps` skips.

## 4. Migrations

`MIGRATE_ON_START=1` makes the server apply `db/migrations/*.sql` before it
listens. A good deploy logs:

```
Migrations: applied 0000_credentials_and_jobs.sql
Bolingo web listening on http://0.0.0.0:3000 (serving /app/dist)
```

Tables: `credentials`, `job_listings`, `schema_migrations`. To run it by hand:
`node server/migrate.mjs` inside the container terminal.

## 5. DNS cutover (the last step, owner only)

`bolingo.co.ke` still resolves to Netlify (`35.157.26.135`, `63.176.8.218`) and
Netlify answers **503 `usage_exceeded`**. After the Coolify container is healthy:

1. Point the `bolingo.co.ke` A records at `162.35.183.135` (lower the TTL first).
2. Traefik issues the Let's Encrypt certificate on the first HTTPS request.
3. Verify from outside on the real domain: `/`, a deep link
   (`/verify/ABC-123-456`), `/api/health`, `/app-ads.txt`, `/wireframes/`.
4. Check Ask Bingo in the app — it calls the tutor on `.161`, which this
   migration never touches.
5. Delete the Netlify site only after a few clean days.

## 6. Rollback

Coolify keeps previous images: **Application → Deployments → Redeploy** on the
last good build. To leave Coolify entirely, restore the DNS record — keep the
Netlify site for a week after the cutover.

## Legacy layout (nginx in front)

If the app ever has to run on `162.35.183.161` instead, keep Coolify off ports
80/443, publish the container on `127.0.0.1:3000` and include
[nginx-bolingo-web.conf](./nginx-bolingo-web.conf) inside the
`server_name bolingo.co.ke;` block. nginx picks the longest prefix, so the
existing `location /llm-<token>/` keeps winning.
