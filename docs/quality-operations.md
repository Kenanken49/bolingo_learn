# Quality operations

The platform's release bar, live health signal and AI engineer in one place.
Owner console: **Settings → Quality & Operations** (server-enforced admin only).

## Blueprint → implementation

| Blueprint strategy | What ships | Where |
| --- | --- | --- |
| Automated CI/CD blocks | One gate runner, required GitHub check, published run | `content/quality/gates.json`, `scripts/run-quality-gates.cjs`, `.github/workflows/quality-gate.yml` |
| AI text-to-test drivers | The engineer turns live failures into findings, regression proposals and approval items; every manual fix must add a gate | `supabase/functions/_shared/engineerAgent.ts` |
| Telemetry & health signals | Anonymous, offline-first events; crash-free %, p95 latency, funnel, MRR, content inventory | `lib/telemetry.ts`, `supabase/migrations_quality_ops.sql`, `lib/qualityOps.ts` |
| Rigorous A/B framework | Deterministic sticky flags, exposure/conversion views, guardrail pauses | `lib/featureFlags.ts`, `lib/qualityMath.ts`, `v_experiment_results` |
| Premium admin dashboard | Owner-only console with Overview, Quality, Growth and Engineer tabs | `src/app/admin.tsx`, Settings entry |
| Engineer super-agent | Kito monitors, diagnoses, proposes, records approvals and emails | `engineer-agent`, `review-approval`, `notification_outbox` |

## Setup runbook

### 1. Install the schema

Run [`supabase/migrations_quality_ops.sql`](../supabase/migrations_quality_ops.sql)
in the Supabase SQL editor (or `supabase db push`) **after** `schema.sql`.
It creates the RLS-protected tables, seeds the flag catalog, installs the
`claim_founder_admin()` function and the `is_admin` guard trigger.

Security notes:

- `is_admin` cannot be self-assigned through the normal profile update path:
  `guard_profile_admin_flag` rejects any change that did not come from the
  owner claim, an existing admin, or the service role.
- `telemetry_events` is insert-only for clients and only the caller's own
  `user_id` is accepted. Only admins can read it; anon reads are never granted.
- `quality_runs`, reports, approvals and the notification outbox are
  admin-readable; writers use the service role.

### 2. Deploy the functions

```bash
supabase functions deploy engineer-agent
supabase functions deploy review-approval
```

