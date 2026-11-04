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
const path = require('node:path');
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
