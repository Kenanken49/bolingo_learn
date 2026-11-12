#!/usr/bin/env node
/**
 * Guard the M-Pesa (Safaricom Daraja STK Push) premium rail.
 *
 * This rail moves real money and grants real access, so the checks are the
 * three ways it can break:
 *   1. Behaviour — the real server module runs against an in-memory ledger:
 *      the price only ever comes from the server, an underpayment cannot buy
 *      premium, a repeat callback cannot resettle a row, and premium lapses
 *      when the paid window runs out (M-Pesa has no renewal webhook).
 *   2. Trust boundary — the client must not be able to write a price, an
 *      amount or the premium flag, and the database must not let it insert a
 *      checkout row itself.
 *   3. Wiring — Android-only gating, the callback token, the deploy flags and
 *      the telemetry events behind the release flag all stay in place.
 *
 * No network call is made and no Daraja credentials are needed. Run with
 * `node scripts/check-mpesa.cjs` (also part of `npm test`).
 */

'use strict';

/* global __dirname, globalThis, console, process -- Node provides these to CommonJS scripts. */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SHARED = path.join(ROOT, 'supabase', 'functions', '_shared', 'mpesa.ts');
const PUSH = path.join(ROOT, 'supabase', 'functions', 'mpesa-push', 'index.ts');
const CALLBACK = path.join(ROOT, 'supabase', 'functions', 'mpesa-callback', 'index.ts');
const CLIENT = path.join(ROOT, 'lib', 'mpesa.ts');
const PURCHASES = path.join(ROOT, 'lib', 'purchases.ts');
const PAYWALL = path.join(ROOT, 'src', 'app', 'paywall.tsx');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations_mpesa_premium.sql');
const FLAGS = path.join(ROOT, 'content', 'quality', 'flags.json');
const GATES = path.join(ROOT, 'content', 'quality', 'gates.json');
const PACKAGE = path.join(ROOT, 'package.json');
const README = path.join(ROOT, 'README.md');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const PAYWALL_DOC = path.join(ROOT, 'docs', 'paywall-setup.md');
const GOLIVE_CLI = path.join(ROOT, 'scripts', 'mpesa-golive.cjs');

let failures = 0;
const queue = [];

// Checks run strictly in registration order: the ledger is shared state, so an
// async check must finish before the next one resets it.
function check(name, fn) {
  queue.push({ name, fn });
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

// --- run the real Deno module under Node ---------------------------------

const ENV = {};
globalThis.Deno = { env: { get: (name) => (name in ENV ? ENV[name] : undefined) } };

const state = { mpesa_checkouts: [], profiles: [] };

function makeUpdater(table, filters, patch) {
  const local = [];
  const updater = {
    eq: (col, val) => (local.push((row) => row[col] === val), updater),
    in: (col, vals) => (local.push((row) => vals.includes(row[col])), updater),
    then: (resolve, reject) => {
      try {
        const all = filters.concat(local);
        state[table]
          .filter((row) => all.every((keep) => keep(row)))
          .forEach((row) => Object.assign(row, patch));
        resolve({ data: null, error: null });
      } catch (error) {
        reject(error);
      }
    },
  };
  return updater;
}

function makeQuery(table) {
  const filters = [];
  const query = {
    select: () => query,
    eq: (col, val) => (filters.push((row) => row[col] === val), query),
    in: (col, vals) => (filters.push((row) => vals.includes(row[col])), query),
    order: (col, options = {}) => {
      query._sort = { col, ascending: options.ascending !== false };
      return query;
    },
    limit: () => query,
    maybeSingle: async () => {
      let list = state[table].filter((row) => filters.every((keep) => keep(row)));
      if (query._sort) {
        const { col, ascending } = query._sort;
        list = [...list].sort((a, b) => {
          if (a[col] === b[col]) return 0;
          return (a[col] < b[col] ? -1 : 1) * (ascending ? 1 : -1);
        });
      }
      return { data: list[0] ?? null, error: null };
    },
    update: (patch) => makeUpdater(table, filters, patch),
  };
  return query;
}

function loadShared() {
  const source = read(SHARED);
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: SHARED,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length) {
    throw new Error(
      `shared M-Pesa module has syntax errors:\n${diagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n')}`
    );
  }
  const module = { exports: {} };
  const requireStub = (specifier) => {
    assert(specifier.includes('@supabase/supabase-js'), `unexpected import in _shared/mpesa.ts: ${specifier}`);
    return { createClient: () => ({ from: makeQuery }) };
  };
  new Function('exports', 'require', 'module', outputText)(module.exports, requireStub, module);
  return module.exports;
}

