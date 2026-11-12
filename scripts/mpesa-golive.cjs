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
 * `--apply`, it hands the file to the Supabase CLI and deploys both functions.
 *
 * Contract:
 *   node scripts/mpesa-golive.cjs                        # audit the process env
 *   node scripts/mpesa-golive.cjs --from <file>          # audit a secrets file
 *   node scripts/mpesa-golive.cjs --from <file> --json   # machine-readable
 *   node scripts/mpesa-golive.cjs --from <file> --apply  # + push and deploy
 *
 *   --from <file>       dotenv-style file holding the Daraja and M-Pesa values.
 *                       Keep it outside the repo, or git-ignore it: a file that
 *                       is tracked is refused outright. Its values are never
 *                       read into this console, a log line or a committed file.
 *   --env <name>        sandbox | production. Overrides MPESA_ENV for the audit
 *                       and is written as a plain (non-secret) secret on --apply.
 *   --project-ref <ref> Supabase project to write to. Defaults to the ref in
 *                       EXPO_PUBLIC_SUPABASE_URL, which is public by design.
 *   --apply             actually run `supabase secrets set --env-file` and
 *                       `supabase functions deploy`. Without it, nothing leaves
 *                       the machine and the script only reports.
 *   --skip-deploy       with --apply: write the secrets, do not deploy.
 *   --force             with --apply: proceed even when the audit has problems.
 *   --json              one JSON report on stdout, for `npm run gate` glue.
 *   --verbose           also report the length of each secret (names + lengths,
 *                       never values).
 *
 * Exit: 0 ready, 2 not ready (problems found / apply refused), 1 usage or
 * command failure. Prints `SUMMARY environment= ready= problems= warnings=`
 * last so a caller can read the verdict without parsing prose.
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
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
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

// --- main ----------------------------------------------------------------

function main(argv) {
  const options = {
    from: '',
    env: '',
    projectRef: '',
    apply: false,
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
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--skip-deploy') options.skipDeploy = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      print(
        [
          'Usage: node scripts/mpesa-golive.cjs [--from <secrets file>] [--env sandbox|production]',
          '       [--project-ref <ref>] [--apply] [--skip-deploy] [--force] [--json] [--verbose]',
          '',
          'Audits the Daraja configuration for one environment and reports variable',
          'names only — never values. Add --apply to write the secrets with',
          '`supabase secrets set --env-file` and deploy mpesa-push / mpesa-callback.',
          '',
          'Exit 0 = ready, 2 = not ready, 1 = usage or command failure.',
        ].join('\n')
      );
      return 0;
    } else die(`unknown argument '${arg}' (see --help)`);
  }

  // Start from the ambient environment, then let the file override it, then the
  // explicit --env flag. The last one wins because the operator typed it now.
  const values = {};
  for (const name of MANAGED) {
    if (typeof process.env[name] === 'string') values[name] = process.env[name];
  }

  if (options.from) {
    const absolute = path.resolve(ROOT, options.from);
    if (!fs.existsSync(absolute)) die(`--from '${options.from}' does not exist`);
    const guard = fileIsSafeToRead(absolute);
    if (!guard.ok) die(guard.reason);
    Object.assign(values, parseEnvFile(fs.readFileSync(absolute, 'utf8')));
  }

  if (options.env) {
    const normalized = ENV_NAMES[options.env.trim().toLowerCase()];
    if (!normalized) die(`--env must be sandbox or production, got '${options.env}'`);
    values.MPESA_ENV = normalized;
  }

  rememberSecrets(values);
  for (const name of MANAGED) ENV[name] = (values[name] ?? '').trim();

  const report = mpesa.audit();

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
  print(`Secrets file     : ${options.from} (values stay unread here)`);
  print(`Environment      : ${report.environment} → ${report.baseUrl}`);
  print('');

  // The file the CLI reads is the operator's own file; this script never copies
  // it, rewrites it or prints it. MPESA_ENV is written separately because it is
  // not a secret and --env must be able to select it on its own.
  const secretsOk = runSupabase(
    ['secrets', 'set', '--env-file', JSON.stringify(absolute), '--project-ref', ref],
    'supabase secrets set'
  );
  if (!secretsOk) {
    print('Stopped: the secrets did not land, so the functions were not deployed against them.');
    summaryLine(report);
    return 1;
  }

  if (values.MPESA_ENV) {
    runSupabase(['secrets', 'set', `MPESA_ENV=${values.MPESA_ENV}`, '--project-ref', ref], 'MPESA_ENV');
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

if (require.main === module) process.exitCode = main(process.argv.slice(2));
