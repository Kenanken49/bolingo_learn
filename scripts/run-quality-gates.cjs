#!/usr/bin/env node
/* global process, __dirname, require, module, fetch, console */
/**
 * One command for every release gate.
 *
 * Reads content/quality/gates.json, runs each gate in a real child process,
 * writes .quality/last-run.json (and a readable .md), and can publish the run
 * to Supabase so the owner dashboard sees the same result CI saw.
 *
 *   node scripts/run-quality-gates.cjs
 *   node scripts/run-quality-gates.cjs --only=typecheck,curriculum
 *   node scripts/run-quality-gates.cjs --publish
 *   node scripts/run-quality-gates.cjs --publish --require-publish
 *
 * Required-gate failures always exit non-zero. Publishing is best-effort
 * unless --require-publish is passed.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, '.quality');
const REGISTRY_PATH = path.join(ROOT, 'content', 'quality', 'gates.json');

const args = process.argv.slice(2);
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const only = onlyArg
  ? new Set(
      onlyArg
        .slice('--only='.length)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
  : null;
const publish = args.includes('--publish');
const requirePublish = args.includes('--require-publish');

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const gates = registry.gates.filter((gate) => !only || only.has(gate.id));

if (gates.length === 0) {
  console.error('No gates selected. Check --only ids against content/quality/gates.json.');
  process.exit(2);
}

function runGit(gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function tail(text, lines = 40, chars = 6000) {
  const clipped = String(text || '')
    .split(/\r?\n/)
    .slice(-lines)
    .join('\n');
  return clipped.slice(-chars);
}

const isActions = process.env.GITHUB_ACTIONS === 'true';

// Workflow commands travel through stdout, so their payload cannot carry raw
// newlines or percent signs (GitHub unescapes %0A / %0D / %25 / %3A / %2C).
const escapeData = (text) =>
  String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) =>
  escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

// GitHub shows at most 10 error annotations per step, so a broad failure spends
// the last slot on the gates it could not name individually.
const ANNOTATION_LIMIT = 10;

/** A red job names its failing gate on the run page, which stays readable when
 * the raw log needs a token. The title carries the verdict, so the body is only
 * what the title cannot say. */
function annotate(result) {
  const state = result.timedOut ? 'timed out' : `exit ${result.exitCode}`;
  const body = [`${result.label} (${state}) · ${result.command}`, tail(result.outputTail, 12, 1400)]
    .filter(Boolean)
    .join('\n');
  console.log(`::error title=${escapeProperty('quality gate ' + result.id + ' failed')}::${escapeData(body)}`);
}

function annotateFailures(failed) {
  if (!isActions) return;
  const named = failed.length > ANNOTATION_LIMIT ? failed.slice(0, ANNOTATION_LIMIT - 1) : failed;
  named.forEach(annotate);
  if (named.length < failed.length) {
    const rest = failed.slice(named.length).map((gate) => gate.id);
    console.log(
      `::error title=${escapeProperty(`quality gate: ${rest.length} more failed`)}::${escapeData(
        `${rest.join(', ')} — full report in the job summary and the quality-report artifact.`
      )}`
    );
  }
}

const startedAt = new Date();
const commitSha = runGit(['rev-parse', 'HEAD']);
const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';
const environment = process.env.QUALITY_ENV || (process.env.CI ? 'ci' : 'local');

console.log('');
console.log(`Bolingo Learn quality gate · ${environment} · ${branch}${commitSha ? ` @ ${commitSha.slice(0, 8)}` : ''}`);
console.log(`${gates.length} gates · required failures block the release`);
console.log('');

const results = [];
for (let index = 0; index < gates.length; index += 1) {
  const gate = gates[index];
  const at = `[${String(index + 1).padStart(2, '0')}/${gates.length}]`;
  process.stdout.write(`${at} ${gate.label.padEnd(30)} `);
  const started = Date.now();
  const result = spawnSync(gate.command, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    timeout: Math.max(10, Number(gate.timeoutSeconds) || 120) * 1000,
    env: {
      ...process.env,
      CI: process.env.CI || '1',
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
  });
  const durationMs = Date.now() - started;
  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  const status = result.status === 0 && !timedOut ? 'passed' : 'failed';
  const duration = `${(durationMs / 1000).toFixed(1)}s`;
  console.log(`${status === 'passed' ? 'PASS' : 'FAIL'} ${duration}`);
  if (status === 'failed') {
    console.log(
      tail(
        timedOut ? `${output}\nTimed out after ${gate.timeoutSeconds}s.` : output,
        18,
        3000
      )
        .split('\n')
        .map((line) => `      ${line}`)
        .join('\n')
    );
  }
  results.push({
    id: gate.id,
    label: gate.label,
    category: gate.category,
    required: gate.required !== false,
    command: gate.command,
    status,
    exitCode: typeof result.status === 'number' ? result.status : null,
    timedOut,
    durationMs,
    outputTail: tail(output, 40, 6000),
  });
}