const mpesa = loadShared();

function resetLedger(checkouts = [], profiles = []) {
  state.mpesa_checkouts = checkouts;
  state.profiles = profiles;
}

function pendingCheckout(overrides = {}) {
  return {
    id: 'chk-1',
    user_id: 'user-1',
    phone: '254712345678',
    plan: 'premium_monthly',
    amount_kes: 770,
    period_days: 30,
    checkout_request_id: 'co-1',
    status: 'pending',
    result_code: null,
    result_desc: null,
    period_ends: null,
    requested_at: new Date().toISOString(),
    settled_at: null,
    ...overrides,
  };
}

function profile(isPremium = false) {
  return { id: 'user-1', is_premium: isPremium };
}

const DAY = 86_400_000;

// --- 1. behaviour --------------------------------------------------------

check('phone numbers normalise to the 254 form Daraja needs', () => {
  assert(mpesa.normalizePhone('0712 345 678') === '254712345678', 'local form failed');
  assert(mpesa.normalizePhone('+254712345678') === '254712345678', 'international form failed');
  assert(mpesa.normalizePhone('254112345678') === '254112345678', 'new Safaricom 1xx line rejected');
  assert(mpesa.normalizePhone('071234') === null, 'a short number must be rejected');
  assert(mpesa.normalizePhone('+15551234567') === null, 'a non-Kenyan number must be rejected');
});

check('the Daraja timestamp is East Africa Time, not UTC', () => {
  const noonUtc = new Date('2026-11-01T09:00:00Z'); // 12:00 in Nairobi (UTC+3)
  assert(mpesa.nairobiStamp(noonUtc) === '20261101120000', `got ${mpesa.nairobiStamp(noonUtc)}`);
  const midnightUtc = new Date('2026-11-01T21:30:00Z'); // 00:30 next day in Nairobi
  assert(mpesa.nairobiStamp(midnightUtc) === '20261102003000', `hour 24 leaked as ${mpesa.nairobiStamp(midnightUtc)}`);
});

check('the price is server-owned and defaults to 770 KES', () => {
  delete ENV.MPESA_PREMIUM_KES;
  assert(mpesa.plans().premium_monthly.amountKes === 770, 'default price changed');
  assert(mpesa.plans().premium_monthly.periodDays === 30, 'monthly period changed');
  ENV.MPESA_PREMIUM_KES = '900';
  assert(mpesa.plans().premium_monthly.amountKes === 900, 'operator override ignored');
  ENV.MPESA_PREMIUM_KES = '0';
  assert(mpesa.plans().premium_monthly.amountKes === 770, 'a 0 override must fall back, not charge nothing');
  delete ENV.MPESA_PREMIUM_KES;
});

check('sandbox is the default endpoint', () => {
  delete ENV.DARAJA_BASE_URL;
  assert(mpesa.baseUrl() === 'https://sandbox.safaricom.co.ke', `got ${mpesa.baseUrl()}`);
  ENV.DARAJA_BASE_URL = 'https://api.safaricom.co.ke/';
  assert(mpesa.baseUrl() === 'https://api.safaricom.co.ke', 'trailing slash not trimmed');
  delete ENV.DARAJA_BASE_URL;
});

check('the callback token compare is constant-time and rejects mismatches', () => {
  assert(mpesa.safeEqual('abc123', 'abc123') === true, 'equal tokens rejected');
  assert(mpesa.safeEqual('abc123', 'abc124') === false, 'wrong token accepted');
  assert(mpesa.safeEqual('abc123', 'abc1234') === false, 'length difference accepted');
  assert(mpesa.safeEqual('', '') === false, 'an empty secret must never match an empty token');
});

check('a missing Daraja secret names itself instead of half-configuring', () => {
  for (const key of ['DARAJA_CONSUMER_KEY', 'DARAJA_CONSUMER_SECRET', 'DARAJA_SHORTCODE', 'DARAJA_PASSKEY', 'MPESA_CALLBACK_URL']) {
    delete ENV[key];
  }
  const config = mpesa.darajaConfig();
  assert(config.error && config.error.includes('DARAJA_CONSUMER_KEY'), JSON.stringify(config));
  assert(!('consumerKey' in config), 'incomplete config must not be returned as usable');
});

