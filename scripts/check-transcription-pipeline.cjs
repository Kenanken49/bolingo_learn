#!/usr/bin/env node
/**
 * Guard the consented audio/video transcription pipeline.
 *
 * Three layers, because the pipeline crosses Deno, Node, the database and the
 * app UI:
 *   1. Behaviour — the real shared module is transpiled and run: provider
 *      resolution, request shapes, response parsing, size limits and errors.
 *   2. Wire protocol — local HTTP stubs receive the actual Deepgram and
 *      OpenAI-compatible requests and return fixture payloads, so a malformed
 *      request fails here rather than on a learner's upload.
 *   3. Wiring — process-upload must re-check consent before transcribing and
 *      cache the transcript; the schema, migration, UI, env example and docs
 *      must stay aligned.
 *
 * No network call is made and no credits are spent. Run with
 * `node scripts/check-transcription-pipeline.cjs` (also part of `npm test`).
 */

'use strict';

/* global __dirname, Buffer -- Node provides these to CommonJS scripts. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'supabase', 'functions', '_shared', 'transcription.ts');
const EDGE_FUNCTION = path.join(ROOT, 'supabase', 'functions', 'process-upload', 'index.ts');
// The AI Sandbox creator lives on the My uploads screen (Library hub).
const UI = path.join(ROOT, 'src', 'app', 'uploads.tsx');
const SCHEMA = path.join(ROOT, 'supabase', 'schema.sql');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations_transcription.sql');
const DOC = path.join(ROOT, 'docs', 'transcription.md');
const CONTENT_RIGHTS_DOC = path.join(ROOT, 'docs', 'content-rights.md');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const README = path.join(ROOT, 'README.md');

let failures = 0;
const asyncChecks = [];

function check(name, fn) {
  try {
    fn();
    console.log(`[ok] ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
  }
}

function checkAsync(name, fn) {
  const promise = (async () => {
    try {
      await fn();
      console.log(`[ok] ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
    }
  })();
  asyncChecks.push(promise);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function formatDiagnostics(diagnostics) {
  return diagnostics
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    .join('\n');
}

function loadTranscriptionModule() {
  const source = read(MODULE);
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: MODULE,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(`shared transcription module has syntax errors:\n${formatDiagnostics(diagnostics)}`);
  }
  const mod = { exports: {} };
  // The module only relies on fetch/FormData/Blob globals, which Node 20+ has.
  new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
  return mod.exports;
}

const transcription = loadTranscriptionModule();

function deepgramConfig(overrides = {}) {
  return transcription.transcriptionConfigFromEnv({
    DEEPGRAM_API_KEY: 'dg-test-key',
    TRANSCRIBE_PROVIDER: 'deepgram',
    ...overrides,
  });
}

function openAiConfig(overrides = {}) {
  return transcription.transcriptionConfigFromEnv({
    TRANSCRIBE_PROVIDER: 'openai',
    TRANSCRIBE_API_KEY: 'oa-test-key',
    TRANSCRIBE_MODEL: 'whisper-large-v3',
    ...overrides,
  });
}

function listen(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('stub server did not get a port'));
        return;
      }
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// --- configuration -------------------------------------------------------

check('Deepgram is inferred from DEEPGRAM_API_KEY with documented defaults', () => {
  const config = transcription.transcriptionConfigFromEnv({ DEEPGRAM_API_KEY: 'dg-key' });
  assert.equal(config.provider, 'deepgram');
  assert.equal(config.baseUrl, 'https://api.deepgram.com');
  assert.equal(config.model, 'nova-3');
  assert.equal(config.language, null);
  assert.equal(config.maxBytes, transcription.DEEPGRAM_MAX_BYTES);
  assert.equal(config.timeoutMs, transcription.DEFAULT_TRANSCRIBE_TIMEOUT_MS);
});

check('an explicit provider wins and OpenAI config is parsed', () => {
  const config = transcription.transcriptionConfigFromEnv({
    TRANSCRIBE_PROVIDER: 'openai',
    DEEPGRAM_API_KEY: 'ignored',
    TRANSCRIBE_API_KEY: 'oa-key',
    TRANSCRIBE_BASE_URL: 'https://api.groq.com/openai/v1/',
    TRANSCRIBE_MODEL: 'whisper-large-v3',
    TRANSCRIBE_LANGUAGE: 'sw',
    TRANSCRIBE_MAX_BYTES: '1048576',
    TRANSCRIBE_TIMEOUT_MS: '120000',
  });
  assert.equal(config.provider, 'openai');
  assert.equal(config.baseUrl, 'https://api.groq.com/openai/v1');
  assert.equal(config.model, 'whisper-large-v3');
  assert.equal(config.language, 'sw');
  assert.equal(config.maxBytes, 1048576);
  assert.equal(config.timeoutMs, 120000);
});

check('missing or invalid provider configuration fails with actionable text', () => {
  assert.throws(
    () => transcription.transcriptionConfigFromEnv({}),
    /transcription is not configured[\s\S]*DEEPGRAM_API_KEY[\s\S]*TRANSCRIBE_API_KEY/
  );
  assert.throws(
    () => transcription.transcriptionConfigFromEnv({ TRANSCRIBE_PROVIDER: 'whisper' }),
    /TRANSCRIBE_PROVIDER must be one of deepgram, openai/
  );
  assert.throws(
    () => transcription.transcriptionConfigFromEnv({ TRANSCRIBE_PROVIDER: 'deepgram' }),
    /DEEPGRAM_API_KEY is not set/
  );
});

// --- request shapes ------------------------------------------------------

check('Deepgram request posts the signed URL with model, smart format and auth', () => {
  const config = deepgramConfig();
  const signed = 'https://storage.test/object/sign/clip.mp4?token=abc123';
  const request = transcription.buildTranscriptionRequest(config, { kind: 'url', url: signed });
  const url = new URL(request.url);
  assert.equal(`${url.origin}${url.pathname}`, 'https://api.deepgram.com/v1/listen');
  assert.equal(url.searchParams.get('model'), 'nova-3');
  assert.equal(url.searchParams.get('smart_format'), 'true');
  assert.equal(url.searchParams.get('detect_language'), 'true');
  assert.equal(url.searchParams.get('language'), null);
  assert.equal(request.headers.Authorization, 'Token dg-test-key');
  assert.equal(request.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.body), { url: signed });
});

check('a language hint replaces Deepgram language detection', () => {
  const request = transcription.buildTranscriptionRequest(
    deepgramConfig({ TRANSCRIBE_LANGUAGE: 'sw' }),
    { kind: 'url', url: 'https://storage.test/clip.mp4' }
  );
  const url = new URL(request.url);
  assert.equal(url.searchParams.get('language'), 'sw');
  assert.equal(url.searchParams.get('detect_language'), null);
});

check('Deepgram refuses bytes and OpenAI refuses a bare URL', () => {
  assert.throws(
    () =>
      transcription.buildTranscriptionRequest(deepgramConfig(), {
        kind: 'file',
        bytes: new Uint8Array([1]),
        fileName: 'a.mp3',
        contentType: 'audio/mpeg',
      }),
    /signed media URL/
  );
  assert.throws(
    () => transcription.buildTranscriptionRequest(openAiConfig(), { kind: 'url', url: 'https://x.test/a.mp3' }),
    /needs the media bytes/
  );
});

check('OpenAI-compatible request is multipart with verbose JSON by default', () => {
  const request = transcription.buildTranscriptionRequest(openAiConfig({ TRANSCRIBE_LANGUAGE: 'sw' }), {
    kind: 'file',
    bytes: new Uint8Array([1, 2, 3, 4]),
    fileName: 'clip.mp3',
    contentType: 'audio/mpeg',
  });
  assert.equal(request.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(request.headers.Authorization, 'Bearer oa-test-key');
  assert.equal(request.headers['Content-Type'], undefined, 'fetch must add the multipart boundary');
  assert.ok(request.body instanceof FormData);
  assert.equal(request.body.get('model'), 'whisper-large-v3');
  assert.equal(request.body.get('response_format'), 'verbose_json');
  assert.equal(request.body.get('language'), 'sw');
  const file = request.body.get('file');
  assert.ok(file && typeof file === 'object' && 'name' in file, 'file part is a named Blob');
  assert.equal(file.name, 'clip.mp3');
  assert.equal(file.type, 'audio/mpeg');
});

check('4o transcription models get json because they reject verbose_json', () => {
  const request = transcription.buildTranscriptionRequest(
    openAiConfig({ TRANSCRIBE_MODEL: 'gpt-4o-mini-transcribe' }),
    { kind: 'file', bytes: new Uint8Array([1]), fileName: 'a.mp3', contentType: 'audio/mpeg' }
  );
  assert.equal(request.body.get('response_format'), 'json');
});

check('an oversized upload fails before a network call with the limit and a way out', () => {
  const config = openAiConfig({ TRANSCRIBE_MAX_BYTES: '1024' });
  assert.throws(
    () =>
      transcription.buildTranscriptionRequest(config, {
        kind: 'file',
        bytes: new Uint8Array(4096),
        fileName: 'long.mp3',
        contentType: 'audio/mpeg',
      }),
    /limit is 1\.0 KB[\s\S]*DEEPGRAM_API_KEY/
  );
});

// --- behaviour against local stubs --------------------------------------

checkAsync('Deepgram request/response round-trips through a local stub', async () => {
  let seen = null;
  const stub = await listen(async (req, res) => {
    seen = {
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
      contentType: req.headers['content-type'],
      body: JSON.parse((await readBody(req)).toString('utf8')),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        metadata: { request_id: 'req_1', duration: 12.4 },
        results: {
          channels: [
            {
              detected_language: 'sw',
              alternatives: [{ transcript: '  Habari yako? Niko salama.  ' }],
            },
          ],
        },
      })
    );
  });
  try {
    const config = transcription.transcriptionConfigFromEnv({
      DEEPGRAM_API_KEY: 'dg-test-key',
      TRANSCRIBE_BASE_URL: stub.origin,
    });
    const result = await transcription.transcribeMedia(config, {
      kind: 'url',
      url: 'https://storage.test/clip.mp4?token=abc',
    });
    assert.equal(result.text, 'Habari yako? Niko salama.');
    assert.equal(result.language, 'sw');
    assert.equal(result.durationSeconds, 12.4);
    assert.equal(result.provider, 'deepgram');
    assert.equal(result.model, 'nova-3');
    assert.equal(seen.method, 'POST');
    assert.ok(seen.url.startsWith('/v1/listen?'));
    assert.equal(seen.auth, 'Token dg-test-key');
    assert.equal(seen.contentType, 'application/json');
    assert.deepEqual(seen.body, { url: 'https://storage.test/clip.mp4?token=abc' });
  } finally {
    await stub.close();
  }
});

checkAsync('OpenAI-compatible multipart round-trips through a local stub', async () => {
  let seen = null;
  const stub = await listen(async (req, res) => {
    seen = {
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
      contentType: req.headers['content-type'],
      body: (await readBody(req)).toString('utf8'),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ text: ' Jambo, habari? ', language: 'sw', duration: 4.2 }));
  });
  try {
    const config = transcription.transcriptionConfigFromEnv({
      TRANSCRIBE_PROVIDER: 'openai',
      TRANSCRIBE_API_KEY: 'oa-test-key',
      TRANSCRIBE_BASE_URL: stub.origin,
    });
    const result = await transcription.transcribeMedia(config, {
      kind: 'file',
      bytes: new Uint8Array([0x49, 0x44, 0x33]),
      fileName: 'jambo.mp3',
      contentType: 'audio/mpeg',
    });
    assert.equal(result.text, 'Jambo, habari?');
    assert.equal(result.language, 'sw');
    assert.equal(result.durationSeconds, 4.2);
    assert.equal(seen.method, 'POST');
    assert.equal(seen.url, '/audio/transcriptions');
    assert.equal(seen.auth, 'Bearer oa-test-key');
    assert.match(seen.contentType, /^multipart\/form-data; boundary=/);
    assert.match(seen.body, /name="file"; filename="jambo\.mp3"/);
    assert.match(seen.body, /name="model"\r\n\r\nwhisper-1/);
    assert.match(seen.body, /name="response_format"\r\n\r\nverbose_json/);
  } finally {
    await stub.close();
  }
});

checkAsync('a rejected key names the provider, status and fix', async () => {
  const stub = await listen((req, res) => {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ detail: 'Invalid credentials' }));
  });
  try {
    const config = transcription.transcriptionConfigFromEnv({
      TRANSCRIBE_PROVIDER: 'openai',
      TRANSCRIBE_API_KEY: 'bad',
      TRANSCRIBE_BASE_URL: stub.origin,
    });
    await assert.rejects(
      () =>
        transcription.transcribeMedia(config, {
          kind: 'file',
          bytes: new Uint8Array([1]),
          fileName: 'a.mp3',
          contentType: 'audio/mpeg',
        }),
      /key was rejected \(401\): Invalid credentials[\s\S]*redeploy process-upload/
    );
  } finally {
    await stub.close();
  }
});

checkAsync('a provider 413 is reported as too large with the Deepgram alternative', async () => {
  const stub = await listen((req, res) => {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ err_msg: 'Payload too large' }));
  });
  try {
    const config = transcription.transcriptionConfigFromEnv({
      TRANSCRIBE_PROVIDER: 'openai',
      TRANSCRIBE_API_KEY: 'key',
      TRANSCRIBE_BASE_URL: stub.origin,
    });
    await assert.rejects(
      () =>
        transcription.transcribeMedia(config, {
          kind: 'file',
          bytes: new Uint8Array([1]),
          fileName: 'a.mp3',
          contentType: 'audio/mpeg',
        }),
      /too large \(413\): Payload too large[\s\S]*DEEPGRAM_API_KEY/
    );
  } finally {
    await stub.close();
  }
});

checkAsync('an empty transcript is rejected, not turned into an empty lesson', async () => {
  const stub = await listen((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ text: '   ', language: 'en' }));
  });
  try {
    const config = transcription.transcriptionConfigFromEnv({
      TRANSCRIBE_PROVIDER: 'openai',
      TRANSCRIBE_API_KEY: 'key',
      TRANSCRIBE_BASE_URL: stub.origin,
    });
    await assert.rejects(
      () =>
        transcription.transcribeMedia(config, {
          kind: 'file',
          bytes: new Uint8Array([1]),
          fileName: 'a.mp3',
          contentType: 'audio/mpeg',
        }),
      /empty transcript/
    );
  } finally {
    await stub.close();
  }
});

checkAsync('an unreachable provider fails without a hang and names the provider', async () => {
  const config = transcription.transcriptionConfigFromEnv({
    TRANSCRIBE_PROVIDER: 'openai',
    TRANSCRIBE_API_KEY: 'key',
    TRANSCRIBE_BASE_URL: 'http://127.0.0.1:1',
    TRANSCRIBE_TIMEOUT_MS: '2000',
  });
  await assert.rejects(
    () =>
      transcription.transcribeMedia(config, {
        kind: 'file',
        bytes: new Uint8Array([1]),
        fileName: 'a.mp3',
        contentType: 'audio/mpeg',
      }),
    /Could not reach the openai transcription API[\s\S]*upload is unchanged/
  );
});

// --- wiring --------------------------------------------------------------

check('process-upload gates attestation and premium before it transcribes', () => {
  const edge = read(EDGE_FUNCTION);
  const rightsGate = edge.indexOf('hasValidContentRightsAttestation(upload.rights_attestation)');
  const premiumGate = edge.indexOf('if (!isPremium && !isText)');
  const transcribeCall = edge.indexOf('await transcribeUpload(supabase, upload, filePath)');
  const helperDefinition = edge.indexOf('async function transcribeUpload(');
  const providerCall = edge.indexOf('await transcribeMedia(config, source)');
  assert.ok(rightsGate > 0, 'the server-side attestation check is present');
  assert.ok(premiumGate > 0, 'the premium gate is present');
  assert.ok(helperDefinition > 0, 'the transcription wrapper exists');
  assert.ok(transcribeCall > 0, 'media routes through transcribeUpload');
  assert.ok(providerCall > helperDefinition, 'the shared module is called inside the wrapper');
  assert.ok(premiumGate < transcribeCall, 'premium is enforced before transcription spend');
  assert.ok(rightsGate < transcribeCall, 'consent is enforced before transcription spend');
  assert.doesNotMatch(edge, /Phase 2/);
  assert.doesNotMatch(edge, /transcription is not wired up yet/);
  assert.match(edge, /transcript: result\.text/);
  assert.match(edge, /transcript_provider: result\.provider/);
  assert.match(edge, /transcript_duration_seconds: result\.durationSeconds/);
  assert.match(edge, /transcribed_at: new Date\(\)\.toISOString\(\)/);
});

check('a cached transcript short-circuits the provider call', () => {
  const edge = read(EDGE_FUNCTION);
  const cacheRead = edge.indexOf("typeof upload.transcript === 'string'");
  const providerCall = edge.indexOf('await transcribeMedia(config, source)');
  assert.ok(cacheRead > 0, 'the transcript cache is read');
  assert.ok(providerCall > cacheRead, 'the cache check precedes the provider call');
  assert.match(edge, /Reusing stored transcript/);
});

check('the signed-URL path is used for Deepgram and bytes for OpenAI', () => {
  const edge = read(EDGE_FUNCTION);
  assert.match(edge, /createSignedUrl\(filePath, 3600\)/);
  assert.match(edge, /config\.provider === 'deepgram'/);
  assert.match(edge, /kind: 'url', url: signed\.signedUrl/);
  assert.match(edge, /kind: 'file'/);
  assert.match(edge, /mediaContentType\(fileName\)/);
});

check('the OpenAI path checks object size before downloading it', () => {
  const edge = read(EDGE_FUNCTION);
  const helper = edge.indexOf('async function storageObjectSize(');
  const sizeCall = edge.indexOf('const size = await storageObjectSize(supabase, filePath)');
  const guard = edge.indexOf('if (size !== null && size > config.maxBytes)');
  const download = edge.indexOf('const { data: file, error: dlError }');
  assert.ok(helper > 0, 'the metadata size helper exists');
  assert.ok(sizeCall > helper, 'the helper is called from the OpenAI branch');
  assert.ok(guard > sizeCall, 'the size limit is applied before the download');
  assert.ok(download > guard, 'the oversized file is rejected before it is downloaded');
  assert.match(edge, /throw new Error\(mediaTooLargeMessage\(config, size\)\)/);
});

check('the schema and migration store the transcript and its provenance', () => {
  const columns = [
    'transcript text',
    'transcript_provider text',
    'transcript_model text',
    'transcript_language text',
    'transcript_duration_seconds numeric',
    'transcribed_at timestamptz',
  ];
  const schema = read(SCHEMA);
  const migration = read(MIGRATION);
  for (const column of columns) {
    assert.ok(schema.includes(column), `schema.sql is missing ${column}`);
    assert.ok(migration.includes(column), `migration is missing ${column}`);
  }
  assert.match(migration, /add column if not exists/);
  assert.match(migration, /row-level-security|row-level-security policy|policy/);
});

check('the app offers audio/video on Premium with the consent checklist', () => {
  const ui = read(UI);
  assert.match(ui, /'image\/\*', 'audio\/\*', 'video\/\*'/);
  assert.match(ui, /Content rights/);
  assert.match(ui, /CONTENT_RIGHTS_ITEMS\.map/);
  assert.doesNotMatch(ui, /transcription is Phase 2/);
  assert.doesNotMatch(ui, /Audio\/video uploads are not available yet/);
});

check('the env example and docs describe both providers and the limits', () => {
  const env = read(ENV_EXAMPLE);
  for (const key of [
    'DEEPGRAM_API_KEY',
    'TRANSCRIBE_PROVIDER',
    'TRANSCRIBE_API_KEY',
    'TRANSCRIBE_BASE_URL',
    'TRANSCRIBE_MODEL',
    'TRANSCRIBE_LANGUAGE',
    'TRANSCRIBE_MAX_BYTES',
    'TRANSCRIBE_TIMEOUT_MS',
  ]) {
    assert.ok(env.includes(key), `.env.example is missing ${key}`);
  }
  assert.doesNotMatch(env, /EXPO_PUBLIC_DEEPGRAM|EXPO_PUBLIC_TRANSCRIBE/);

  const doc = read(DOC);
  for (const token of [
    'DEEPGRAM_API_KEY',
    'content-rights',
    'signed URL',
    '25 MB',
    '2 GB',
    '100,000-word',
    '400 s',
    'process-upload',
    'migrations_transcription.sql',
  ]) {
    assert.ok(doc.includes(token), `docs/transcription.md is missing "${token}"`);
  }
  assert.doesNotMatch(read(CONTENT_RIGHTS_DOC), /Phase 2/);
  assert.match(read(README), /docs\/transcription\.md/);
});

check('package scripts expose the check and include it in npm test', () => {
  const pkg = JSON.parse(read(PACKAGE_JSON));
  assert.equal(pkg.scripts['check:transcription'], 'node scripts/check-transcription-pipeline.cjs');
  assert.match(pkg.scripts.test, /check-transcription-pipeline\.cjs/);
});

(async () => {
  await Promise.all(asyncChecks);
  if (failures > 0) {
    console.error(`\n${failures} transcription check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\n[ok] consented audio/video transcription pipeline is wired end to end');
  }
})();
