#!/usr/bin/env node
/**
 * Is the file we serve still the file we published?
 *
 * `public/downloads/latest.json` is a claim: version 1.0.1, build 2,
 * 172,300,714 bytes, sha256 95c869…. That claim lives in git. The bytes it
 * describes live on a Coolify volume at `/var/data/app-downloads` — outside
 * git, rewritten by whoever copies a file there, restores a backup, or
 * re-creates the volume. Nothing else in this suite watches that gap, and a
 * drifted file is not a cosmetic problem: learners get an install that fails
 * the store's checksum verification, or an APK that installs and is not the
 * build we signed.
 *
 * So this gate compares the published record with the served artifact. It is
 * the suite's first live-network gate: every other gate is hermetic and cannot
 * see production at all.
 *
 * It does not download 172 MB to hash it. The server hashes the file it serves
 * (`GET /api/release-integrity`, token-gated, single-flight, cached for 60s),
 * because those bytes are already on that disk — CI moves a few hundred bytes
 * and gets the same arithmetic. Without the token the gate falls back to
 * streaming the whole file itself (bounded by
 * BOLINGO_RELEASE_STREAM_BUDGET_MS); that is the same guarantee, just slow, and
 * a full-file hash is the only honest answer, so nothing here samples ranges
 * and calls it verified.
 *
 * Fails when:
 *   - the live record differs from the record in git for the same release
 *     (size, sha256, fileName, package, url), or production is *ahead* of every
 *     commit in this repo;
 *   - the volume's file is not the size or the hash the record promises, or is
 *     not on the volume at all;
 *   - `/download/android` redirects (the binary left the release volume, so the
 *     thing we verified is not the thing learners fetch);
 *   - the download headers lie about the artifact, or the record is cacheable.
 *
 * Warns when production is *behind* git: that is the normal state between
 * merging a release PR and deploying it, and red CI would block the very
 * deploy that fixes it.
 *
 *   node scripts/check-release-artifact.cjs
 *   BOLINGO_SITE_URL=http://127.0.0.1:4820 node scripts/check-release-artifact.cjs
 *   BOLINGO_INTEGRITY_TOKEN=… node scripts/check-release-artifact.cjs
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

// The same parser the installed app uses to accept an update. "A valid record"
// here must mean exactly what it means on a phone, not what a looser reader
// would tolerate.
if (!require.extensions['.ts']) {
  const ts = require('typescript');
  require.extensions['.ts'] = (module, filename) => {
    module._compile(
      ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      }).outputText,
      filename,
    );
  };
}

const { parseRelease, compareVersions } = require('../lib/releaseManifest.ts');

const base = (process.env.BOLINGO_SITE_URL || 'https://bolingo.co.ke').replace(/\/+$/, '');
const recordUrl = `${base}/downloads/latest.json`;
const apkUrl = `${base}/download/android`;
const integrityUrl = `${base}/api/release-integrity`;
const integrityToken = String(process.env.BOLINGO_INTEGRITY_TOKEN || '').trim();
const headerTimeoutMs = Number(process.env.BOLINGO_RELEASE_HEADER_TIMEOUT_MS || 30_000);
const streamBudgetMs = Number(process.env.BOLINGO_RELEASE_STREAM_BUDGET_MS || 15 * 60_000);
const committedPath = path.join(__dirname, '..', 'public', 'downloads', 'latest.json');
const startedAt = Date.now();

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
  console.error(`  ✗ ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`  ⚠ ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
  return !!condition;
}

function display(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function releaseName(record) {
  return `${record.version} (build ${record.buildNumber ?? '?'})`;
}

function megabytes(bytes) {
  return `${(Number(bytes) / 1_048_576).toFixed(1)} MB`;
}

/**
 * Parse with the shipped parser. It throws on a record the installed app would
 * refuse, which is the bar this gate has to use: a record a phone will not
 * accept is not a published release, whatever it says about its bytes.
 */