check('a confirmed callback settles the row, prices premium and starts the window', async () => {
  resetLedger([pendingCheckout()], [profile()]);
  const outcome = await mpesa.settleCheckout('co-1', {
    resultCode: '0',
    resultDesc: 'Success',
    merchantRequestId: 'mr-1',
    paidAmountKes: 770,
  });
  assert(outcome.ok === true, JSON.stringify(outcome));
  const row = state.mpesa_checkouts[0];
  assert(row.status === 'confirmed', `status became ${row.status}`);
  assert(row.period_ends !== null, 'no paid-through date');
  const inDays = (new Date(row.period_ends).getTime() - Date.now()) / DAY;
  assert(inDays > 29 && inDays <= 30, `period is ${inDays} days`);
  assert(state.profiles[0].is_premium === true, 'premium was not granted');
});

check('a 1 KES payment does not buy 770 KES of premium', async () => {
  resetLedger([pendingCheckout()], [profile(true)]);
  const outcome = await mpesa.settleCheckout('co-1', {
    resultCode: '0',
    resultDesc: 'Success',
    paidAmountKes: 1,
  });
  assert(outcome.ok === true, 'the settle call itself failed');
  const row = state.mpesa_checkouts[0];
  assert(row.status === 'failed', `underpayment became ${row.status}`);
  assert(/mismatch/i.test(row.result_desc), `reason lost: ${row.result_desc}`);
  assert(row.period_ends === null, 'an underpayment started a premium window');
  assert(state.profiles[0].is_premium === false, 'the underpayer kept the premium flag');
});

check('a rejected callback records the Safaricom reason', async () => {
  resetLedger([pendingCheckout()], [profile()]);
  await mpesa.settleCheckout('co-1', { resultCode: '1', resultDesc: 'User cancel.' });
  const row = state.mpesa_checkouts[0];
  assert(row.status === 'failed' && row.result_code === '1', JSON.stringify(row));
  assert(row.result_desc === 'User cancel.', 'reason not stored');
});

check('a callback for a checkout this server never created changes nothing', async () => {
  resetLedger([pendingCheckout()], [profile(false)]);
  const outcome = await mpesa.settleCheckout('made-up-id', { resultCode: '0', resultDesc: 'Success' });
  assert(outcome.ok === false && /unknown/i.test(outcome.reason), JSON.stringify(outcome));
  assert(state.profiles[0].is_premium === false, 'an invented id granted premium');
});

check('a repeat callback cannot resettle or extend a settled row', async () => {
  resetLedger([pendingCheckout()], [profile()]);
  await mpesa.settleCheckout('co-1', { resultCode: '0', resultDesc: 'Success', paidAmountKes: 770 });
  const firstEnds = state.mpesa_checkouts[0].period_ends;
  const outcome = await mpesa.settleCheckout('co-1', { resultCode: '0', resultDesc: 'Success', paidAmountKes: 770 });
  assert(outcome.reason === 'already-settled', JSON.stringify(outcome));
  assert(state.mpesa_checkouts[0].period_ends === firstEnds, 'a duplicate callback extended the period');
});

check('premium lapses by itself once the paid window ends', async () => {
  const expired = pendingCheckout({
    status: 'confirmed',
    period_ends: new Date(Date.now() - 60_000).toISOString(),
  });
  resetLedger([expired], [profile(true)]);
  const settled = await mpesa.settlePremium('user-1');
  assert(settled.isPremium === false, 'an expired M-Pesa period still grants premium');
  assert(state.profiles[0].is_premium === false, 'the profile flag was never cleared');
});

check('a live period keeps premium on and reports its end date', async () => {
  const live = pendingCheckout({ status: 'confirmed', period_ends: new Date(Date.now() + 5 * DAY).toISOString() });
  resetLedger([live], [profile(false)]);
  const settled = await mpesa.settlePremium('user-1');
  assert(settled.isPremium === true, 'a paid period was treated as expired');
  assert(settled.periodEnds === live.period_ends, 'wrong paid-through date');
});

check('a callback that arrives after our own timeout still buys premium', async () => {
  resetLedger([pendingCheckout({ status: 'expired' })], [profile(false)]);
  const outcome = await mpesa.settleCheckout('co-1', { resultCode: '0', resultDesc: 'Success', paidAmountKes: 770 });
  assert(outcome.ok === true, JSON.stringify(outcome));
  assert(state.mpesa_checkouts[0].status === 'confirmed', 'a paid row stayed expired');
  assert(state.profiles[0].is_premium === true, 'the learner paid and stayed on the free tier');
});

