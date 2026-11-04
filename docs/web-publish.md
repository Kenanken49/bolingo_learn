# Website publish (Netlify)

The website is the same Expo app exported for web. Netlify builds it from
this repo on every push — no local export, no manual upload.

## First-time setup (owner, ~10 minutes)

1. Sign up at Netlify (GitHub login is fastest) → **Add new site → Import an
   existing project** → connect the GitHub repo.
2. Build settings are read from `netlify.toml` automatically:
   build `npx expo export --platform web`, publish `dist`. Just confirm and
   **Deploy**.
3. **Domain:** Site settings → Domain management → add the custom domain
   (the Play listing and AdMob both want the real domain, not the
   `*.netlify.app` one). Point DNS at Netlify and wait for the TLS
   certificate (automatic).
4. **AdMob console → Settings → app-ads.txt:** add the same domain, then
   replace the placeholder publisher id in `public/app-ads.txt`
   (`pub-0000000000000000`) with the real Publisher ID
   (AdMob console → Settings → Account information) and push — Netlify
   redeploys and serves it at `/app-ads.txt` within minutes.

## Every release after that

Push to the connected branch → Netlify rebuilds and publishes `dist`.
Branch pushes get Deploy Preview URLs for free — use them for store-review
screenshots instead of touching production.

## Why this file and that redirect exist

- `[[redirects]] /* → /index.html (200)`: Expo Router is a single-page app.
  Without it, `/paywall` or any shared lesson link 404s on a cold load.
- `public/app-ads.txt`: Expo copies `public/` to the `dist` root verbatim,
  so the crawler finds it at `/app-ads.txt`. Until the placeholder pub id is
  replaced, authorized-seller verification fails closed — the site works, but
  link the domain before applying for anything that checks it.
- Cache headers: fingerprinted `_expo/static/*` bundles cache for a year;
  HTML never caches, so an update can never pin learners to a stale build.

## Wireframe board at /wireframes/

The adaptive life-stage wireframes (`design/wireframes-v3-adaptive`) are
published at **https://bolingo.co.ke/wireframes/**. After the Expo export, the
Netlify build runs `node scripts/publish-wireframes.cjs`. It copies the board
into `dist/wireframes/` and its Bingo art into `dist/wireframes-v2/assets/`, and
adds `<base href="/wireframes/">` so `/wireframes` without the trailing slash
still loads its styles. Edit the board in `design/` only; the copy is rebuilt
on every deploy. It is a design document, not part of the app.

## Checks

```bash
node scripts/check-web-publish.cjs   # also inside npm test / npm run gate
```
