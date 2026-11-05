# Website publish (Coolify)

The website is the same Expo app exported for web, served from one container
that Coolify builds from this repo. That container also runs the public API
(`/api/credentials`, `/api/jobs`), so there is no separate function platform
and no second deploy target.

```
git push → Coolify builds Dockerfile → container serves dist/ + /api/*
                                          │
                                          └── Postgres (DATABASE_URL)
```

The concrete target is the InterServer VPS (`162.35.183.161`), where nginx
stays on 80/443 and Coolify only builds and runs the container:
[deploy/vps-coolify.md](../deploy/vps-coolify.md) +
[deploy/nginx-bolingo-web.conf](../deploy/nginx-bolingo-web.conf).

## What replaced what

| Before (Netlify) | Now (Coolify) |
| --- | --- |
| `netlify.toml` build + publish | `Dockerfile` (`npm ci` → `expo export --platform web` → `publish-wireframes.cjs`) |
| `[[redirects]] /* → /index.html` | SPA fallback inside `server/index.mjs` (200, not a redirect) |
| `[[headers]]` cache rules | `cacheFor()` in `server/index.mjs` |
| `netlify/functions/*.mts` | `server/api/credentials.mjs`, `server/api/jobs.mjs` |
| Netlify Database (`drizzle-orm/netlify-db`) | Postgres via `DATABASE_URL` + `pg` (`server/lib/db.mjs`) |
| Netlify migrations folder | `db/migrations/*.sql`, applied by `node server/migrate.mjs` |

## First-time setup (owner)

1. **Postgres resource:** in the Coolify project, add a *Postgres* database.
   Coolify publishes an internal `postgres://…` URL — copy it, that is
   `DATABASE_URL`.
2. **Application:** *New resource → Application → Git repository*, branch
   `main`, build pack **Dockerfile**, port **3000**.
3. **Environment variables** (Application → Environment):

   | Name | Kind | Notes |
   | --- | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | **Build** | compiled into the web bundle |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Build** | compiled into the web bundle |
   | `EXPO_PUBLIC_SITE_URL` | **Build** | `https://bolingo.co.ke`, used for share links |
   | `DATABASE_URL` | Runtime | the Postgres URL from step 1 |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Runtime | optional; fall back to the `EXPO_PUBLIC_*` values for token checks |
   | `DATABASE_SSL` | Runtime | only if your Postgres needs TLS: `require` |
   | `MIGRATE_ON_START` | Runtime | `1` to apply migrations on boot (fine with one replica) |

   Anything `EXPO_PUBLIC_*` **must** be marked as a build variable: Expo bakes
   those values into the JS at export time, so a runtime-only change never
   reaches the browser without a rebuild.
4. **Migrations:** run once from the container terminal
   (`node server/migrate.mjs`), or set `MIGRATE_ON_START=1` and redeploy.
   Coolify's post-deployment command field works too.
5. **Domain:** Application → Domains → add `bolingo.co.ke`, enable HTTPS
   (Let's Encrypt is automatic in Coolify), and keep port 3000 as the target.
6. **AdMob console → Settings → app-ads.txt:** add the same domain, then
   replace the placeholder publisher id in `public/app-ads.txt`
   (`pub-0000000000000000`) with the real Publisher ID (AdMob console →
   Settings → Account information) and push. Coolify redeploys and
   `/app-ads.txt` is served within a minute.
7. **Retire Netlify:** point DNS at the Coolify server *after* the domain
   resolves there, then delete the Netlify site. Keep AdMob's app-ads.txt
   domain unchanged — it is the domain, not the host.

## Every release after that

Push to `main` → Coolify rebuilds the image and swaps the container. Coolify
keeps the previous image, so *Deployments → Redeploy* on an older build is the
rollback. Preview environments are an optional extra: duplicate the resource on
a branch and Coolify gives it its own URL.

## Why the server does what Netlify did

- **SPA fallback:** Expo Router is a single-page app. A path without a file
  extension that is not a real asset serves `index.html` with a 200, so
  `/paywall`, `/verify/ABC-123-456` and every shared lesson link work on a cold
  load instead of 404ing.
- **Directory indexes:** `/wireframes` (no trailing slash) resolves to
  `dist/wireframes/index.html`, which is why the board keeps its
  `<base href="/wireframes/">`.
- **Cache headers:** fingerprinted `_expo/static/*` bundles cache for a year;
  HTML is `max-age=0, must-revalidate`, so a deploy can never pin learners to a
  stale build.
- **`public/app-ads.txt`:** Expo copies `public/` to the `dist` root verbatim,
  so the crawler finds it at `/app-ads.txt`. Until the placeholder pub id is
  replaced, authorized-seller verification fails closed.
- **`/api/health`:** returns 200 with `{"db":"up"}` when Postgres answers, and
  503 when it does not. The Docker `HEALTHCHECK` and Coolify both read it.

Only `GET`/`HEAD` are served as files; every API body is capped at 256 KB and
every credential issue re-checks the learner's own Supabase completions — the
client is never trusted to claim a certification.

## Wireframe board at /wireframes/

The adaptive life-stage wireframes (`design/wireframes-v3-adaptive`) are
published at **https://bolingo.co.ke/wireframes/**. After the Expo export the
Docker build runs `node scripts/publish-wireframes.cjs`. It copies the board
into `dist/wireframes/` and its Bingo art into `dist/wireframes-v2/assets/`, and
adds `<base href="/wireframes/">` so `/wireframes` without the trailing slash
still loads its styles. Edit the board in `design/` only; the copy is rebuilt
on every deploy. It is a design document, not part of the app.

## Local check before pushing

```bash
npm run build:web        # expo export + wireframes → dist/
node server/index.mjs    # http://localhost:3000, API included
node server/migrate.mjs  # needs DATABASE_URL
node scripts/check-web-publish.cjs   # also inside npm test / npm run gate
```

Without `DATABASE_URL` the site still serves and `/api/health` reports
`{"db":"unconfigured"}`; only the credential and job endpoints fail.