const finishedAt = new Date();
const failed = results.filter((gate) => gate.status === 'failed');
annotateFailures(failed);
const requiredFailures = failed.filter((gate) => gate.required);
const passed = results.length - failed.length;
const summary = {
  total: results.length,
  passed,
  failed: failed.length,
  skipped: 0,
  status: requiredFailures.length > 0 ? 'failed' : failed.length > 0 ? 'warn' : 'passed',
};
const report = {
  schemaVersion: 1,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  environment,
  branch,
  commitSha,
  status: summary.status,
  summary,
  gates: results,
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, 'last-run.json'), `${JSON.stringify(report, null, 2)}\n`);

const table = results
  .map(
    (gate) =>
      `| ${gate.status === 'passed' ? 'PASS' : 'FAIL'} | ${gate.label} | ${gate.category} | ${(gate.durationMs / 1000).toFixed(1)}s |`
  )
  .join('\n');
const markdown = [
  `# Quality gate — ${summary.status.toUpperCase()}`,
  '',
  `- Environment: ${environment}`,
  `- Branch: ${branch}`,
  `- Commit: ${commitSha || 'unknown'}`,
  `- Started: ${report.startedAt}`,
  `- Duration: ${(report.durationMs / 1000).toFixed(1)}s`,
  `- Result: ${passed}/${results.length} passed, ${failed.length} failed`,
  '',
  '| Result | Gate | Category | Time |',
  '| --- | --- | --- | --- |',
  table,
  '',
  requiredFailures.length > 0
    ? `Required gates failed: ${requiredFailures.map((gate) => gate.id).join(', ')}`
    : 'Every required gate passed.',
  '',
  ...failed.flatMap((gate) => [
    `## ${gate.id} — ${gate.label}`,
    '',
    '````sh',
    gate.command,
    '````',
    '',
    '````',
    gate.outputTail || '(no output)',
    '````',
    '',
  ]),
].join('\n');
fs.writeFileSync(path.join(REPORT_DIR, 'last-run.md'), markdown);

// The job summary and the uploaded .quality/ report carry the same table, so a
// failed CI run is diagnosed from its own page instead of the raw log.
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  } catch (error) {
    console.error(`Could not write the job summary: ${error instanceof Error ? error.message : error}`);
  }
}

console.log('');
console.log(
  `Quality gate ${summary.status.toUpperCase()} — ${passed}/${results.length} passed in ${(report.durationMs / 1000).toFixed(1)}s`
);
console.log(`Report: ${path.relative(ROOT, path.join(REPORT_DIR, 'last-run.json'))}`);

async function publishRun() {
  const url = (process.env.QUALITY_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.QUALITY_SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    const message =
      'Publishing skipped: set QUALITY_SUPABASE_URL and QUALITY_SUPABASE_SERVICE_ROLE_KEY.';
    if (requirePublish) {
      console.error(message);
      process.exitCode = 1;
    } else {
      console.log(message);
    }
    return;
  }
  const row = {
    commit_sha: commitSha || null,
    branch,
    environment,
    status: summary.status,
    duration_ms: report.durationMs,
    summary,
    gates: results,
    source: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
  };
  try {
    const response = await fetch(`${url}/rest/v1/quality_runs`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error(`Supabase responded ${response.status}: ${await response.text()}`);
    }
    console.log('Published the run to the owner dashboard.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (requirePublish) {
      console.error(`Publishing failed: ${message}`);
      process.exitCode = 1;
    } else {
      console.log(`Publishing skipped: ${message}`);
    }
  }
}

if (publish) {
  publishRun().finally(() => {
    if (requiredFailures.length > 0) process.exitCode = 1;
  });
} else if (requiredFailures.length > 0) {
  process.exitCode = 1;
}
