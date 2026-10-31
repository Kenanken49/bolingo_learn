#!/usr/bin/env node
/* global process, __dirname, require, console */
/**
 * Quality-operations regression gate.
 *
 * The blueprint only stays true if it is checked. This script locks in:
 *   - the gate registry (unique ids, real commands, blocking gates);
 *   - feature flags (weights, rollout bounds, SQL seed parity);
 *   - deterministic, sticky A/B assignment with a 50/50 sanity band;
 *   - telemetry redaction (emails, prompts, transcripts never survive);
 *   - the migration's security model (RLS on every table, admin-only reads,
 *     a guard trigger so nobody can self-promote);
 *   - CI workflows that actually block and publish;
 *   - the owner console wiring (route, Settings entry, telemetry init).
 *
 * Runs inside `npm test` and inside the published quality gate.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const gatesRegistry = JSON.parse(read('content/quality/gates.json'));
const flagsCatalog = JSON.parse(read('content/quality/flags.json'));
const sql = read('supabase/migrations_quality_ops.sql');
const qualityWorkflow = read('.github/workflows/quality-gate.yml');
const engineerWorkflow = read('.github/workflows/engineer-audit.yml');
const layout = read('src/app/_layout.tsx');
const settings = read('src/app/settings.tsx');
const telemetry = read('lib/telemetry.ts');
const featureFlags = read('lib/featureFlags.ts');
const notify = read('supabase/functions/_shared/notify.ts');
const actions = read('supabase/functions/_shared/actions.ts');
const agent = read('supabase/functions/_shared/engineerAgent.ts');
const agentEntry = read('supabase/functions/engineer-agent/index.ts');
const reviewEntry = read('supabase/functions/review-approval/index.ts');
const packageJson = JSON.parse(read('package.json'));

const {
  assignFlag,
  bucketFor,
  computePlatformHealth,
  sanitizeErrorMessage,
  sanitizeTelemetryProps,
  summarizeGates,
  variantWeightsValid,
} = require('../lib/qualityMath.ts');

/* ---- Gate registry ---- */
const gates = gatesRegistry.gates;
check(Array.isArray(gates) && gates.length >= 18, `Expected at least 18 gates, found ${gates?.length ?? 0}.`);
const gateIds = new Set();
for (const gate of gates) {
  const at = `Gate ${gate.id ?? '(missing id)'}`;
  check(Boolean(gate.id) && !gateIds.has(gate.id), `${at}: duplicate or empty id.`);
  gateIds.add(gate.id);
  check(Boolean(gate.label) && Boolean(gate.category), `${at}: missing label/category.`);
  check(typeof gate.command === 'string' && gate.command.length > 0, `${at}: missing command.`);
  check(gate.required !== false, `${at}: core gates must be blocking (required: true).`);
  check(Number(gate.timeoutSeconds) >= 10, `${at}: timeout is too small.`);
  const script = /^node (scripts\/[\w.-]+\.cjs)/.exec(gate.command);
  if (script) check(exists(script[1]), `${at}: command file ${script[1]} does not exist.`);
}
for (const required of ['typecheck', 'lint', 'quality-ops', 'curriculum']) {
  check(gateIds.has(required), `Gate registry must include the ${required} gate.`);
}
check(gateIds.has('quality-ops'), 'The quality-operations check must gate itself.');

/* ---- Feature flags ---- */
const flagKeys = new Set();
for (const flag of flagsCatalog) {
  const at = `Flag ${flag.key ?? '(missing)'}`;
  check(/^[a-z0-9_]{2,64}$/.test(String(flag.key ?? '')), `${at}: key must be lower_snake_case.`);
  check(!flagKeys.has(flag.key), `${at}: duplicate key.`);
  flagKeys.add(flag.key);
  check(['release', 'experiment', 'ops'].includes(flag.type), `${at}: unknown type ${flag.type}.`);
  check(typeof flag.enabled === 'boolean', `${at}: enabled must be boolean.`);
  check(Number(flag.rolloutPct) >= 0 && Number(flag.rolloutPct) <= 100, `${at}: rollout out of range.`);
  check(variantWeightsValid(flag.variants), `${at}: variant weights must total 100.`);
  check(flag.name && flag.description, `${at}: needs a name and description.`);
  if (flag.type === 'experiment') {
    check(Boolean(flag.metric), `${at}: experiments need a success metric.`);
    check(Boolean(flag.hypothesis), `${at}: experiments need a written hypothesis.`);
    check(Array.isArray(flag.variants) && flag.variants.length >= 2, `${at}: experiments need a control and a variant.`);
  }
  check(sql.includes(`'${flag.key}'`), `${at}: missing from the Supabase seed migration.`);
}
check(flagsCatalog.some((flag) => flag.type === 'experiment'), 'At least one experiment must ship enabled.');