check('a settled verdict is final — no second grant from a replayed callback', async () => {
  resetLedger([pendingCheckout({ status: 'failed', result_code: '1' })], [profile(false)]);
  const outcome = await mpesa.settleCheckout('co-1', { resultCode: '0', resultDesc: 'Success', paidAmountKes: 770 });
  assert(outcome.reason === 'already-settled', JSON.stringify(outcome));
  assert(state.mpesa_checkouts[0].status === 'failed', 'a failed payment was rewritten to confirmed');
  assert(state.profiles[0].is_premium === false, 'premium was granted from a failed row');
});

// --- 1b. going live: which Daraja, and whether it can be trusted ---------

// Going live is a configuration step, and every way it goes wrong costs money
// twice: a learner pays real shillings into a callback that cannot settle, or a
// test paybill charges a real customer. So the rules that decide it are asserted
// in both directions — a complete live config must pass, and each incomplete one
// must name the variable that is wrong before any push is sent.

const LIVE_HOST = 'https://api.safaricom.co.ke';
const SANDBOX_HOST = 'https://sandbox.safaricom.co.ke';

// Values invented for this run. They exist to be looked for in output: if one
// ever appears in a report, the auditor is printing the thing it is meant to
// hide, which is the worst bug this file can catch.
const FAKE_KEY = 'gateOnlyConsumerKeyMustNeverBePrinted';
const FAKE_SECRET = 'gateOnlyConsumerSecretMustNeverBePrinted';
const FAKE_PASSKEY = 'gateOnlyPasskeyMustNeverBePrinted';
const FAKE_TOKEN = 'gateOnlyCallbackTokenMustNeverBePrinted123456';
const FAKES = [FAKE_KEY, FAKE_SECRET, FAKE_PASSKEY, FAKE_TOKEN];

/** A live configuration that has nothing wrong with it. */
function liveConfig(extra = {}) {
  return {
    MPESA_ENV: 'production',
    DARAJA_CONSUMER_KEY: FAKE_KEY,
    DARAJA_CONSUMER_SECRET: FAKE_SECRET,
    DARAJA_SHORTCODE: '4000100',
    DARAJA_PASSKEY: FAKE_PASSKEY,
    MPESA_CALLBACK_URL: `https://projectref.supabase.co/functions/v1/mpesa-callback?t=${FAKE_TOKEN}`,
    MPESA_CALLBACK_TOKEN: FAKE_TOKEN,
    ...extra,
  };
}

function withEnv(values, run) {
  const saved = { ...ENV };
  for (const key of Object.keys(ENV)) delete ENV[key];
  Object.assign(ENV, values);
  try {
    return run();
  } finally {
    for (const key of Object.keys(ENV)) delete ENV[key];
    Object.assign(ENV, saved);
  }
}

const auditOf = (values) => withEnv(values, () => mpesa.audit());
const problemAbout = (report, name) => report.problems.some((line) => line.includes(name));

check('MPESA_ENV picks the live Daraja and nothing else can redirect it', () => {
  withEnv({ MPESA_ENV: 'production' }, () => {
    assert(mpesa.environment() === 'production', 'MPESA_ENV was ignored');
    assert(mpesa.baseUrl() === LIVE_HOST, `baseUrl() returned ${mpesa.baseUrl()}`);
  });
  withEnv({ MPESA_ENV: 'live' }, () => assert(mpesa.environment() === 'production', 'the live alias was not understood'));
  withEnv({ DARAJA_BASE_URL: LIVE_HOST }, () => assert(mpesa.baseUrl() === LIVE_HOST, 'DARAJA_BASE_URL alone stopped selecting the host'));
  withEnv({}, () => assert(mpesa.baseUrl() === SANDBOX_HOST, 'sandbox must stay the default when nothing is set'));
  withEnv({ MPESA_ENV: 'production', DARAJA_BASE_URL: 'https://somewhere-else.example.com' }, () => {
    assert(mpesa.baseUrl() === LIVE_HOST, 'a foreign DARAJA_BASE_URL changed the endpoint');
  });
});

check('a complete live configuration passes the audit', () => {
  const report = auditOf(liveConfig());
  assert(report.ready, `ready=false: ${report.problems.join(' | ')}`);
  assert(report.environment === 'production' && report.baseUrl === LIVE_HOST, JSON.stringify(report));
  assert(report.amountKes === 770, `the live default price moved: ${report.amountKes}`);
  assert(report.transactionType === 'CustomerPayBillOnline', 'the paybill default changed');
  assert(!FAKES.some((value) => JSON.stringify(report).includes(value)), 'the audit quoted a secret value');
});