They use the LLM secrets already configured for Ask Bingo / Explain
(`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, optional fallback). If the model
is unavailable, the agent still closes an audit with a rules-based report.

### 3. Set secrets

Set these as Supabase Edge Function secrets, never with an `EXPO_PUBLIC_`
prefix and never in the app bundle:

```bash
# Any HTTPS relay that accepts { to, subject, text, html, kind }.
supabase secrets set NOTIFY_EMAIL_WEBHOOK_URL=https://your-relay.example/hook
supabase secrets set NOTIFY_EMAIL_WEBHOOK_TOKEN=...          # optional bearer
# OR the reference Resend adapter:
supabase secrets set RESEND_API_KEY=...
supabase secrets set NOTIFY_EMAIL_FROM="Bolingo Learn <alerts@your-domain>"
# Fixed owner inbox (defaults to bolingolearn@pm.me):
supabase secrets set NOTIFY_EMAIL_TO=bolingolearn@pm.me
# Scoped secret for the scheduled GitHub workflow:
supabase secrets set ENGINEER_CRON_SECRET=<long-random-value>
```

The catalog used for service selection had no raw transactional sender, so the
integration is deliberately provider-neutral: the webhook is the primary path,
and Resend is included as one reference adapter. With neither configured,
notifications are recorded as `skipped` in the outbox and the approval still
appears in the console. The owner console also allows changing
`quality_settings.notify_email`, but it always defaults to the owner address.

### 4. Claim owner access

Sign in with the confirmed `bolingolearn@pm.me` account, open
**Settings → Quality & Operations**. The screen calls `claim_founder_admin()`;
the function checks the authoritative `auth.users` row (matching confirmed
email), not a client body or an unverified profile field. Any other account
sees "Owner access only". The Settings row appears for premium/admin accounts;
a signed-in owner can also open `/admin` directly to claim ownership first.

### 5. Publish a run

```bash
npm run gate                 # every required gate, local report in .quality/
npm run gate -- --publish    # also publish to the owner dashboard
```

For publishing, set `QUALITY_SUPABASE_URL` and
`QUALITY_SUPABASE_SERVICE_ROLE_KEY` in the shell. In GitHub, add the same two
as repository secrets; the workflow publishes only when they exist.

### 6. Schedule the engineer

`.github/workflows/engineer-audit.yml` runs every six hours and calls the
function with `x-engineer-cron-secret`. Add `SUPABASE_URL` and
`ENGINEER_CRON_SECRET` as GitHub secrets to enable it. The console's **Run
audit** button is the manual path.

## The release bar

`content/quality/gates.json` is the single source for:

- the app (gate catalog in the console),
- `scripts/run-quality-gates.cjs`,
- `.github/workflows/quality-gate.yml`.

A gate is a real command with a timeout. Required failures exit non-zero and
block the workflow. Each run writes:

- `.quality/last-run.json` — machine-readable, includes command output tails;
- `.quality/last-run.md` — reviewable summary.

The runner is deliberately boring: sequential child processes, no hidden
retries, no `continue-on-error`. Adding a gate is a JSON edit plus the script.
The workflow publishes to `quality_runs`; the console reads the newest row and
sorts failed gates first.

**Branch protection:** mark the `Required checks` job as a required status check
for `main`. The workflow alone is advice until branch protection enforces it.

**Hands-on engines.** Four required gates cover the runnable content, so a
regression in an exercise is caught before a learner meets it:

| Gate | Command | What it proves |
| --- | --- | --- |
| `labex` | `npm run check:labex` | Every imported lab lesson is well-formed, licensed and solvable as written. |
| `sandbox-labs` | `npm run check:sandbox` | Each generated JS exercise executes in `node:vm` with harness-identical semantics: the reference passes every test, the starter fails at least one, assertions are non-trivial and offline. CSS/HTML fixtures stay script- and network-free and every DOM/CSSOM test has a pattern that matches the reference and not the starter. |
| `vm-labs` | `npm run check:vm` | The offline Git shell resolves every task and reference solution for each terminal lab. |
| `guided-labs` | `npm run check:guided` | Labs with no on-device runtime still ship a complete step-by-step walkthrough. |

## Telemetry & privacy

Events are anonymous by default: a per-install audience id (or the Supabase
user id when signed in), a per-launch session id, the event name, scrubbed
properties, app version and platform.

The closed event vocabulary currently includes:

- `session_start`, `screen_view`, `error`
- `lesson_started`, `lesson_completed`, `quiz_submitted`
- `terminal_command`, `terminal_tasks_progress`, `terminal_check`,
  `terminal_lab_completed`
- `code_sandbox_result`, `code_sandbox_timeout`
- `paywall_viewed`, `premium_checkout_started`, `premium_activated`,
  `premium_purchase_failed`
- `experiment_exposed`, `experiment_converted`
- `admin_console_opened`

`terminal_command` carries the command verb and an ok flag only — arguments can
name paths and file contents the learner typed, so they never enter the queue.
`code_sandbox_result` reports language, pass counts and run time, never the code.

`sanitizeTelemetryProps()` in `lib/qualityMath.ts` drops sensitive keys
(email, phone, password, token, secret, API key, username, full name, prompt,
answer, transcript, free text, question, response, address), redacts emails,
long digit strings and URLs, truncates strings to 240 characters, bounds depth
and array size, and drops non-finite numbers. `captureError()` strips URLs
(which can carry signed tokens) before an error message enters the queue.

Learners can turn **Anonymous diagnostics** off in Settings. Turning it off
clears the local queue immediately and stops uploads. The database retention
function defaults to 90 days and can be scheduled with pg_cron:

```sql
select cron.schedule(
  'bolingo-prune-telemetry',
  '0 3 * * *',
  $$select public.prune_telemetry()$$
);
```

Crash-free sessions count only sessions with a fatal error event; handled
errors still surface in the error-cluster list without tanking the reliability
metric. Telemetry is observational, never used for billing, grading or security
decisions. A malicious client can inflate its own event stream, which is why
the console labels it as signal, not truth.

## Feature flags & experiments

The catalog lives in `content/quality/flags.json` and is seeded into
`feature_flags`. Remote rows can change `enabled`, `rollout_pct` and
`variants` without a release; the client caches them for five minutes and
falls back to the bundled catalog offline.

Rules:

- **Sticky assignment.** `bucketFor()` is FNV-1a of `flag:audience`; no
  `Math.random`, no time, no insertion-order dependence.
- **Exposure only when exposed.** A learner outside the rollout sees the
  control variant but is not counted. This prevents a denominator polluted by
  people who never entered the experiment.
- **One metric per experiment.** `paywall_value_badge` measures
  `premium_checkout_started` and has the guardrail `premium_purchase_failed`.
- **Read results, not vibes.** `v_experiment_results` shows exposures,
  conversions and conversion percentage per variant. The dashboard shows the
  same view; it never invents lift.

The live experiment is the paywall value badge: control sees the existing plan
card, `value_badge` also sees a factual four-outcome line. Exposure is logged
once per session by `useExperiment`; a checkout tap records both
`premium_checkout_started` and `experiment_converted`.

## Owner console

- **Overview** — deterministic health score, crash-free %, p95, active
  learners, lesson completions, release status, platform ledger (learners,
  premium, estimated MRR, course inventory), engineer summary, email status.
- **Quality** — newest published run, commit/branch/time, per-gate status and
  captured output, the exact commands to reproduce locally.
- **Growth** — live flags with enable/rollout controls, experiment results,
  and the lesson-start → completion funnel.
- **Engineer** — Kito's latest report, findings with evidence and proposed
  changes, pending approvals (Approve/Reject), recent decisions, notification
  history, and threshold controls.

All reads are RLS-scoped. The console never receives another learner's profile
row; it receives aggregates from `quality_overview()` and admin-only rows.

## The engineer role (Kito)

Kito is a staff engineer + learning-quality auditor. Its operating rubric:

1. Evidence only; every finding cites a metric, gate or error cluster.
2. If the snapshot is thin, propose instrumentation instead of guessing.
3. Learning science: retrieval, spacing, interleaving, worked examples,
   mastery gates, specific feedback, cognitive load, accessibility, motivation.
4. Engineering: required gates, crash-free, p95, error clusters, experiment
   integrity, checkout conversion and refund risk.
5. Autonomy is limited to reversible configuration:
   `flag_rollout`, `flag_enabled`, `quality_setting`. Source changes remain
   proposals for a human and must ship through CI.
6. Rejected proposals are remembered; do not resubmit without new evidence.
7. Critical/high findings need approval.

**Deterministic score.** `computePlatformHealth()` starts at 100 and subtracts
for crash-free (fatal-error-free) sessions below 99 / 97 / 95, p95 above
2.5s / 4s, a failed or missing gate, and a large approval backlog. The model
explains the score; it cannot change it.

**Fallback.** If the local model or hosted fallback is unavailable, the agent
writes a rules-based report from the same snapshot (`via: "rules"`), so the
dashboard and email never go dark.

**Guardrails.** When `engineer_auto_guardrails` is on and at least
`min_sessions_for_guardrail` sessions exist, a crash-free or p95 breach pauses
active experiments (the flag remains defined, `enabled` is set false) and
records an `auto_applied` approval. Thresholds are editable in the console and
default to 99% crash-free and 2,500 ms p95.

**Approvals.** High/critical findings become pending approvals. Approving one:

- applies an allowlisted configuration action immediately and records
  `apply_result`;
- or marks a code/content proposal as approved for a human to implement and
  deploy through CI.

Every decision is audited with the owner id and emailed.

## Email approvals

`sendOwnerEmail()` writes the outbox row first, then attempts delivery. The
console shows `sent`, `failed`, `skipped` and the sanitized provider error.
Approval emails are sent when approvals are waiting or the platform is
critical; routine healthy audits stay on the dashboard to avoid inbox noise.
The recipient defaults to **bolingolearn@pm.me**.

## Incident runbook

1. **Red gate on main** — open Quality, tap the failed gate, reproduce with
   `npm run gate -- --only=<id>`, fix the cause, push a green run. Do not
   bypass branch protection.
2. **Crash-free below floor** — check the top error cluster in the latest
   report, ship the smallest guard/fallback, keep experiments paused until the
   floor recovers, then re-enable one at a time.
3. **p95 above ceiling** — reproduce on the low-end benchmark route, profile
   the slow interaction, defer non-critical work off the path, re-check the
   console after one release window.
4. **Email skipped/failed** — verify the provider secrets, then use the
   console's Run audit; approvals remain available in-app regardless.
5. **No telemetry** — confirm the migration ran, the app build has
   diagnostics on, and `session_start` rows arrive. The agent reports this as
   its top finding until fixed.
6. **Owner locked out** — confirm the signed-in JWT email is the verified
   owner address; the claim function intentionally refuses all others.

## Acceptance checklist

- [ ] `quality_runs` receives a row from CI with every required gate.
- [ ] `session_start`, `lesson_started`, `lesson_completed`, `quiz_submitted`
      and `error` arrive from a real device.
- [ ] The opt-out toggle clears the queue and stops uploads.
- [ ] The console shows the latest run, funnel, flags and experiment results.
- [ ] `claim_founder_admin()` succeeds only for the owner account.
- [ ] A second account gets "Owner access required" and no data.
- [ ] An audit produces a report and at least one approval when a floor is
      crossed; the email reaches bolingolearn@pm.me or is marked skipped.
- [ ] Approving an allowlisted action changes the flag/setting, records the
      result and emails the decision.
- [ ] A rejected proposal is remembered in the next audit context.

## Known limits

- The console cannot run shell commands on the phone. Local checks are run by
  `npm run gate`; the dashboard shows the published result.
- The agent cannot edit source from production. Code fixes are proposals plus
  a required regression gate, not unreviewed deploys.
- The catalog exposed no raw email sender, so delivery requires a webhook relay
  or the Resend adapter. Until then, the in-app approval queue is the source of
  truth.
- The free self-hosted model is a 1.5B-class model; the deterministic health
  score and rules fallback are what keep the audit trustworthy when its prose
  is approximate.
