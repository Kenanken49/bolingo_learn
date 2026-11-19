#!/usr/bin/env node
/**
 * scripts/mpesa-golive.cjs
 *
 * Why: going live on Daraja is a configuration step, and every way it goes
 * wrong costs money twice. A production key pair left pointing at the sandbox
 * endpoint fails closed (annoying). A sandbox paybill number pointed at the
 * production endpoint, or a callback URL whose `?t=` token no longer matches
 * MPESA_CALLBACK_TOKEN, does not fail: the learner is prompted on their phone,
 * types a real PIN, pays real shillings, and gets nothing, because the callback
 * that would have granted premium was rejected. Nobody sees that except the
 * learner, and the learner tells people.
 *
 * What: reads the Daraja/M-Pesa variables for one environment, runs the same
 * `audit()` the deployed Edge Function runs before it will send a push, and
 * prints findings as variable names only. It cannot print a secret value even
 * if it wanted to — every reporting path goes through a mask. Then, with
 * `--apply`, it writes the variable names the Edge Function actually reads,
 * mapped from whatever spelling the file used, and deploys both functions.
 *
 * Contract:
 *   node scripts/mpesa-golive.cjs                        # audit the process env
 *   node scripts/mpesa-golive.cjs --from <file>          # audit a secrets file
 *   node scripts/mpesa-golive.cjs --from <file> --json   # machine-readable
 *   node scripts/mpesa-golive.cjs --from <file> --preflight  # token + callback probe
 *   node scripts/mpesa-golive.cjs --from <file> --apply  # + push and deploy
 *
 *   --from <file>       dotenv-style or Daraja-dashboard-label file holding the
 *                       Daraja and M-Pesa values. It accepts `KEY=value`,
 *                       `KEY: value`, `export KEY=value`, and the dashboard's
 *                       `Consumer Key:...`, `Consumer Secret:...`,
 *                       `Passkey:...`, `Short Code:...` labels. Keep it outside
 *                       the repo, or git-ignore it: a file that is tracked is
 *                       refused outright. Its values are never read into this
 *                       console, a log line or a committed file, and the file's
 *                       own labels are mapped to the canonical names below —
 *                       that is what `--apply` uploads, not the file as written.
 *   --env <name>        sandbox | production. Overrides MPESA_ENV for the audit
 *                       and is written as a plain (non-secret) secret on --apply.
 *   --project-ref <ref> Supabase project to write to. Defaults to the ref in
 *                       EXPO_PUBLIC_SUPABASE_URL, which is public by design.
 *   --preflight         Non-charging readiness check: obtains a Daraja OAuth
 *                       token (validates the consumer key/secret), checks the
 *                       shortcode shape and passkey presence, and posts a
 *                       synthetic callback with an impossible CheckoutRequestID
 *                       to prove the deployed callback accepts the configured
 *                       token. It never calls STK Push and never asks anyone to
 *                       pay. Shortcode ownership and passkey correctness cannot
 *                       be proven without a real push; the report says so.
 *   --apply             write the resolved variables with `supabase secrets set
 *                       --env-file` and run `supabase functions deploy` for both
 *                       functions. The file the CLI reads is a short-lived 0600
 *                       temp file this script builds, never your own file: the
 *                       CLI stores what it finds verbatim, so a `Consumer Key:`
 *                       label would land as a secret named `Consumer_Key` while
 *                       the function went on reading the old
 *                       `DARAJA_CONSUMER_KEY` — a green audit with stale sandbox
 *                       credentials still on the server. `DARAJA_BASE_URL` and
 *                       `MPESA_ENV` are written from what the audit resolved,
 *                       and every variable this run cannot supply is named
 *                       loudly instead of silently left at its old value.
 *                       Without --apply nothing leaves the machine and the
 *                       script only reports.
 *   --skip-deploy       with --apply: write the secrets, do not deploy.
 *   --force             with --apply: proceed even when the audit has problems.
 *   --json              one JSON report on stdout, for `npm run gate` glue.
 *   --verbose           also report the length of each secret (names + lengths,
 *                       never values).
 *
 * Exit: 0 ready, 2 not ready (problems found / apply refused), 1 usage or
 * command failure. Prints `SUMMARY environment= ready= problems= warnings=`
 * last so a caller can read the verdict without parsing prose. With
 * --preflight the last line is `PREFLIGHT environment= passed= auditProblems=`.
 *
 * Used by: docs/paywall-setup.md §6 (the go-live runbook), README "Paying with
 * M-Pesa", and the `mpesa` gate, which runs this script against two throwaway
 * fixture files to prove the masking and the rules hold offline.
 */