/* ---- Deterministic assignment ---- */
const half = { key: 'half', enabled: true, rolloutPct: 100, variants: [{ key: 'a', weight: 50 }, { key: 'b', weight: 50 }] };
const first = assignFlag(half, 'learner-1');
check(assignFlag(half, 'learner-1').variant === first.variant, 'Assignment must be sticky for the same audience.');
check(first.exposed === true, 'A 100% rollout must expose the audience.');
check(assignFlag({ ...half, rolloutPct: 0 }, 'learner-1').exposed === false, 'A 0% rollout must not expose anyone.');
check(assignFlag({ ...half, enabled: false }, 'learner-1').exposed === false, 'A disabled flag must not expose anyone.');

let variantA = 0;
const sample = 4000;
for (let i = 0; i < sample; i += 1) {
  if (assignFlag(half, `learner-${i}`).variant === 'a') variantA += 1;
}
const share = variantA / sample;
check(share > 0.45 && share < 0.55, `50/50 split drifted: variant A got ${(share * 100).toFixed(1)}%.`);
check(bucketFor('same-input') === bucketFor('same-input'), 'Bucketing must be pure.');
check(bucketFor('a') !== bucketFor('b'), 'Different inputs should not collapse to one bucket.');

/* ---- Telemetry redaction ---- */
const scrubbed = sanitizeTelemetryProps({
  email: 'learner@example.com',
  prompt: 'Say asante',
  question: 'What is thank you?',
  answer: 'asante',
  transcript: 'a long transcript',
  freeText: 'anything',
  lessonId: 'html-final',
  score: 87.5,
  ok: true,
  note: 'contact me at learner@example.com or 1234567890',
  nested: { token: 'secret-value', count: 2 },
  list: [1, 'fine', { deep: true }, null],
  infinite: Number.POSITIVE_INFINITY,
  huge: 'x'.repeat(500),
});
for (const blocked of ['email', 'prompt', 'question', 'answer', 'transcript', 'freeText']) {
  check(!(blocked in scrubbed), `Telemetry must drop the ${blocked} key.`);
}
check(scrubbed.lessonId === 'html-final', 'Telemetry must keep lesson ids.');
check(scrubbed.score === 87.5, 'Telemetry must keep numeric metrics.');
check(scrubbed.nested && !('token' in scrubbed.nested), 'Telemetry must drop nested secrets.');
check(scrubbed.nested && scrubbed.nested.count === 2, 'Telemetry must keep nested metrics.');
check(!('infinite' in scrubbed), 'Telemetry must drop non-finite numbers.');
check(String(scrubbed.note).includes('[redacted]'), 'Telemetry must scrub emails and long numbers in strings.');
check(String(scrubbed.huge).length <= 240, 'Telemetry must truncate oversized strings.');
check(Array.isArray(scrubbed.list) && scrubbed.list.length <= 2, 'Telemetry must bound arrays.');
check(sanitizeErrorMessage(new Error('GET https://x.test/path?token=abc123 failed for a@b.com')).includes('[url]'), 'Error messages must strip URLs.');
check(!sanitizeErrorMessage('a@b.com').includes('a@b.com'), 'Error messages must strip emails.');
check(telemetry.includes('sanitizeTelemetryProps'), 'telemetry.ts must route every property through the scrubber.');
check(telemetry.includes('getTelemetryOn'), 'telemetry.ts must honor the learner opt-out.');
check(!/EXPO_PUBLIC_(?!TELEMETRY_DISABLED)/.test(telemetry), 'telemetry.ts must not read client-visible secrets.');

/* ---- Health + gate summary math ---- */
const healthy = computePlatformHealth({
  crashFreePct: 99.6,
  p95LatencyMs: 900,
  latestGateStatus: 'passed',
  hasTelemetry: true,
});
check(healthy.score === 100 && healthy.status === 'healthy', 'A clean signal must score 100 and read healthy.');
const broken = computePlatformHealth({
  crashFreePct: 92,
  p95LatencyMs: 5200,
  latestGateStatus: 'failed',
  hasTelemetry: true,
});
check(broken.score < 70 && broken.status === 'critical', 'A crash + red gate window must read critical.');
check(computePlatformHealth({}).status === 'unknown', 'No signal must read unknown, never healthy.');
check(computePlatformHealth({ hasTelemetry: true }).score < 100, 'Missing gates must cost signal.');
check(
  computePlatformHealth({ latestGateStatus: 'passed' }).status !== 'healthy',
  'A gate-only signal must not read healthy without session telemetry.'
);
const gateSummary = summarizeGates([
  { id: 'a', status: 'passed', required: true },
  { id: 'b', status: 'failed', required: true },
]);
check(gateSummary.status === 'failed' && gateSummary.failed === 1, 'A required failure must fail the summary.');
check(summarizeGates([]).status === 'not_run', 'No gates must read not_run.');
check(featureFlags.includes('assignFlag'), 'featureFlags.ts must use the shared deterministic assigner.');