function parseRecord(text, where) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    fail(`${where} is not JSON: ${error.message}`);
    return null;
  }
  try {
    parseRelease(structuredClone(json));
  } catch (error) {
    fail(`${where} is not a record the installed app would accept: ${error.message}.`);
    return null;
  }
  if (!assert(/^[a-f0-9]{64}$/.test(String(json.sha256 || '')), `${where} publishes no sha256 (${display(json.sha256)}), so there is nothing to verify the served bytes against.`)) {
    return null;
  }
  if (!assert(Number(json.sizeBytes) > 0, `${where} publishes no size (${display(json.sizeBytes)}).`)) return null;
  return json;
}

/** The record committed to git — the claim this release is made of. */
function readRecordFile(file) {
  const relative = path.relative(process.cwd(), file) || file;
  if (!assert(fs.existsSync(file), `there is no release record in git at ${relative}. Publish one with scripts/publish-android-apk.cjs before checking a volume against it.`)) {
    return null;
  }
  return parseRecord(fs.readFileSync(file, 'utf8'), relative);
}

// ---------------------------------------------------------------------------
// The judgement, as pure functions — so it can be tested without a network
// ---------------------------------------------------------------------------

/** Record fields that describe the artifact itself. */
const ARTIFACT_FIELDS = ['packageName', 'fileName', 'sizeBytes', 'sha256', 'url'];

/**
 * Git's record vs the record production serves. Pure so the self-test below can
 * prove it catches drift, rather than only proving today's bytes match.
 */
function compareRelease(committed, live) {
  const problems = [];
  const notes = [];

  const versionOrder = compareVersions(String(live.version), String(committed.version));
  const buildOrder = Number(live.buildNumber) - Number(committed.buildNumber);
  const ahead = versionOrder > 0 || (versionOrder === 0 && buildOrder > 0);
  const behind = versionOrder < 0 || (versionOrder === 0 && buildOrder < 0);

  if (ahead) {
    problems.push(
      `production serves ${releaseName(live)} but no commit in this repo describes it (git has ${releaseName(committed)}). ` +
        'A release the repository cannot rebuild is not a release.',
    );
  } else if (behind) {
    notes.push(
      `git describes ${releaseName(committed)} while production still serves ${releaseName(live)} — ` +
        'normal between a merged release PR and its deploy.',
    );
  }

  if (versionOrder === 0 && buildOrder === 0) {
    for (const field of ARTIFACT_FIELDS) {
      if (display(committed[field]) === display(live[field])) continue;
      problems.push(
        `${field} changed for the same release ${releaseName(committed)}: git says ${display(committed[field])}, ` +
          `production says ${display(live[field])}.`,
      );
    }
  }

  return { problems, notes, sameRelease: versionOrder === 0 && buildOrder === 0 };
}

/**
 * The published record vs the artifact as actually served. `artifact` carries
 * what a reader of the bytes observed: `present`, `sizeBytes`, `sha256`, and
 * optionally `statSizeBytes` (what the filesystem claims) and `path`.
 */