'use strict';

/* global __dirname, require, module, process, console */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SHARED = path.join(ROOT, 'supabase', 'functions', '_shared', 'mpesa.ts');

/** The names this script understands. Anything else in the file is ignored. */
const MANAGED = [
  'MPESA_ENV',
  'DARAJA_BASE_URL',
  'DARAJA_CONSUMER_KEY',
  'DARAJA_CONSUMER_SECRET',
  'DARAJA_SHORTCODE',
  'DARAJA_PASSKEY',
  'MPESA_CALLBACK_URL',
  'MPESA_CALLBACK_TOKEN',
  'MPESA_TRANSACTION_TYPE',
  'MPESA_ACCOUNT_REFERENCE',
  'MPESA_PREMIUM_KES',
  'MPESA_PENDING_TTL_MINUTES',
];

/** Values that must never reach stdout, stderr, a log or a child-process argv. */
const SECRET_NAMES = ['DARAJA_CONSUMER_KEY', 'DARAJA_CONSUMER_SECRET', 'DARAJA_PASSKEY', 'MPESA_CALLBACK_TOKEN'];

/** The names a payment cannot happen without. When --apply cannot supply one it
 * reports it instead of writing nothing: the server keeps whatever it already
 * holds, and a value left over from another environment is the failure nobody
 * sees until a learner pays and gets nothing. */
const REQUIRED_NAMES = [
  'MPESA_ENV',
  'DARAJA_CONSUMER_KEY',
  'DARAJA_CONSUMER_SECRET',
  'DARAJA_SHORTCODE',
  'DARAJA_PASSKEY',
  'MPESA_CALLBACK_URL',
  'MPESA_CALLBACK_TOKEN',
];

const ENV_NAMES = { sandbox: 'sandbox', test: 'sandbox', production: 'production', live: 'production', prod: 'production' };

function die(message) {
  console.error(`mpesa-golive: ${message}`);
  process.exit(1);
}

// --- run the real Deno module under Node ---------------------------------

const ENV = {};
globalThis.Deno = { env: { get: (name) => (name in ENV ? ENV[name] : undefined) } };

function loadShared() {
  const source = fs.readFileSync(SHARED, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: SHARED,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length) {
    die(`_shared/mpesa.ts does not compile: ${diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join(' ')}`);
  }
  const stub = { exports: {} };
  const requireStub = (specifier) => {
    if (!String(specifier).includes('@supabase/supabase-js')) {
      throw new Error(`unexpected import in _shared/mpesa.ts: ${specifier}`);
    }
    // audit() never touches the database; a client factory that throws on use is
    // enough to keep this script honest about what it does not do.
    return { createClient: () => ({ from: () => { throw new Error('mpesa-golive must not query the ledger'); } }) };
  };
  new Function('exports', 'require', 'module', outputText)(stub.exports, requireStub, stub);
  return stub.exports;
}

const mpesa = loadShared();

// --- inputs --------------------------------------------------------------

/** Parse a dotenv-style file into a map. Values stay in memory; they are never
 * printed, and they are scrubbed out of anything a child process echoes. */
const KEY_ALIASES = {
  CONSUMER_KEY: 'DARAJA_CONSUMER_KEY',
  CONSUMERKEY: 'DARAJA_CONSUMER_KEY',
  DARAJA_CONSUMER_KEY: 'DARAJA_CONSUMER_KEY',
  CONSUMER_SECRET: 'DARAJA_CONSUMER_SECRET',
  CONSUMERSECRET: 'DARAJA_CONSUMER_SECRET',
  DARAJA_CONSUMER_SECRET: 'DARAJA_CONSUMER_SECRET',
  PASSKEY: 'DARAJA_PASSKEY',
  PASS_KEY: 'DARAJA_PASSKEY',
  LIPA_NA_MPESA_PASSKEY: 'DARAJA_PASSKEY',
  DARAJA_PASSKEY: 'DARAJA_PASSKEY',
  SHORT_CODE: 'DARAJA_SHORTCODE',
  SHORTCODE: 'DARAJA_SHORTCODE',
  BUSINESS_SHORT_CODE: 'DARAJA_SHORTCODE',
  BUSINESS_SHORTCODE: 'DARAJA_SHORTCODE',
  DARAJA_SHORTCODE: 'DARAJA_SHORTCODE',
};