/* ---- Migration security ---- */
const tables = [
  'quality_runs',
  'telemetry_events',
  'feature_flags',
  'quality_settings',
  'engineering_reports',
  'engineering_approvals',
  'notification_outbox',
];
for (const table of tables) {
  check(sql.includes(`public.${table}`), `Migration must define ${table}.`);
  check(
    new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i').test(sql),
    `${table} must enable row level security.`
  );
}
check(sql.includes('bolingolearn@pm.me'), 'Migration must pin the owner email for the founder claim.');
check(sql.includes('email_confirmed_at'), 'The founder claim must require a confirmed owner email.');
check(sql.includes("properties ->> 'fatal' = 'true'"), 'Crash-free must count fatal sessions, not every handled error.');
check(sql.includes('guard_profile_admin_flag'), 'Migration must guard is_admin against self-promotion.');
check(sql.includes('claim_founder_admin'), 'Migration must provide the founder claim function.');
check(sql.includes('with check (user_id is null or user_id = auth.uid())'), 'Telemetry inserts must be scoped to the caller.');
check(sql.includes('public.is_admin()'), 'Every admin policy must use is_admin().');
check(sql.includes('quality_overview'), 'Migration must expose the aggregate overview RPC.');
check(sql.includes('prune_telemetry'), 'Migration must include the retention function.');
check(!/grant\s+select[^;]*telemetry_events[^;]*\bto\b[^;]*\banon\b/i.test(sql), 'Anon must never read telemetry.');
check(!/grant\s+all[^;]*telemetry_events[^;]*\bto\b[^;]*\banon\b/i.test(sql), 'Anon must never receive broad telemetry grants.');
check(actions.includes("ALLOWED_SETTING_KEYS"), 'actions.ts must define the allowlist.');
check(actions.includes('release_freeze'), 'actions.ts must include the release-freeze control.');
check(notify.includes("DEFAULT_NOTIFY_EMAIL = 'bolingolearn@pm.me'"), 'Email must default to the owner address.');
check(notify.includes('NOTIFY_EMAIL_WEBHOOK_URL') && notify.includes('RESEND_API_KEY'), 'Email must support a provider-neutral webhook plus the reference adapter.');
check(notify.includes("status: 'skipped'"), 'Email must record skipped deliveries instead of pretending success.');
check(!/RESEND_API_KEY/.test(telemetry), 'Client code must never see the email key.');
check(agentEntry.includes('authenticateOwner') && agentEntry.includes('ENGINEER_CRON_SECRET'), 'engineer-agent must accept owner JWT or cron secret only.');
check(agentEntry.includes('is_admin'), 'engineer-agent must verify admin.');
check(reviewEntry.includes('sanitizeAction') && reviewEntry.includes('applyAction'), 'review-approval must re-validate actions.');
check(agent.includes('computePlatformHealth'), 'The agent must use the deterministic health score.');
check(agent.includes('fallbackReport'), 'The agent must run a rules report when the model is unavailable.');

/* ---- CI workflows ---- */
check(qualityWorkflow.includes('npm ci'), 'Quality workflow must install from the lockfile.');
check(qualityWorkflow.includes('run-quality-gates.cjs --publish'), 'Quality workflow must run the gate runner and publish.');
check(qualityWorkflow.includes('pull_request'), 'Quality workflow must run on pull requests.');
check(qualityWorkflow.includes('--publish'), 'Quality workflow must publish the run to the owner dashboard.');
check(engineerWorkflow.includes('schedule') && engineerWorkflow.includes('x-engineer-cron-secret'), 'Engineer workflow must be scheduled and use the scoped secret.');

/* ---- Console wiring ---- */
check(exists('src/app/admin.tsx') && layout.includes('name="admin"'), 'The owner console route must exist and be registered.');
check(settings.includes("'/admin'"), 'Settings must link to the owner console.');
check(settings.includes('Anonymous diagnostics'), 'Settings must expose the telemetry opt-out.');
check(layout.includes('initTelemetry') && layout.includes('trackScreen'), 'The root layout must initialize telemetry and screen views.');
check(exists('docs/quality-operations.md'), 'docs/quality-operations.md must document the system.');

/* ---- Package scripts ---- */
check(packageJson.scripts.gate === 'node scripts/run-quality-gates.cjs', 'npm run gate must call the runner.');
check(
  String(packageJson.scripts.test).includes('check-quality-ops.cjs'),
  'npm test must include the quality-operations check.'
);

if (failures.length > 0) {
  console.error('Quality-operations check failed:');
  for (const failure of failures) console.error(`  x ${failure}`);
  process.exit(1);
}

const experimentCount = flagsCatalog.filter((flag) => flag.type === 'experiment').length;
console.log(
  `Quality operations OK — ${gates.length} gates (${gateIds.size} unique), ${flagsCatalog.length} flags ` +
    `(${experimentCount} experiment), ${tables.length} RLS tables, 2 CI workflows.`
);
console.log(
  `A/B math: sticky buckets, 50/50 share ${(share * 100).toFixed(1)}%, rollout floors enforced, telemetry scrub verified.`
);
