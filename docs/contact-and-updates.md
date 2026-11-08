# Contact, feedback and automatic updates

## Contact surfaces

| Where | What it shows |
| --- | --- |
| `bolingo.co.ke/contact` (also `/contact` in the app) | Support email, both phone numbers, and the feedback form |
| In-app: Settings → **Contact & feedback** | Same screen, inside the app |
| Footer of `/install` and `/privacy` | `support@bolingo.co.ke` |

Shared values live in one module — [lib/support.ts](../lib/support.ts) — so the
screen, the server and the docs cannot drift:

| Constant | Value | Purpose |
| --- | --- | --- |
| `SUPPORT_EMAIL` | `support@bolingo.co.ke` | Public address learners write to |
| `SUPPORT_PHONES` | `+254 711 617 407` (support, calls/WhatsApp), `0735 336 030` (admin, calls) | Tappable `tel:` links |
| `FEEDBACK_INBOX` | `bolingolearn@pm.me` | Where the support team actually receives feedback |

## How a message travels

```
app / web form → POST /api/feedback → Postgres `feedback` row → owner email
                                      (stored first)          (best effort)
```

`server/api/feedback.mjs` validates (10+ character message, reply-to email,
optional phone), inserts the row, then calls
`server/lib/mailer.mjs`. The mailer is provider-neutral and deliberately
optional:

1. `NOTIFY_EMAIL_WEBHOOK_URL` (+ optional `NOTIFY_EMAIL_WEBHOOK_TOKEN`) — any
   relay accepting `{ to, subject, text, kind }`.
2. `RESEND_API_KEY` (+ `NOTIFY_EMAIL_FROM`) — the Resend reference adapter.
3. Neither set → the row is kept and `delivery` records `stored`.

The API answers `{ ok, id, delivery }` and the screen says "saved for the
support team" rather than "sent" when `delivery` is `stored`. A learner is never
told a message was delivered when it was only queued.

**Database:** `db/migrations/0001_feedback.sql` creates the table. It is applied
on boot when `MIGRATE_ON_START=1` (already set in the Coolify app and in
`deploy/docker-compose.yml`), or by hand with `node server/migrate.mjs`.

**Privacy:** the table holds what the learner typed (name/email/phone are
optional). It is server-side only, never exposed by an API, and the response
does not echo the message back. Say plainly in any future privacy update that
feedback is stored to answer it.

## Automatic updates on every change

[.github/workflows/release.yml](../.github/workflows/release.yml) runs on every
push to `main` / `coolify-hosting` and on demand:

| Job | What it does | Secret it needs |
| --- | --- | --- |
| `web` | Calls the Coolify deploy webhook → the site container rebuilds and swaps | `COOLIFY_DEPLOY_WEBHOOK` |
| `app` | `eas update --branch production --environment production --platform all` → installed apps fetch the new JS on next launch | `EXPO_TOKEN` |

Both fail soft: without the secret the job prints a notice and succeeds, so the
repo stays green before the infrastructure exists.

Three pieces of the existing app make this work without extra code:

- `app.config.js` declares `runtimeVersion: { policy: 'appVersion' }`, so an
  update only reaches builds compiled for the same app version.
- `src/app/_layout.tsx` already checks `Updates.checkForUpdateAsync()` on launch
  outside dev and reloads when an update is available.
- every build profile except `development` carries a channel; the `apk` profile
  (direct download) uses `production`, so a website-installed APK receives the
  same OTA updates as a store build.

### What still needs a rebuild, not an update

OTA ships JavaScript and assets only. A new native module, a permission string,
an icon/splash change, a new SDK or a version bump (`runtimeVersion` follows
`app.version`) needs a fresh binary:

```bash
npx eas-cli build -p android --profile apk
node scripts/publish-android-apk.cjs <apk> --upload   # refreshes /install
git add public/downloads/latest.json && git commit -m "Publish Android build" && git push
```

`/download/android` reads that metadata, so the download link and the checksum
on `/install` update with the deploy — no page edit, no stale link.

### How a sideloaded app hears about the rebuild

No store is watching this app, so the app asks the website itself. The dashboard
runs `checkAppUpdate()` once per session (`lib/appUpdate.ts`): it fetches
`/downloads/latest.json`, compares the record's `version` against the version
baked into the binary, and raises the update card
(`components/dashboard/UpdateCard.tsx`) only when the host is serving something
newer. **Update now** opens `https://bolingo.co.ke/download/android` — Android
will not let an app install an APK over itself, so the browser finishes the job.
Settings carries the same check on demand under *App update*, so turning a
release down lasts the session and never silences a learner for good.

The decision itself is pure data in `lib/releaseManifest.ts`: numeric version
comparison (so `1.10.0` beats `1.9.0`), plus the reasons to stay quiet —
`not-newer`, `unknown-version`, `wrong-package`, `dismissed`, `unreachable`,
`not-installable`. `npm run check:web-publish` exercises that rule against the
committed `public/downloads/latest.json`, so the in-app prompt, the install page
and the published binary cannot drift apart. Android alone is offered the build
(there is no iOS sideload, and the web app is the server's own copy), and a failed
request shows nothing at all — the record is served `no-store`, so the next check
after a publish sees it.

### Verifying a release landed

```bash
curl -s https://bolingo.co.ke/contact | grep -c 'support@bolingo.co.ke'   # page is live
curl -s https://bolingo.co.ke/downloads/latest.json | head -c 120          # what installed apps compare against
curl -s -w ' [%{http_code}]\n' -X POST https://bolingo.co.ke/api/feedback \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","message":"release smoke test"}'        # 201
```

The first confirms the deploy; the second confirms the database, the migration
and the endpoint together. Send a real answerable message only when you intend
the owner inbox to receive it.