function compareArtifact(record, artifact) {
  const problems = [];
  if (!artifact || artifact.present === false) {
    problems.push(`no APK on the release volume${artifact?.path ? ` at ${artifact.path}` : ''} for ${releaseName(record)}.`);
    return problems;
  }

  const observedSize = Number(artifact.sizeBytes);
  const promisedSize = Number(record.sizeBytes);
  if (!Number.isFinite(observedSize)) problems.push(`the served size is not a number: ${display(artifact.sizeBytes)}.`);
  else if (observedSize !== promisedSize) {
    problems.push(`the served APK is ${observedSize} bytes; the published size is ${promisedSize} (${megabytes(promisedSize)}).`);
  }

  const observedHash = String(artifact.sha256 || '').toLowerCase();
  const promisedHash = String(record.sha256 || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(observedHash)) problems.push(`the served sha256 is not a sha256: ${display(artifact.sha256)}.`);
  else if (observedHash !== promisedHash) {
    problems.push(
      `the served APK hashes to ${observedHash.slice(0, 12)}…; the published sha256 is ${promisedHash.slice(0, 12)}…. ` +
        'The release volume and the release record disagree: this is not the file that was signed.',
    );
  }

  if (artifact.statSizeBytes != null && Number(artifact.statSizeBytes) !== observedSize) {
    problems.push(`the read stopped short: ${observedSize} of ${artifact.statSizeBytes} bytes on disk were delivered.`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Self-test: prove the gate's judgement, offline, before touching the network
// ---------------------------------------------------------------------------

function selfTest() {
  const signed = {
    version: '1.0.1',
    buildNumber: 2,
    packageName: 'com.bolingo.learn',
    fileName: 'bolingo-learn-1.0.1.apk',
    sizeBytes: 172_300_714,
    sha256: '95c8692ed49260769783446d478269d1a8581b49b0baeb50e521f35b3c11779e',
    url: 'https://bolingo.co.ke/download/android',
    publishedAt: '2026-01-01T00:00:00.000Z',
    minAndroid: 24,
  };
  const volume = { present: true, path: `/var/data/app-downloads/${signed.fileName}`, sizeBytes: signed.sizeBytes, sha256: signed.sha256 };

  const releaseCases = [
    ['identical records', signed, signed, 0],
    ['size drifted on the volume', signed, { ...signed, sizeBytes: signed.sizeBytes - 1 }, 1],
    ['one hex character of the sha differs', signed, { ...signed, sha256: signed.sha256.slice(0, 62) + '00' }, 1],
    ['a different file name', signed, { ...signed, fileName: 'bolingo-learn-1.0.1-signed.apk' }, 1],
    ['a different package', signed, { ...signed, packageName: 'com.bolingo.learn.debug' }, 1],
    ['the download moved off the volume', signed, { ...signed, url: 'https://cdn.example.invalid/android.apk' }, 1],
    ['production is ahead of git', signed, { ...signed, buildNumber: 3 }, 1],
    ['production is a whole version ahead', signed, { ...signed, version: '1.0.1', buildNumber: 2 }, 1],
    ['production is behind git (pre-deploy)', { ...signed, version: '1.0.2', buildNumber: 3 }, signed, 0],
    ['production is ahead and renamed the file', signed, { ...signed, version: '1.0.2', buildNumber: 3, fileName: 'different.apk' }, 1],
    ['size and hash drifted together', signed, { ...signed, sizeBytes: 1, sha256: '0'.repeat(64) }, 2],
  ];
  // "production is a whole version ahead" needs a newer live version to be ahead.
  releaseCases[7] = ['production is a whole version ahead', signed, { ...signed, version: '1.1.0' }, 1];
  // A release that is still only in git must never be judged against an older
  // live record field by field: the files are meant to differ until it deploys.
  const preDeploy = compareRelease({ ...signed, version: '1.0.2', buildNumber: 3 }, { ...signed, fileName: 'other.apk', sizeBytes: 7 });
  assert(preDeploy.problems.length === 0, `self-test 「pre-deploy with a different older file」: expected no failures, got: ${preDeploy.problems.join(' ')}`);

  for (const [name, committed, live, expectedProblems] of releaseCases) {
    const { problems } = compareRelease(committed, live);
    assert(
      problems.length === expectedProblems,
      `self-test 「${name}」: expected ${expectedProblems} problem(s), got ${problems.length}${problems.length ? ` (${problems[0]})` : ''}.`,
    );
  }

  const behind = compareRelease({ ...signed, version: '1.0.2', buildNumber: 3 }, signed);
  assert(behind.notes.length === 1, 'self-test 「production is behind git」: expected one warning and no failure.');

  const artifactCases = [
    ['volume matches the record', signed, volume, 0],
    ['volume is one byte longer', signed, { ...volume, sizeBytes: signed.sizeBytes + 1 }, 1],
    ['volume hashes differently', signed, { ...volume, sha256: 'f'.repeat(64) }, 1],
    ['volume file is gone', signed, { present: false, path: volume.path }, 1],
    ['record has no hash at all', { ...signed, sha256: null }, volume, 1],
    ['truncated mid-file', signed, { ...volume, sizeBytes: 999_999, statSizeBytes: signed.sizeBytes }, 2],
    ['corrupted and short', signed, { ...volume, sha256: '0'.repeat(64), sizeBytes: 5, statSizeBytes: 6 }, 3],
  ];
  for (const [name, record, artifact, expectedProblems] of artifactCases) {
    const problems = compareArtifact(record, artifact);
    assert(
      problems.length === expectedProblems,
      `self-test 「${name}」: expected ${expectedProblems} problem(s), got ${problems.length}${problems.length ? ` (${problems[0]})` : ''}.`,
    );
  }

  return failures.length === 0;
}
// ---------------------------------------------------------------------------
// Hermetic proof: the endpoint's contract, on a fixture volume, offline
// ---------------------------------------------------------------------------

/**
 * Runs in its own node process because `DIST` and `APK_DIR` are resolved when
 * `server/index.mjs` is imported, so the fixture paths have to be in the
 * environment before that happens. It only reports what the server did; the
 * judgement stays in this file, where the self-test above covers it.
 */
const FIXTURE_TEST = String.raw`
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';

const root = process.env.FIXTURE_ROOT;
const dist = path.join(root, 'dist');
const volume = path.join(root, 'volume');
mkdirSync(path.join(dist, 'downloads'), { recursive: true });
mkdirSync(volume, { recursive: true });

const apk = Buffer.concat([
  Buffer.from('PK\x03\x04', 'latin1'),
  randomBytes(8192),
  Buffer.from('PK\x05\x06', 'latin1'),
]);
const fileName = 'bolingo-fixture-1.0.0.apk';
const record = {
  version: '1.0.0',
  buildNumber: 1,
  packageName: 'com.bolingo.learn',
  fileName,
  sizeBytes: apk.length,
  sha256: createHash('sha256').update(apk).digest('hex'),
  url: 'https://example.invalid/download/android',
  publishedAt: '2026-01-01T00:00:00.000Z',
  minAndroid: 24,
};
writeFileSync(path.join(volume, fileName), apk);
writeFileSync(path.join(dist, 'downloads', 'latest.json'), JSON.stringify(record));
writeFileSync(path.join(dist, 'index.html'), '<title>fixture</title>');

const { createBolingoServer } = await import(process.env.SERVER_MODULE);
const server = createBolingoServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const TOKEN = 'fixture-token';
const integrity = async (token) => {
  const res = await fetch(origin + '/api/release-integrity', {
    redirect: 'manual',
    headers: token ? { 'x-bolingo-integrity-token': token } : {},
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const out = { record, apkBytes: apk.length };
out.noToken = await integrity(null);
out.wrongToken = await integrity('definitely-not-it');
const posted = await fetch(origin + '/api/release-integrity', { method: 'POST', redirect: 'manual', headers: { 'x-bolingo-integrity-token': TOKEN } });
out.notGet = { status: posted.status, body: await posted.json().catch(() => null) };
process.env.BOLINGO_INTEGRITY_TOKEN = '';
out.unconfigured = await integrity(TOKEN);
process.env.BOLINGO_INTEGRITY_TOKEN = TOKEN;
out.clean = await integrity(TOKEN);

const ranged = await fetch(origin + '/download/android', { headers: { range: 'bytes=0-1' } });
out.ranged = {
  status: ranged.status,
  contentRange: ranged.headers.get('content-range'),
  received: (await ranged.arrayBuffer()).byteLength,
};
const liveRecord = await fetch(origin + '/downloads/latest.json');
out.recordCacheControl = liveRecord.headers.get('cache-control');

writeFileSync(path.join(volume, fileName), Buffer.concat([apk, Buffer.from(' appended by a human')]));
out.grown = await integrity(TOKEN);

await new Promise((resolve) => setTimeout(resolve, 20));
const other = Buffer.concat([
  Buffer.from('PK\x03\x04', 'latin1'),
  randomBytes(apk.length - 8),
  Buffer.from('PK\x05\x06', 'latin1'),
]);
writeFileSync(path.join(volume, fileName), other);
out.swapped = await integrity(TOKEN);

rmSync(path.join(volume, fileName));
out.gone = await integrity(TOKEN);

server.closeAllConnections?.();
await new Promise((resolve) => server.close(resolve));
console.log(JSON.stringify(out));
process.exitCode = 0;
`;

/** Ask the fixture server what it would say about a volume that moved. */
function fixtureObservations() {
  const { execFileSync } = require('node:child_process');
  const { pathToFileURL } = require('node:url');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-release-fixture-'));
  try {
    const stdout = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', FIXTURE_TEST],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          BOLINGO_DIST: path.join(root, 'dist'),
          BOLINGO_APK_DIR: path.join(root, 'volume'),
          BOLINGO_INTEGRITY_TOKEN: 'fixture-token',
          FIXTURE_ROOT: root,
          SERVER_MODULE: pathToFileURL(path.join(__dirname, '..', 'server', 'index.mjs')).href,
        },
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    return JSON.parse(stdout.slice(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function fixtureTest() {
  console.log('\nLocalhost proof that the check can see drift (no network involved)');
  let seen;
  try {
    seen = fixtureObservations();
  } catch (error) {
    const detail = String(error.stderr || error.message || '').trim().split('\n').slice(-3).join(' / ');
    if (/Cannot find package|ERR_MODULE_NOT_FOUND|require.*not supported|Unsupported/i.test(detail)) {
      console.log(`  · skipped: this node cannot load the server module (${error.message})`);
      return;
    }
    fail(`the local fixture could not run, so the gate cannot prove it detects drift: ${detail}`);
    return;
  }

  const record = seen.record;
  if (!parseRecord(JSON.stringify(record), 'the fixture record')) return;

  assert(seen.noToken?.status === 401, `fixture: /api/release-integrity answered ${seen.noToken?.status} with no token; it must demand one.`);
  assert(seen.wrongToken?.status === 401, `fixture: /api/release-integrity accepted a wrong token (${seen.wrongToken?.status}).`);
  assert(seen.notGet?.status === 405, `fixture: POST /api/release-integrity answered ${seen.notGet?.status}; measuring the release volume is a read, nothing else may ask for it.`);
  assert(seen.unconfigured?.status === 503, `fixture: with no token configured the endpoint answered ${seen.unconfigured?.status}; it must refuse to exist.`);

  assert(seen.clean?.status === 200, `fixture: the honest volume answered ${seen.clean?.status} (${JSON.stringify(seen.clean?.body || {}).slice(0, 160)}).`);
  assert(seen.clean?.body?.match === true, 'fixture: a volume that equals its record was not reported as a match.');
  assert(
    String(seen.clean?.body?.volume?.sha256) === record.sha256 && Number(seen.clean?.body?.volume?.sizeBytes) === record.sizeBytes,
    'fixture: the endpoint did not measure the file the fixture wrote.',
  );
  assert(
    path.basename(String(seen.clean?.body?.volume?.path || '')) === record.fileName,
    `fixture: the endpoint measured ${seen.clean?.body?.volume?.path}, not the ${record.fileName} the record names.`,
  );
  for (const field of ['version', 'buildNumber', 'sizeBytes', 'sha256', 'fileName']) {
    assert(
      String(seen.clean?.body?.record?.[field]) === String(record[field]),
      `fixture: the endpoint described a different release in \`${field}\` than the record it served.`,
    );
  }

  assert(seen.ranged?.status === 206, `fixture: a Range request on the served APK answered ${seen.ranged?.status}, not 206.`);
  assert(seen.ranged?.received === 2, `fixture: a bytes=0-1 range delivered ${seen.ranged?.received} bytes.`);
  assert(
    String(seen.ranged?.contentRange) === `bytes 0-1/${record.sizeBytes}`,
    `fixture: Content-Range said "${seen.ranged?.contentRange}", not "bytes 0-1/${record.sizeBytes}".`,
  );
  assert(/no-store/.test(String(seen.recordCacheControl || '')), `fixture: the record was served with Cache-Control "${seen.recordCacheControl}".`);

  // The drift we are here to catch, measured by this file's own judgement.
  const grown = compareArtifact(record, seen.grown?.body?.volume);
  assert(seen.grown?.body?.match === false, 'fixture: appending bytes to the APK still reported a match.');
  assert(
    grown.length === 2 && grown.some((problem) => /size/.test(problem)) && grown.some((problem) => /sha256/.test(problem)),
    `fixture: a longer file must read as one size problem and one hash problem, got: ${grown.join(' ')}`,
  );

  const swapped = compareArtifact(record, seen.swapped?.body?.volume);
  assert(
    swapped.length === 1 && /sha256/.test(swapped[0]),
    `fixture: a different file of the same length must read as exactly one hash problem, got: ${swapped.join(' ')}`,
  );

  const gone = compareArtifact(record, seen.gone?.body?.volume);
  assert(seen.gone?.body?.volume?.present === false, 'fixture: a deleted APK was not reported as missing from the volume.');
  assert(gone.length === 1 && /no APK/.test(gone[0]), `fixture: an empty volume must read as one missing-file problem, got: ${gone.join(' ')}`);

  if (failures.length === 0) {
    console.log(
      `  ✓ the endpoint demands a token, measures ${record.sizeBytes} bytes exactly, and reports a grown ` +
        'file, a swapped file and a missing file as the drift they are.',
    );
  }
}

// ---------------------------------------------------------------------------
// The live release
// ---------------------------------------------------------------------------

/** `fetch` for a check that must explain *why* the network failed, not just that. */
async function get(url, init, label) {
  try {
    return await fetch(url, { redirect: 'manual', cache: 'no-store', ...init });
  } catch (error) {
    const cause = error.cause || {};
    const code = error.name === 'TimeoutError' ? 'timed out' : cause.code || cause.errno || error.code || error.name;
    fail(`could not reach ${url} (${code}). ${label}`);
    return null;
  }
}

async function liveRelease() {
  const marked = failures.length;
  console.log(`\nThe release as published (${base})`);

  const committed = readRecordFile(committedPath);
  if (!committed) return null;

  const response = await get(recordUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(headerTimeoutMs) }, 'A release nobody can look up is not a release.');
  if (!response) return null;
  assert(response.status === 200, `GET ${recordUrl} answered ${response.status}${response.headers.get('location') ? ` → ${response.headers.get('location')}` : ''}.`);

  const cacheControl = String(response.headers.get('cache-control') || '');
  assert(
    /no-store/.test(cacheControl),
    `the live record is served as "${cacheControl || 'nothing'}"; a cached record is a cached release, and an app would keep offering a build that no longer exists.`,
  );

  const text = await response.text();
  const served = parseRecord(text, `the live record at ${recordUrl}`);
  if (!served) return null;

  const { problems, notes } = compareRelease(committed, served);
  for (const problem of problems) fail(problem);
  for (const note of notes) warn(note);
  if (!problems.length && failures.length === marked) {
    console.log(
      `  ✓ ${releaseName(served)} · ${served.fileName} · ${megabytes(served.sizeBytes)} · ` +
        `sha256 ${String(served.sha256).slice(0, 12)}… — git and production describe the same bytes.`,
    );
  }
  return served;
}

/** Headers the download route gives out, and the first bytes to prove they are true. */
async function downloadHeaders(record) {
  const marked = failures.length;
  console.log('\nWhat the download route promises');
  const response = await get(apkUrl, { headers: { range: 'bytes=0-31' }, signal: AbortSignal.timeout(headerTimeoutMs) }, 'Learners cannot start a download the server will not begin.');
  if (!response) return false;

  if (response.status >= 300 && response.status < 400) {
    fail(
      `GET ${apkUrl} redirected (${response.status}) to ${response.headers.get('location')}. The download route is the release volume: a redirect means ` +
        'the binary this record describes is not on it, so nothing here verified what a learner would actually receive. Restore the APK to the volume, or ' +
        'publish the record that describes the new home.',
    );
    return false;
  }
  if (response.status !== 206 && response.status !== 200) {
    // Reading the body here is deliberate: a 404/503 from this route is a JSON
    // explanation of why there is nothing to download, and CI should quote it.
    fail(`GET ${apkUrl} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return false;
  }

  const head = await get(apkUrl, { method: 'HEAD', signal: AbortSignal.timeout(headerTimeoutMs) }, 'The download route does not even answer a HEAD.');
  if (head) {
    assert(head.status === 200 || head.status === 206, `HEAD ${apkUrl} answered ${head.status}.`);
  }
  const headers = head?.status === 200 ? head.headers : response.headers;

  const length = Number(headers.get('content-length'));
  if (head?.status === 200) {
    assert(
      length === Number(record.sizeBytes),
      `the download route announces Content-Length ${length} for an APK the record says is ${record.sizeBytes} bytes.`,
    );
  }
  assert(
    String(headers.get('content-type') || '').startsWith('application/vnd.android.package-archive'),
    `the served artifact is typed "${headers.get('content-type')}"; a phone asked for an APK and got something else.`,
  );
  const disposition = String(headers.get('content-disposition') || '');
  const offered = /filename="?([^";]+)"?/.exec(disposition)?.[1];
  assert(
    offered === record.fileName,
    `Content-Disposition offers "${offered ?? '(no filename)'}" but the record publishes ${record.fileName}.`,
  );
  assert(String(headers.get('accept-ranges')) === 'bytes', `the download route does not advertise byte ranges (Accept-Ranges: ${headers.get('accept-ranges')}).`);

  if (response.status === 206) {
    const total = /\/(\d+)$/.exec(String(response.headers.get('content-range') || ''))?.[1];
    assert(
      Number(total) === Number(record.sizeBytes),
      `Content-Range reports a file of ${total} bytes, not the ${record.sizeBytes} the record promises.`,
    );
  }
  const first = Buffer.from(await response.arrayBuffer());
  assert(first.length >= 2 && first[0] === 0x50 && first[1] === 0x4b, `the served bytes start with ${first.subarray(0, 4).toString('hex')}, not the "PK" of an APK zip.`);

  if (failures.length === marked) console.log(`  ✓ 206 partial delivery, ${megabytes(record.sizeBytes)} announced, ${record.fileName} named, and the first bytes are an APK.`);
  return true;
}

/** Stream the whole file and hash it — the fallback when the container will not do it for us. */
async function streamArtifact(record) {
  console.log('  · no BOLINGO_INTEGRITY_TOKEN: hashing the artifact by downloading all of it. Set the token for the fast path.');
  const started = Date.now();
  const response = await get(apkUrl, { signal: AbortSignal.timeout(streamBudgetMs) }, 'The artifact could not be read.');
  if (!response) return null;
  if (!response.ok) {
    fail(`GET ${apkUrl} answered ${response.status} while streaming the artifact.`);
    return null;
  }

  const hash = crypto.createHash('sha256');
  let sizeBytes = 0;
  let timedOut = false;
  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      sizeBytes += value.length;
      if (Date.now() - started > streamBudgetMs) {
        timedOut = true;
        await reader.cancel();
        break;
      }
    }
  } catch (error) {
    if (!/Timeout|Abort/.test(error.name + error.message)) {
      fail(`streaming ${apkUrl} failed after ${sizeBytes} bytes: ${error.message}`);
      return null;
    }
    timedOut = true;
  }

  if (timedOut) {
    fail(
      `only ${sizeBytes} of ${record.sizeBytes} bytes arrived in ${Math.round(streamBudgetMs / 1000)}s. The file is unreachable at useful speed, `
        + 'or the connection died. Set BOLINGO_INTEGRITY_TOKEN so the container hashes its own volume instead of CI pulling the whole release across the internet.',
    );
    return null;
  }
  return { present: true, path: apkUrl, sizeBytes, sha256: hash.digest('hex'), via: 'stream' };
}

async function artifactFor(record) {
  const marked = failures.length;
  console.log('\nThe bytes on the release volume');
  if (!integrityToken) {
    const streamed = await streamArtifact(record);
    if (streamed) for (const problem of compareArtifact(record, streamed)) fail(problem);
    return;
  }

  const response = await get(
    integrityUrl,
    { headers: { 'x-bolingo-integrity-token': integrityToken }, signal: AbortSignal.timeout(Math.max(headerTimeoutMs, 120_000)) },
    'The release cannot be verified against its own volume.',
  );
  if (!response) return;

  if (response.status === 503) {
    fail(
      `${integrityUrl} refused: this container has no BOLINGO_INTEGRITY_TOKEN. Set it on the web service (docs/install-from-web.md) and give CI the same value ` +
        `as a repository secret — without it the only alternative is downloading all ${megabytes(record.sizeBytes)} to hash them.`,
    );
    return;
  }
  if (response.status === 404) {
    fail(
      `${integrityUrl} does not exist on this deployment: the container is older than the release-integrity endpoint. Deploy this build, or unset `
        + 'BOLINGO_INTEGRITY_TOKEN and let CI hash the download itself.',
    );
    return;
  }
  if (response.status === 401) {
    fail(
      `${integrityUrl} rejected the token CI was given. BOLINGO_INTEGRITY_TOKEN in this repository must equal the one on the web service ` +
        '(same length, same characters — a rotated secret must be updated in both places).',
    );
    return;
  }
  if (response.status !== 200) {
    fail(`${integrityUrl} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return;
  }

  const body = await response.json().catch((error) => {
    fail(`${integrityUrl} answered 200 with something that is not JSON: ${String(error.message).slice(0, 120)}`);
    return null;
  });
  if (!body) return;
  if (!assert(body.volume, `${integrityUrl} returned no measurement: ${JSON.stringify(body).slice(0, 200)}`)) return;

  // The endpoint must be describing the release the public site describes, or it
  // is verifying a file while learners download a different one.
  for (const field of ['version', 'buildNumber', 'sizeBytes', 'sha256', 'fileName', 'url']) {
    assert(
      String(body.record?.[field] ?? '') === String(record[field] ?? ''),
      `the container verified ${field}=${display(body.record?.[field])} but the public record says ${display(record[field])}.`,
    );
  }

  const problems = compareArtifact(record, body.volume);
  assert(
    body.match === (problems.length === 0),
    `the container and this gate disagree about the same numbers: the endpoint said match=${body.match}, the comparison found ${problems.length} problem(s).`,
  );

  if (!problems.length && failures.length === marked) {
    const where = body.volume.via || 'the volume';
    console.log(
      `  ✓ ${where} served ${body.volume.sizeBytes} bytes (${megabytes(body.volume.sizeBytes)}) as ` +
        `sha256 ${String(body.volume.sha256).slice(0, 12)}… in ${body.volume.hashedInMs ?? '?'}ms at ${body.volume.path}.`,
    );
  }
  for (const problem of problems) fail(problem);
}

function report(record) {
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('');
  if (failures.length) {
    console.log(`Release artifact: FAILED (${failures.length} problem(s) in ${seconds}s)`);
    return;
  }
  if (warnings.length) {
    console.log(`Release artifact: PASSED with ${warnings.length} warning(s) in ${seconds}s`);
    return;
  }
  console.log(
    `Release artifact: PASSED in ${seconds}s — ${record ? `${releaseName(record)}, ${megabytes(record.sizeBytes)}, ` : ''}` +
      `sha256 verified against the published record.`,
  );
}

async function main() {
  console.log('Release artifact: does the served APK still match its published record?');
  console.log(`Mode: ${integrityToken ? 'container-side hash (token set)' : 'CI-side full download (no BOLINGO_INTEGRITY_TOKEN)'}`);

  if (!selfTest()) {
    console.log('  ✗ offline judgement self-test failed');
    report(null);
    process.exitCode = 1;
    console.log('Fix the comparison before trusting anything this gate says about a network.');
    return;
  }
  console.log('  ✓ offline judgement self-test: every synthetic drift caught, honest release accepted');

  fixtureTest();

  const served = await liveRelease();
  if (served) {
    if (await downloadHeaders(served)) await artifactFor(served);
  }

  report(served);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  fail(`unexpected error: ${error.stack || error.message}`);
  process.exitCode = 1;
});