function normalizeKey(raw) {
  const flat = raw
    .trim()
    .replace(/^export\s+/i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return KEY_ALIASES[flat] ?? flat;
}

/** Parse a dotenv file, a `KEY: value` file, or the label format the Daraja
 * dashboard displays. Values stay in memory; they are never printed, and they
 * are scrubbed out of anything a child process echoes. */
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^(?:export\s+)?([^:=]+?)\s*[:=]\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const key = normalizeKey(match[1]);
    if (!key) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** A tracked secrets file means the keys are in git history. Refuse the file,
 * not the run: `git check-ignore` is the only honest way to know. */
function fileIsSafeToRead(absolutePath) {
  const relative = path.relative(ROOT, absolutePath);
  const insideRepo = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  if (!insideRepo) return { ok: true, outside: true };
  const probe = spawnSync('git', ['check-ignore', '--', relative], { cwd: ROOT, encoding: 'utf8' });
  if (probe.status === 0) return { ok: true, outside: false };
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', relative], { cwd: ROOT, encoding: 'utf8' });
  if (tracked.status === 0) {
    return {
      ok: false,
      reason: `${relative} is committed to git, so any Daraja key written in it is already public. Keep the live file outside the repository (rotate the key if it was ever committed).`,
    };
  }
  return {
    ok: false,
    reason: `${relative} sits inside the repository but is not git-ignored. Move it outside (e.g. ${path.join(os.homedir(), 'mpesa-live.env')}) or add it to .gitignore before it can hold keys.`,
  };
}

function projectRefFromPublicUrl() {
  for (const file of ['.env', '.env.local']) {
    const candidate = path.join(ROOT, file);
    if (!fs.existsSync(candidate)) continue;
    const map = parseEnvFile(fs.readFileSync(candidate, 'utf8'));
    const url = map.EXPO_PUBLIC_SUPABASE_URL || map.SUPABASE_URL || '';
    const match = /^https?:\/\/([a-z0-9-]+)\.(supabase\.(co|red)|[a-z0-9.-]+)/i.exec(url);
    if (match) return match[1];
  }
  return '';
}

// --- output masking ------------------------------------------------------

let secretValues = [];

/** Collect the values we must never print, then scrub every emitted string. */
function rememberSecrets(map) {
  secretValues = SECRET_NAMES.map((name) => map[name]).filter((value) => typeof value === 'string' && value.length >= 4);
}

function scrub(text) {
  let out = String(text);
  for (const value of secretValues) out = out.split(value).join('••••••');
  return out;
}

function print(text) {
  console.log(scrub(text));
}

// --- report --------------------------------------------------------------

function describe(report, map, options) {
  const line = (value) => print(value);
  line(`Daraja environment : ${report.environment}`);
  line(`Endpoint           : ${report.baseUrl}`);
  line(`Transaction type   : ${report.transactionType}`);
  line(`Charged per month  : KSh ${report.amountKes}`);
  line('');
  line('Configuration:');
  for (const name of MANAGED) {
    const present = Boolean((map[name] ?? '').trim());
    const isSecret = SECRET_NAMES.includes(name);
    const detail = !present ? 'MISSING' : isSecret && options.verbose ? `set (${map[name].length} chars)` : 'set';
    line(`  ${name.padEnd(24)} ${detail}`);
  }
  line('');
  if (report.problems.length) {
    line(`Problems (${report.problems.length}):`);
    for (const problem of report.problems) line(`  ✗ ${problem}`);
  }
  if (report.warnings.length) {
    line(`Warnings (${report.warnings.length}):`);
    for (const warning of report.warnings) line(`  ! ${warning}`);
  }
  if (!report.problems.length) line('Ready: the audit found no blocking problem.');
  line('');
}

function summaryLine(report) {
  print(
    `SUMMARY environment=${report.environment} ready=${report.ready ? 'yes' : 'no'} problems=${report.problems.length} warnings=${report.warnings.length}`
  );
}

// --- apply ---------------------------------------------------------------

// --- what --apply writes ---------------------------------------------------

/** A quote, a backtick, a backslash or a line break inside a value is not
 * something the CLI's .env reader gives back unchanged, so uploading it would
 * store a different secret than the one the audit checked. Only names are ever
 * reported, which makes refusing on one safe. */
function unsafeValue(value) {
  return /[\r\n"'\`]/.test(value);
}

/**
 * Build the exact set of variables `--apply` uploads.
 *
 * Why this exists instead of `--env-file <your file>`: the CLI reads a file
 * literally, so the dashboard labels it holds (`Consumer Key:...`) become a
 * secret called `Consumer_Key`, and the Edge Function keeps reading the old
 * `DARAJA_CONSUMER_KEY`. The audit cannot see that, because the audit parses
 * the file through the aliases and reports ready. So the upload is rebuilt from
 * resolved values under canonical names, the endpoint and environment are
 * pinned to what the audit actually used, and any variable this run cannot
 * supply is named instead of being left quietly at its server value.
 */
function resolveUpload(values, report, fileNames) {
  const written = [];
  const absentRequired = [];
  const absentOptional = [];
  const unsafe = [];

  for (const name of MANAGED) {
    const value = (values[name] ?? '').trim();
    if (!value) {
      if (name === 'DARAJA_BASE_URL' || name === 'MPESA_ENV') {
        const resolved = name === 'DARAJA_BASE_URL' ? report.baseUrl : report.environment;
        if (resolved) {
          written.push({ name, value: resolved, source: 'derived' });
          continue;
        }
      }
      (REQUIRED_NAMES.includes(name) ? absentRequired : absentOptional).push(name);
      continue;
    }
    if (unsafeValue(value)) {
      unsafe.push(name);
      continue;
    }
    written.push({ name, value, source: fileNames.has(name) ? 'file' : 'env' });
  }

  return {
    written,
    absentRequired,
    absentOptional,
    unsafe,
    lines: written.map((entry) => `${entry.name}=${entry.value}`),
  };
}

/** The loud half: what this run leaves at whatever the server already holds. */
function uploadWarnings(upload, origin) {
  const lines = [];
  if (upload.absentRequired.length) {
    lines.push('');
    lines.push(`  !! ${upload.absentRequired.length} REQUIRED variable(s) are not in ${origin}.`);
    lines.push('     --apply cannot invent them, so the server keeps the value it has');
    lines.push('     already. A stale value from another environment is how a live push');
    lines.push('     charges a real customer against a test account:');
    for (const name of upload.absentRequired) lines.push(`       ✗ ${name}  — NOT WRITTEN, the old server value stays live`);
    lines.push('     Add them to the file, or look at what is live now (digests only):');
    lines.push('       supabase secrets list --project-ref <ref>');
  }
  if (upload.absentOptional.length) {
    lines.push('');
    lines.push(`  ! ${upload.absentOptional.length} optional variable(s) are not in ${origin}; for each,`);
    lines.push('    the server keeps its current value, which may not be the one you mean:');
    for (const name of upload.absentOptional) lines.push(`    ! ${name}  — NOT WRITTEN, the old server value stays live`);
  }
  return lines;
}

/** Only the parts of a Supabase CLI reply that are safe: drop any line that
 * looks like it is echoing a KEY=value pair we consider secret. */
function safeChildOutput(stdout, stderr) {
  const kept = [];
  for (const source of [stdout, stderr]) {
    for (const line of String(source ?? '').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const stripped = line.replace(/^(\s*)([A-Z][A-Z0-9_]{2,})=(\S.*)$/, (_all, space, name) =>
        SECRET_NAMES.includes(name) ? `${space}${name}=••••••` : line
      );
      kept.push(scrub(stripped));
    }
  }
  return kept;
}

function runSupabase(args, label) {
  print(`› supabase ${scrub(args.join(' '))}`);
  const result = spawnSync(`supabase ${args.join(' ')}`, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    timeout: 300_000,
  });
  for (const line of safeChildOutput(result.stdout, result.stderr)) print(`  ${line}`);
  if (result.error) {
    print(`  ${label}: ${scrub(result.error.message)}`);
    return false;
  }
  if (result.status !== 0) {
    print(`  ${label}: exited ${result.status}`);
    return false;
  }
  print(`  ${label}: ok`);
  return true;
}

// --- non-charging preflight ----------------------------------------------

/** Never let a fetch error quote a credential or the callback token. */
function maskedError(error) {
  return scrub(error && error.message ? error.message : String(error));
}

/** OAuth is read-only: it proves the consumer key/secret pair is accepted and
 * costs nothing. It is the only Daraja call this script makes for the token. */
async function requestDarajaToken(key, secret, endpoint) {
  const basic = Buffer.from(`${key}:${secret}`, 'utf8').toString('base64');
  try {
    const res = await fetch(`${endpoint}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${basic}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      const detail = typeof body.errorMessage === 'string' ? ` — ${body.errorMessage}` : '';
      return { ok: false, error: `HTTP ${res.status}${detail}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `could not reach ${endpoint}: ${maskedError(error)}` };
  }
}

/**
 * Prove the deployed callback accepts the configured ?t= token without taking a
 * payment. It posts a synthetic, deliberately impossible CheckoutRequestID:
 * the callback validates the token first, then settleCheckout() finds no row and
 * returns without writing anything. A 200 therefore means the token was accepted
 * and an unknown id was ignored; 401 means the token or JWT mode is wrong.
 */
async function probeCallback(callbackUrl) {
  const id = `PREFLIGHT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Body: {
          stkCallback: {
            ResultCode: 1,
            ResultDesc: 'Preflight only — no payment was initiated.',
            CheckoutRequestID: id,
            MerchantRequestID: id,
          },
        },
      }),
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    const text = (await res.text().catch(() => '')).slice(0, 500);
    if (res.status === 404) {
      return { ok: false, error: 'HTTP 404 — mpesa-callback is not deployed at this URL' };
    }
    if (res.status === 401 || res.status === 403) {
      const jwt = /authorization|jwt/i.test(text);
      return {
        ok: false,
        error: jwt
          ? `HTTP ${res.status} — JWT verification is still on; deploy mpesa-callback with --no-verify-jwt`
          : `HTTP ${res.status} — the deployed callback rejected the ?t= token`,
      };
    }
    if (res.status >= 500) {
      return { ok: false, error: `HTTP ${res.status} — the callback is deployed but unhealthy` };
    }
    if (res.status >= 300 && res.status < 400) {
      return { ok: false, error: `HTTP ${res.status} — the callback redirects; use its final HTTPS URL` };
    }
    return { ok: true, status: res.status };
  } catch (error) {
    return { ok: false, error: `unreachable: ${maskedError(error)}` };
  }
}

function preflightLine(ok, name, detail) {
  print(`  ${ok ? '✓' : '✗'} ${name}: ${detail}`);
}

async function preflight(report, values) {
  const failures = [];
  print('');
  print('Non-charging preflight — no STK Push and no payment request will be sent.');
  print('');

  const key = (values.DARAJA_CONSUMER_KEY ?? '').trim();
  const secret = (values.DARAJA_CONSUMER_SECRET ?? '').trim();
  if (!key || !secret) {
    preflightLine(false, 'OAuth token', 'DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET are required');
    failures.push('OAuth token');
  } else {
    const token = await requestDarajaToken(key, secret, report.baseUrl);
    if (token.ok) {
      preflightLine(true, 'OAuth token', `accepted by ${report.baseUrl}`);
    } else {
      preflightLine(false, 'OAuth token', token.error);
      failures.push('OAuth token');
    }
  }

  const shortcode = (values.DARAJA_SHORTCODE ?? '').trim();
  if (!shortcode) {
    preflightLine(false, 'DARAJA_SHORTCODE', 'missing');
    failures.push('DARAJA_SHORTCODE');
  } else if (!/^\d{5,8}$/.test(shortcode)) {
    preflightLine(false, 'DARAJA_SHORTCODE', 'must be 5 to 8 digits');
    failures.push('DARAJA_SHORTCODE');
  } else {
    preflightLine(true, 'DARAJA_SHORTCODE', '5–8 digits; ownership is only confirmed by Safaricom on the first push');
  }

  const passkey = (values.DARAJA_PASSKEY ?? '').trim();
  if (!passkey) {
    preflightLine(false, 'DARAJA_PASSKEY', 'missing');
    failures.push('DARAJA_PASSKEY');
  } else {
    preflightLine(true, 'DARAJA_PASSKEY', 'present; Daraja has no non-charging check for it, so the first push confirms it');
  }

  const callbackUrl = (values.MPESA_CALLBACK_URL ?? '').trim();
  const callbackToken = (values.MPESA_CALLBACK_TOKEN ?? '').trim();
  let parsed = null;
  try {
    parsed = callbackUrl ? new URL(callbackUrl) : null;
  } catch {
    parsed = null;
  }

  if (!callbackUrl) {
    preflightLine(false, 'MPESA_CALLBACK_URL', 'missing');
    failures.push('MPESA_CALLBACK_URL');
  } else if (!parsed || parsed.protocol !== 'https:') {
    preflightLine(false, 'MPESA_CALLBACK_URL', 'must be an absolute https URL');
    failures.push('MPESA_CALLBACK_URL');
  } else if (!parsed.pathname.includes('/functions/v1/mpesa-callback')) {
    preflightLine(false, 'MPESA_CALLBACK_URL', 'does not point at the mpesa-callback Edge Function path');
    failures.push('MPESA_CALLBACK_URL');
  } else if (!callbackToken) {
    preflightLine(false, 'MPESA_CALLBACK_TOKEN', 'missing');
    failures.push('MPESA_CALLBACK_TOKEN');
  } else if (!parsed.searchParams.get('t')) {
    preflightLine(false, 'MPESA_CALLBACK_URL', 'has no ?t= token');
    failures.push('MPESA_CALLBACK_URL');
  } else if (parsed.searchParams.get('t') !== callbackToken) {
    preflightLine(false, 'MPESA_CALLBACK_TOKEN', 'does not match the ?t= value in MPESA_CALLBACK_URL');
    failures.push('MPESA_CALLBACK_TOKEN');
  } else {
    if (callbackToken.length < 16) {
      print('  ! MPESA_CALLBACK_TOKEN: shorter than 16 characters');
    }
    const callback = await probeCallback(callbackUrl);
    if (callback.ok) {
      preflightLine(true, 'MPESA_CALLBACK_URL', `answered HTTP ${callback.status} to a synthetic callback; deployed token accepted`);
    } else {
      preflightLine(false, 'MPESA_CALLBACK_URL', callback.error);
      failures.push('MPESA_CALLBACK_URL');
    }
  }

  print('');
  if (failures.length || report.problems.length) {
    if (report.problems.length) {
      print(`Audit problems (${report.problems.length}):`);
      for (const problem of report.problems) print(`  ✗ ${problem}`);
    }
    print(`Preflight failed: ${failures.length} preflight check(s), ${report.problems.length} audit problem(s).`);
    return false;
  }
  print('Preflight passed. No payment was initiated.');
  return true;
}

// --- main ----------------------------------------------------------------

async function main(argv) {
  const options = {
    from: '',
    env: '',
    projectRef: '',
    apply: false,
    preflight: false,
    skipDeploy: false,
    force: false,
    json: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from' || arg === '--file') options.from = argv[++i] ?? '';
    else if (arg === '--env') options.env = argv[++i] ?? '';
    else if (arg === '--project-ref') options.projectRef = argv[++i] ?? '';
    else if (arg === '--preflight') options.preflight = true;
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--skip-deploy') options.skipDeploy = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      print(
        [
          'Usage: node scripts/mpesa-golive.cjs [--from <secrets file>] [--env sandbox|production]',
          '       [--project-ref <ref>] [--preflight] [--apply] [--skip-deploy] [--force]',
          '       [--json] [--verbose]',
          '',
          'Audits the Daraja configuration for one environment and reports variable',
          'names only — never values. Add --preflight to obtain a Daraja OAuth token',
          'and prove the deployed callback accepts the configured token. It never',
          'calls STK Push and never initiates a payment. Add --apply to write the',
          'secrets under the resolved variable names with `supabase secrets set',
          '--env-file` (from a temp file it builds) and deploy both functions.',
          '',
          'Exit 0 = ready, 2 = not ready, 1 = usage or command failure.',
        ].join('\n')
      );
      return 0;
    } else die(`unknown argument '${arg}' (see --help)`);
  }

  // Start from the ambient environment, then let the file override it, then the
  // explicit --env flag. The last one wins because the operator typed it now.
  // Which names the file itself supplied, so a name it does not carry can be
  // reported by --apply instead of quietly keeping the server's old value.
  const fileNames = new Set();

  const values = {};
  for (const name of MANAGED) {
    if (typeof process.env[name] === 'string') values[name] = process.env[name];
  }

  if (options.from) {
    const absolute = path.resolve(ROOT, options.from);
    if (!fs.existsSync(absolute)) die(`--from '${options.from}' does not exist`);
    const guard = fileIsSafeToRead(absolute);
    if (!guard.ok) die(guard.reason);
    const fromFile = parseEnvFile(fs.readFileSync(absolute, 'utf8'));
    Object.assign(values, fromFile);
    for (const name of Object.keys(fromFile)) fileNames.add(name);
  }

  if (options.env) {
    const normalized = ENV_NAMES[options.env.trim().toLowerCase()];
    if (!normalized) die(`--env must be sandbox or production, got '${options.env}'`);
    values.MPESA_ENV = normalized;
  }

  rememberSecrets(values);
  for (const name of MANAGED) ENV[name] = (values[name] ?? '').trim();

  const report = mpesa.audit();

  if (options.preflight) {
    if (options.json) die('--json is not supported with --preflight; the preflight report is human-readable.');
    print(`Daraja environment : ${report.environment}`);
    print(`Endpoint           : ${report.baseUrl}`);
    const passed = await preflight(report, values);
    print(
      `PREFLIGHT environment=${report.environment} passed=${passed && report.ready ? 'yes' : 'no'} auditProblems=${report.problems.length}`
    );
    return passed && report.ready ? 0 : 2;
  }

  if (options.json) {
    const payload = {
      environment: report.environment,
      baseUrl: report.baseUrl,
      transactionType: report.transactionType,
      amountKes: report.amountKes,
      ready: report.ready,
      problems: report.problems.map((line) => scrub(line)),
      warnings: report.warnings.map((line) => scrub(line)),
      secrets: Object.fromEntries(
        MANAGED.map((name) => [name, { present: Boolean((values[name] ?? '').trim()), secret: SECRET_NAMES.includes(name) }])
      ),
    };
    print(JSON.stringify(payload, null, 2));
    summaryLine(report);
    return report.ready ? 0 : 2;
  }

  describe(report, values, options);

  if (!options.apply) {
    if (!report.ready) {
      print('Nothing was sent anywhere. Fix the problems above, then re-run.');
    } else {
      print('Nothing was sent anywhere (this run was read-only).');
      print('To write this configuration and deploy both functions:');
      print(`  node scripts/mpesa-golive.cjs --from ${options.from || '<secrets file>'} --apply`);
    }
    summaryLine(report);
    return report.ready ? 0 : 2;
  }

  // Usage errors are reported before configuration errors: without a file there
  // is nothing to apply, and saying so is more useful than reciting the audit.
  if (!options.from) {
    print('Apply refused without --from <secrets file>: the keys have to come from a file, never from');
    print('a command line, where they would sit in shell history and in the process list.');
    summaryLine(report);
    return 2;
  }

  if (!report.ready && !options.force) {
    print('Apply refused: the audit has problems. Fix them, or pass --force to override.');
    summaryLine(report);
    return 2;
  }

  const ref = options.projectRef || projectRefFromPublicUrl();
  if (!ref) {
    print('Apply refused: no Supabase project ref. Pass --project-ref <ref> (it is the first label in');
    print('EXPO_PUBLIC_SUPABASE_URL, which is a public value, so naming it here leaks nothing).');
    summaryLine(report);
    return 2;
  }

  const absolute = path.resolve(ROOT, options.from);
  print(`Target project   : ${ref}`);
  print(`Values read from : ${options.from} (labels mapped to variable names; values stay unread here)`);
  print(`Environment      : ${report.environment} → ${report.baseUrl}`);

  // What goes to the CLI, and why it is not the operator's own file: the CLI
  // reads a file literally, so uploading `Consumer Key:` verbatim would create a
  // secret named Consumer_Key while the Edge Function kept reading the old
  // DARAJA_CONSUMER_KEY. Secret values must never reach a command line either —
  // they would sit in shell history and in the process list — so the resolved
  // names go through a 0600 temp file that is deleted as soon as the CLI has
  // read it. MPESA_ENV travels in the same file now: it is written from what the
  // audit resolved, so the environment cannot stay stale behind a green report.
  const upload = resolveUpload(values, report, fileNames);
  for (const line of uploadWarnings(upload, absolute)) print(line);

  if (upload.unsafe.length) {
    print('');
    print('Apply refused: these values contain a quote, a backtick, a backslash or a line');
    print('break, which the CLI would read back differently from what the audit checked.');
    print('Only the names are shown:');
    for (const name of upload.unsafe) print(`  ✗ ${name}`);
    print('Nothing has been written. No command ran, no deploy happened, no money moved.');
    summaryLine(report);
    return 2;
  }

  print('');
  print(`--apply uploads ${upload.written.length} of ${MANAGED.length} variables, by the name the function reads:`);
  for (const entry of upload.written) print(`  ${entry.name.padEnd(24)} ${entry.source}`);
  print('  file = from your file, env = inherited from this shell, derived = resolved by the audit');
  print('  (no values are printed, and nothing is uploaded verbatim from your file)');
  print('');

  const uploadFile = path.join(os.tmpdir(), `bolingo-mpesa-apply-${process.pid}.env`);
  let secretsOk = false;
  try {
    fs.writeFileSync(uploadFile, `${upload.lines.join('\n')}\n`, { mode: 0o600 });
    secretsOk = runSupabase(
      // Forward slashes so the quoted path reads the same on screen as on disk.
      ['secrets', 'set', '--env-file', JSON.stringify(uploadFile.split('\\').join('/')), '--project-ref', ref],
      'supabase secrets set'
    );
  } finally {
    try {
      fs.rmSync(uploadFile, { force: true });
    } catch {
      print(`  ${uploadFile} still holds live keys: delete it.`);
    }
  }
  if (!secretsOk) {
    print('Stopped: the secrets did not land, so the functions were not deployed against them.');
    summaryLine(report);
    return 1;
  }

  if (options.skipDeploy) {
    print('');
    print('Secrets written. Deploy was skipped (--skip-deploy); the running functions still use the');
    print('previous code, so run the deploy line before testing a payment:');
    print(`  supabase functions deploy mpesa-push --no-verify-jwt=false --project-ref ${ref}`);
    print(`  supabase functions deploy mpesa-callback --no-verify-jwt --project-ref ${ref}`);
    summaryLine(report);
    return 0;
  }

  print('');
  // verify_jwt stays ON for the push (a learner session is required) and OFF for
  // the callback (Safaricom has no session, so the ?t= token is the credential).
  const pushOk = runSupabase(
    ['functions', 'deploy', 'mpesa-push', '--no-verify-jwt=false', '--project-ref', ref],
    'mpesa-push deploy'
  );
  const callbackOk = runSupabase(
    ['functions', 'deploy', 'mpesa-callback', '--no-verify-jwt', '--project-ref', ref],
    'mpesa-callback deploy'
  );

  print('');
  if (pushOk && callbackOk) {
    print(`Deployed on ${report.environment}. Confirm from outside before enabling the flag:`);
    print(`  curl -X GET https://${ref}.supabase.co/functions/v1/mpesa-push -H "authorization: Bearer <anon key>"`);
    print('  → { "environment": "' + report.environment + '", "ready": true } and no shortcode or key in the body.');
    print('Then pay yourself once at the live price and check mpesa_checkouts.status flips to');
    print("'confirmed' with the amount you were charged, and profiles.is_premium follows.");
    print('Finally turn on the mpesa_premium release flag in Settings → Quality & Operations.');
    summaryLine(report);
    return 0;
  }
  print('One or both functions did not deploy. The secrets are set; re-run the deploy lines above.');
  summaryLine(report);
  return 1;
}

/** Exported for `npm run check:mpesa`, which proves what --apply uploads and
 * what it refuses to upload without touching a network or the Supabase CLI.
 * Requiring this file has no side effects: the run below is guarded. */
module.exports = {
  MANAGED,
  REQUIRED_NAMES,
  SECRET_NAMES,
  normalizeKey,
  parseEnvFile,
  resolveUpload,
  uploadWarnings,
};

if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`mpesa-golive: ${error && error.stack ? error.stack : error}`);
      process.exitCode = 1;
    });
}