check('a half-configured live run is refused finding by finding', () => {
  const mismatch = auditOf(liveConfig({ DARAJA_BASE_URL: SANDBOX_HOST }));
  assert(!mismatch.ready && problemAbout(mismatch, 'MPESA_ENV'), `env/endpoint mismatch slipped through: ${mismatch.problems.join(' | ')}`);

  const testPaybill = auditOf(liveConfig({ DARAJA_SHORTCODE: '17439' }));
  assert(!testPaybill.ready && problemAbout(testPaybill, 'DARAJA_SHORTCODE'), 'the Daraja sandbox paybill was accepted on the live endpoint');

  const foreignHost = auditOf(liveConfig({ DARAJA_BASE_URL: 'https://somewhere-else.example.com' }));
  assert(!foreignHost.ready && problemAbout(foreignHost, 'DARAJA_BASE_URL'), 'an unrecognised DARAJA_BASE_URL was ignored silently');

  const noToken = auditOf(liveConfig({ MPESA_CALLBACK_TOKEN: '' }));
  assert(!noToken.ready && problemAbout(noToken, 'MPESA_CALLBACK_TOKEN'), 'a live run without a callback token must not be called ready');

  const tokenDrift = auditOf(liveConfig({ MPESA_CALLBACK_TOKEN: 'aDifferentCallbackTokenMustNeverBePrinted99' }));
  assert(!tokenDrift.ready && problemAbout(tokenDrift, 'MPESA_CALLBACK_TOKEN'), 'a URL token that is not the expected one was accepted');

  const shortToken = auditOf(liveConfig({ MPESA_CALLBACK_TOKEN: 'tinytoken' }));
  assert(!shortToken.ready, 'a callback token shorter than the URL token was accepted');

  const plainHttp = auditOf(liveConfig({ MPESA_CALLBACK_URL: 'http://projectref.supabase.co/functions/v1/mpesa-callback?t=' + FAKE_TOKEN }));
  assert(!plainHttp.ready && problemAbout(plainHttp, 'https'), 'Daraja refuses plain-HTTP callbacks; so must the audit');

  const badType = auditOf(liveConfig({ MPESA_TRANSACTION_TYPE: 'PayToBusiness' }));
  assert(!badType.ready && problemAbout(badType, 'MPESA_TRANSACTION_TYPE'), 'an invented transaction type was accepted');

  const noKeys = auditOf({ MPESA_ENV: 'production' });
  assert(!noKeys.ready && problemAbout(noKeys, 'DARAJA_CONSUMER_KEY'), 'a live environment with no keys reported itself ready');
  assert(!FAKES.some((value) => JSON.stringify(noKeys).includes(value)), 'the audit echoed a value while reporting missing keys');
});

check('the audit warns about what it cannot know', () => {
  const till = auditOf(liveConfig({ MPESA_TRANSACTION_TYPE: 'CustomerBuyGoodsOnline' }));
  assert(till.ready && till.transactionType === 'CustomerBuyGoodsOnline', `a till deployment was refused: ${till.problems.join(' | ')}`);

  const priceDrift = auditOf(liveConfig({ MPESA_PREMIUM_KES: '500' }));
  assert(priceDrift.warnings.some((line) => line.includes('MPESA_PREMIUM_KES')), 'a live price that differs from the advertised one went unmentioned');
  assert(!FAKES.some((value) => JSON.stringify(priceDrift).includes(value)), 'the price warning quoted a secret');

  const sandboxWithLiveNumber = auditOf(liveConfig({ MPESA_ENV: '', DARAJA_SHORTCODE: '4000100' }));
  assert(sandboxWithLiveNumber.ready && sandboxWithLiveNumber.warnings.length > 0, 'a live shortcode under sandbox should warn, not block');
});

// -- the operator CLI, run the way the operator runs it ---------------------

function runCli(args) {
  const result = spawnSync(process.execPath, [GOLIVE_CLI, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
  return { status: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function fixture(name, values) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-mpesa-golive-'));
  const file = path.join(dir, name);
  // Fixtures live in the system temp folder, never in the repository: fake keys
  // committed next to real ones teach nobody which is which.
  fs.writeFileSync(file, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`);
  return file;
}

check('the go-live CLI reports a broken live config without printing a value', () => {
  const broken = runCli([
    '--from',
    fixture(
      'broken.env',
      liveConfig({
        DARAJA_BASE_URL: SANDBOX_HOST,
        DARAJA_SHORTCODE: '17439',
        MPESA_CALLBACK_TOKEN: 'aDifferentCallbackTokenMustNeverBePrinted99',
        MPESA_TRANSACTION_TYPE: 'PayToBusiness',
      })
    ),
    '--verbose',
    '--json',
  ]);
  assert(broken.status === 2, `exit ${broken.status}, expected 2 for a not-ready config`);
  assert(/"ready": false/.test(broken.out), `no machine-readable verdict:\n${broken.out}`);
  assert(/SUMMARY environment=production ready=no/.test(broken.out), `no SUMMARY line:\n${broken.out}`);
  assert(!FAKES.some((value) => broken.out.includes(value)), 'the CLI printed a secret value');
  assert(!/supabase (secrets|functions)/.test(broken.out), 'a read-only run touched the deployment');
});

check('the go-live CLI is ready-clean on a complete live file', () => {
  const clean = runCli(['--from', fixture('live.env', liveConfig())]);
  assert(clean.status === 0, `exit ${clean.status}:\n${clean.out}`);
  assert(/SUMMARY environment=production ready=yes problems=0/.test(clean.out), clean.out);
  assert(!FAKES.some((value) => clean.out.includes(value)), 'the CLI printed a secret value');
});

check('the go-live CLI refuses the mistakes that matter', () => {
  assert(/committed to git/.test(runCli(['--from', '.env.example']).out), 'a secrets file inside the repository was accepted');
  assert(/--from/.test(runCli(['--apply', '--project-ref', 'projectref']).out), 'the CLI would deploy without a keys file');
  assert(/Apply refused/.test(runCli(['--from', fixture('bad.env', { MPESA_ENV: 'production' }), '--apply', '--project-ref', 'projectref']).out), 'the CLI applied a failing audit');
  assert(/must be sandbox or production/.test(runCli(['--env', 'staging']).out), 'an unknown environment name was accepted');
});

// --- 2 + 3. trust boundary and wiring -----------------------------------

const pushSource = read(PUSH);
const callbackSource = read(CALLBACK);
const clientSource = read(CLIENT);
const purchasesSource = read(PURCHASES);
const paywallSource = read(PAYWALL);
const migrationSource = read(MIGRATION);
const flagCatalog = JSON.parse(read(FLAGS));

check('Daraja endpoints match the Safaricom URL contract', () => {
  const shared = read(SHARED);
  assert(/`\$\{baseUrl\(\)\}\/oauth\/v1\/generate\?grant_type=client_credentials`/.test(shared), 'OAuth must be /oauth/v1/generate (no /mpesa prefix) on sandbox and production');
  assert(!/\/mpesa\/oauth\//.test(shared), 'a /mpesa/oauth path 404s — every token fetch would fail');
  assert(/\/mpesa\/stkpush\/v1\/processrequest/.test(pushSource), 'STK Push must be /mpesa/stkpush/v1/processrequest');
  assert(/\/mpesa\/stkpushquery\/v1\/query/.test(pushSource), 'STK Query must be /mpesa/stkpushquery/v1/query, not /processrequest');
});

check('the learner cannot name an amount — the server prices the push', () => {
  assert(/Amount: plan\.amountKes/.test(pushSource), 'mpesa-push no longer sends the catalog amount');
  assert(!/body\.amount/i.test(pushSource), 'mpesa-push reads an amount from the request body');
  assert(/amount_kes: plan\.amountKes/.test(pushSource), 'the ledger row must store the server price');
  assert(!/amountKes/.test(clientSource), 'lib/mpesa.ts must not send an amount to the function');
  assert(/action: 'start', phone: normalized, plan: MPESA_PLAN/.test(clientSource), 'the client request body changed — re-check that it still carries only a phone and a plan key');
});

check('the app never writes the premium flag from an M-Pesa path', () => {
  assert(!/from\('profiles'\)\.update/.test(clientSource), 'lib/mpesa.ts must not write profiles');
  assert(!/is_premium\s*[:=]\s*true/.test(clientSource), 'lib/mpesa.ts must not grant premium locally');
});

check('M-Pesa is offered on Android only (App Store rule 3.1.1)', () => {
  assert(/Platform\.OS !== 'android'/.test(clientSource), 'lib/mpesa.ts lost its Android gate');
  assert(/mpesaAvailable\(\)/.test(clientSource) && /isFlagOn\('mpesa_premium'/.test(clientSource), 'availability must also respect the release flag');
  assert(/!isPremium && mpesaOn/.test(paywallSource), 'the paywall card is no longer gated');
});

check('only a signed-in learner can push, and only to their own checkout', () => {
  assert(/if \(!userId\) return json\(\{ error: 'Sign in to pay with M-Pesa.' \}, 401\)/.test(pushSource), 'mpesa-push stopped requiring a session');
  assert(/Not your checkout\.' \}, 403/.test(pushSource), 'mpesa-push stopped checking checkout ownership');
  assert(/MAX_PENDING_PER_WINDOW/.test(pushSource), 'the STK Push rate limit disappeared');
});

check('the unauthenticated callback is token-gated and fails closed', () => {
  assert(/MPESA_CALLBACK_TOKEN/.test(callbackSource), 'callback stopped requiring a token');
  assert(/safeEqual\(supplied, expected\)/.test(callbackSource), 'callback stopped comparing tokens safely');
  assert(/if \(!expected\)/.test(callbackSource), 'callback must refuse everything when the secret is unset');
  assert(/paidAmountKes: paidAmount/.test(callbackSource), 'callback no longer reports the paid amount');
});

check('deploy flags are stated per function (verify_jwt is sticky)', () => {
  assert(/deploy mpesa-push --no-verify-jwt=false/.test(pushSource), 'mpesa-push must require a JWT');
  assert(/deploy mpesa-callback --no-verify-jwt\b/.test(callbackSource), 'mpesa-callback must be deployed without JWT verification');
});

check('the ledger table is readable by its owner and writable only by the server', () => {
  const policies = migrationSource.match(/create policy[\s\S]*?;/gi) || [];
  assert(policies.length > 0, 'no RLS policy found in the M-Pesa migration');
  for (const policy of policies) {
    assert(/for select/i.test(policy), `a client-writable policy would let a learner self-grant premium:\n${policy}`);
  }
  assert(/alter table public\.mpesa_checkouts enable row level security/i.test(migrationSource), 'RLS is not enabled');
  assert(/auth\.uid\(\) = user_id/.test(migrationSource), 'learners must only read their own rows');
  assert(/grant select on public\.mpesa_checkouts to authenticated/i.test(migrationSource), 'clients lost read access');
  assert(!/grant (insert|update|delete)[\s\S]{0,80}to (authenticated|anon)/i.test(migrationSource), 'clients were granted a write');
  assert(/checkout_request_id text unique/i.test(migrationSource), 'CheckoutRequestID must be unique for idempotency');
  assert(/check \(status in \('pending', 'confirmed', 'failed', 'expired'\)\)/i.test(migrationSource), 'status is no longer a closed set');
  assert(/check \(amount_kes > 0\)/i.test(migrationSource), 'a zero or negative amount must be impossible in the ledger');
});

check('the release flag ships dark and its metric events are emitted', () => {
  const flag = flagCatalog.find((entry) => entry.key === 'mpesa_premium');
  assert(flag, 'mpesa_premium missing from the flag catalog');
  assert(flag.enabled === false || flag.rolloutPct === 0, 'a payment rail must not ship rolled out');
  assert(/track\('mpesa_checkout_started'/.test(paywallSource), 'the flag metric event is not emitted');
  assert(/track\('mpesa_checkout_failed'/.test(paywallSource), 'the flag guardrail event is not emitted');
  assert(!/track\([^\n]*phone/i.test(paywallSource) && !/track\([^\n]*setPhone/.test(paywallSource), 'a phone number must never enter telemetry');
});

check('a store answer cannot demote a live M-Pesa period', () => {
  assert(/mpesaPremiumLive\(\)/.test(purchasesSource), 'refreshPremiumStatus stopped consulting the M-Pesa ledger');
  assert(/entitled \|\| \(await mpesaPremiumLive\(\)\)/.test(purchasesSource), 'the demotion guard changed shape — re-read the rule');
});

check('the rail is registered, documented and safe to run without secrets', () => {
  assert(/check:mpesa/.test(read(PACKAGE)), 'npm script missing');
  const gates = JSON.parse(read(GATES)).gates.map((gate) => gate.command);
  assert(gates.some((command) => command.includes('check-mpesa.cjs')), 'gate not registered in gates.json');
  assert(/mpesa-push/.test(read(README)) && /mpesa-callback/.test(read(README)), 'README must list both functions');
  assert(/DARAJA_CONSUMER_KEY/.test(read(README)), 'README must name the Daraja secrets');
  assert(/DARAJA_CONSUMER_KEY/.test(read(ENV_EXAMPLE)), '.env.example must document the secret names');
  assert(/DARAJA_CONSUMER_SECRET=\s*$/m.test(read(ENV_EXAMPLE)), '.env.example must not carry a secret value');
  assert(/https:\/\/sandbox\.safaricom\.co\.ke/.test(read(SHARED)), 'the sandbox endpoint must be the default');
  assert(!/api\.safaricom\.co\.ke/.test(read(CLIENT)), 'the production Daraja host must never be hardcoded in the app');
});

check('the live host is allowlisted in the functions and absent from the app', () => {
  const shared = read(SHARED);
  assert(/PRODUCTION_BASE_URL = 'https:\/\/api\.safaricom\.co\.ke'/.test(shared), 'the production Daraja host is not a named constant in _shared/mpesa.ts');
  assert(/SANDBOX_BASE_URL = 'https:\/\/sandbox\.safaricom\.co\.ke'/.test(shared), 'the sandbox Daraja host is not a named constant');
  assert(/SANDBOX_SHORTCODES/.test(shared), 'the sandbox test paybill is not known to the audit');
});

check('mpesa-push takes the Daraja type and reference from config, and asks the audit first', () => {
  assert(/TransactionType: transactionType\(\)/.test(pushSource), 'mpesa-push hardcoded a transaction type again — a till-number deployment would fail every push');
  assert(/AccountReference: accountReference\(\)/.test(pushSource), 'mpesa-push hardcoded the account reference again');
  assert(!/'CustomerPayBillOnline'/.test(pushSource), 'the paybill literal is back in the push body');
  assert(/const report = audit\(\)/.test(pushSource), 'mpesa-push sends a push without consulting the audit');
  assert(/!report\.ready/.test(pushSource) && /503/.test(pushSource), 'a push the audit refuses must come back as a 503, not a silent failure');
  assert(/environment: environment\(\)/.test(pushSource), 'the deployed function does not say which Daraja it is talking to');
  assert(!/console\.(log|error)\([^)]*(config\.passkey|consumerSecret|FAKE)/.test(pushSource), 'a push log line could print a secret');
});

check('the go-live path is a script, a doc and an npm command', () => {
  assert(fs.existsSync(GOLIVE_CLI), 'scripts/mpesa-golive.cjs is missing');
  assert(/"mpesa:golive": "node scripts\/mpesa-golive\.cjs"/.test(read(PACKAGE)), 'npm run mpesa:golive is not in package.json');
  assert(/mpesa:golive/.test(read(README)), 'README must tell the operator how to go live');
  assert(/mpesa:golive/.test(read(PAYWALL_DOC)), 'docs/paywall-setup.md must carry the go-live runbook');

  const envExample = read(ENV_EXAMPLE);
  assert(/MPESA_ENV=/.test(envExample), '.env.example must document MPESA_ENV');
  assert(/MPESA_TRANSACTION_TYPE=/.test(envExample), '.env.example must document MPESA_TRANSACTION_TYPE');
  assert(/MPESA_ACCOUNT_REFERENCE=/.test(envExample), '.env.example must document MPESA_ACCOUNT_REFERENCE');
  assert(/api\.safaricom\.co\.ke/.test(envExample), '.env.example must name the live host so the switch is not folklore');
  assert(!/DARAJA_PASSKEY=\S/.test(envExample), '.env.example must not carry a passkey value');
});

check('the price the app advertises is the price the server charges', () => {
  assert(
    clientSource.includes(`MPESA_PRICE_LABEL = 'KSh ${mpesa.ADVERTISED_AMOUNT_KES}/mo'`),
    `the paywall card says ${clientSource.match(/MPESA_PRICE_LABEL = '[^']+'/)?.[0]} while the server charges ${mpesa.ADVERTISED_AMOUNT_KES}`
  );
});

(async () => {
  for (const { name, fn } of queue) {
    try {
      await fn();
      console.log(`[ok] ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
    }
  }
  if (failures > 0) {
    console.error(`\nM-Pesa checks failed: ${failures}`);
    process.exit(1);
  }
  console.log('M-Pesa rail checks passed.');
})();
