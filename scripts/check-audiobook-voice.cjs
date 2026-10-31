#!/usr/bin/env node
/**
 * Guard the audiobook voice configuration.
 *
 * Three layers, because the config crosses Deno, Node and the app's docs:
 *   1. Behaviour — the real shared validator is transpiled and executed
 *      against valid, partial and deliberately broken configs.
 *   2. Request shape — the exact ElevenLabs/OpenAI request the Edge Function
 *      sends is built and inspected, including the 4,000-character cap.
 *   3. Wiring — the Edge Function, preview command, package scripts and docs
 *      must keep pointing at that shared module instead of growing a second
 *      hard-coded voice.
 *
 * No network call is made. Run with `node scripts/check-audiobook-voice.cjs`
 * (also part of `npm test`). Exits 1 on any mismatch.
 */

'use strict';

/* global __dirname, Buffer -- Node provides these to CommonJS scripts. */

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const VOICE_CONFIG = path.join(ROOT, 'supabase', 'functions', '_shared', 'audiobookVoice.ts');
const EDGE_FUNCTION = path.join(ROOT, 'supabase', 'functions', 'process-upload', 'index.ts');
const PREVIEW_SCRIPT = path.join(ROOT, 'scripts', 'preview-audiobook-voice.cjs');
const PREFLIGHT_SCRIPT = path.join(ROOT, 'scripts', 'preflight-audiobook-voice.cjs');
const ELEVENLABS_PRELOAD = path.join(ROOT, 'scripts', 'elevenlabs-stub-preload.cjs');
const VERIFY_SCRIPT = path.join(ROOT, 'scripts', 'verify-full-lesson-audio.cjs');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const DOCS = path.join(ROOT, 'docs', 'audiobook-voice.md');
const README = path.join(ROOT, 'README.md');

let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`[ok] ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`[ok] ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
  }
}

function runNode(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function formatDiagnostics(diagnostics) {
  return diagnostics
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.file && typeof diagnostic.start === 'number') {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        return `${path.relative(ROOT, diagnostic.file.fileName)}:${position.line + 1}:${position.character + 1} ${message}`;
      }
      return message;
    })
    .join('\n');
}

function loadVoiceModule() {
  const source = fs.readFileSync(VOICE_CONFIG, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: VOICE_CONFIG,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(`shared voice config has syntax errors:\n${formatDiagnostics(diagnostics)}`);
  }
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
  return mod.exports;
}

function assertTranspiles(file) {
  const source = fs.readFileSync(file, 'utf8');
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      allowJs: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics));
  }
}

function assertJavaScriptParses(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/^#!.*\r?\n/, '');
  // Compiling with Function checks syntax only; the script is not executed.
  new Function(source);
}

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

let voice;
try {
  voice = loadVoiceModule();
} catch (error) {
  console.error(`[FAIL] could not load shared voice config\n       ${error.message}`);
  process.exitCode = 1;
  process.exit();
}

// --- validation ---------------------------------------------------------

check('defaults are a complete ElevenLabs MP3 configuration', () => {
  const config = voice.parseAudiobookVoiceConfig();
  assert.equal(config.provider, 'elevenlabs');
  assert.equal(config.modelId, 'eleven_turbo_v2_5');
  assert.equal(config.voiceId, '21m00Tcm4TlvDq8ikWAM');
  assert.equal(config.outputFormat, 'mp3_44100_128');
  assert.equal(config.stability, 0.5);
  assert.equal(config.similarityBoost, 0.75);
  assert.equal(config.style, 0);
  assert.equal(config.useSpeakerBoost, true);
  assert.ok(config.preview.fullMix.length > 0);
  assert.ok(config.preview.segment.length > 0);
  assert.ok(Object.isFrozen(config), 'config should be frozen');
  assert.ok(Object.isFrozen(config.preview), 'preview should be frozen');
});

check('environment names map onto one validated config', () => {
  const config = voice.audiobookVoiceFromEnv({
    TTS_PROVIDER: 'openai',
    TTS_MODEL_ID: 'tts-1-hd',
    TTS_VOICE: 'nova',
    TTS_OUTPUT_FORMAT: 'mp3_44100_192',
    TTS_STABILITY: '0.4',
    TTS_SIMILARITY_BOOST: '0.8',
    TTS_STYLE: '0.2',
    TTS_SPEAKER_BOOST: 'false',
    TTS_PREVIEW_FULL_MIX: 'A short full-mix preview.',
    TTS_PREVIEW_SEGMENT: 'Kiswahili segment.',
  });
  assert.equal(config.provider, 'openai');
  assert.equal(config.modelId, 'tts-1-hd');
  assert.equal(config.openaiVoice, 'nova');
  assert.equal(config.outputFormat, 'mp3_44100_192');
  assert.equal(config.stability, 0.4);
  assert.equal(config.similarityBoost, 0.8);
  assert.equal(config.style, 0.2);
  assert.equal(config.useSpeakerBoost, false);
  assert.equal(config.preview.fullMix, 'A short full-mix preview.');
  assert.equal(config.preview.segment, 'Kiswahili segment.');
});

check('a blank secret is treated as unset, not invalid', () => {
  const config = voice.audiobookVoiceFromEnv({
    TTS_PROVIDER: '',
    TTS_MODEL_ID: '   ',
    TTS_VOICE_ID: '',
    TTS_VOICE: '',
    TTS_OUTPUT_FORMAT: '',
    TTS_STABILITY: '',
    TTS_SIMILARITY_BOOST: '',
    TTS_STYLE: '',
    TTS_SPEAKER_BOOST: '',
    TTS_PREVIEW_FULL_MIX: '',
    TTS_PREVIEW_SEGMENT: '',
  });
  assert.equal(config.provider, 'elevenlabs');
  assert.equal(config.modelId, 'eleven_turbo_v2_5');
});

check('OpenAI gets an OpenAI default model, not an ElevenLabs one', () => {
  const config = voice.parseAudiobookVoiceConfig({ provider: 'openai' });
  assert.equal(config.modelId, 'tts-1');
  assert.equal(config.openaiVoice, 'alloy');
});

const invalidConfigs = [
  ['unknown provider', { provider: 'azure' }, /provider must be one of/],
  ['ElevenLabs model on OpenAI', { provider: 'openai', modelId: 'eleven_turbo_v2_5' }, /OpenAI modelId/],
  ['OpenAI model on ElevenLabs', { modelId: 'tts-1' }, /ElevenLabs modelId/],
  ['bad voice id', { voiceId: 'not a voice' }, /voiceId must be/],
  ['unknown OpenAI voice', { openaiVoice: 'robot' }, /openaiVoice must be/],
  ['non-MP3 output', { outputFormat: 'wav_44100' }, /outputFormat must be/],
  ['stability over one', { stability: 1.2 }, /between 0 and 1/],
  ['stability not a number', { stability: 'warm' }, /finite number/],
  ['negative style', { style: -0.1 }, /between 0 and 1/],
  ['bad boolean', { useSpeakerBoost: 'sometimes' }, /must be true or false/],
  ['empty full-mix preview', { preview: { fullMix: '   ' } }, /must not be empty/],
  [
    'overlong full-mix preview',
    { preview: { fullMix: 'x'.repeat(voice.MAX_PREVIEW_FULL_MIX_CHARS + 1) } },
    /preview\.fullMix must be/,
  ],
  [
    'overlong segment preview',
    { preview: { segment: 'x'.repeat(voice.MAX_PREVIEW_SEGMENT_CHARS + 1) } },
    /preview\.segment must be/,
  ],
  ['unknown top-level key', { stabilty: 0.5 }, /Unknown audiobook voice config key/],
  ['unknown preview key', { preview: { fulMix: 'typo' } }, /Unknown preview key/],
  ['config is not an object', [], /must be an object/],
];

for (const [label, invalid, pattern] of invalidConfigs) {
  check(`rejects ${label}`, () => {
    assert.throws(() => voice.parseAudiobookVoiceConfig(invalid), pattern);
  });
}

// --- request shape ------------------------------------------------------

check('ElevenLabs request carries the voice, format and settings', () => {
  const config = voice.parseAudiobookVoiceConfig();
  const request = voice.buildSpeechRequest(config, 'Hello from the audiobook.', {
    apiKey: 'test-key',
  });
  assert.match(request.url, /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\//);
  assert.match(request.url, /21m00Tcm4TlvDq8ikWAM/);
  assert.match(request.url, /output_format=mp3_44100_128/);
  assert.equal(request.headers['xi-api-key'], 'test-key');
  assert.equal(request.headers.Accept, 'audio/mpeg');
  assert.equal(request.body.model_id, 'eleven_turbo_v2_5');
  assert.deepEqual(request.body.voice_settings, {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true,
  });
});

check('full-mix and segment narration resolve to the same ElevenLabs voice and model', () => {
  // Use a non-default id/model so a hard-coded value in one branch cannot pass.
  const config = voice.parseAudiobookVoiceConfig({
    provider: 'elevenlabs',
    modelId: 'eleven_multilingual_v2',
    voiceId: 'AbCdEfGhIjKlMnOpQrSt',
  });
  const full = voice.buildSpeechRequest(config, 'Full-mix narration for the lesson.', {
    apiKey: 'test-key',
  });
  const segment = voice.buildSpeechRequest(config, 'One question narration.', {
    apiKey: 'test-key',
  });
  assert.notEqual(full.body.text, segment.body.text, 'the two requests must carry different text');
  assert.equal(full.url, segment.url, 'full mix and segment must use the same voice URL');
  assert.ok(full.url.includes(config.voiceId), 'the configured voice id must be in the URL');
  assert.ok(segment.url.includes(config.voiceId), 'the segment must use the same voice id');
  assert.equal(full.body.model_id, segment.body.model_id, 'both paths must use the same model');
  assert.equal(full.body.model_id, config.modelId);
  assert.deepEqual(full.body.voice_settings, segment.body.voice_settings);

  // Sensitivity proof: a different configured voice/model must change the
  // request, otherwise the equality assertions above could pass on a constant.
  const other = voice.parseAudiobookVoiceConfig({
    provider: 'elevenlabs',
    modelId: 'eleven_turbo_v2_5',
    voiceId: 'ZzYyXxWwVvUuTtSsRrQq',
  });
  const otherRequest = voice.buildSpeechRequest(other, 'Full-mix narration for the lesson.', {
    apiKey: 'test-key',
  });
  assert.notEqual(full.url, otherRequest.url);
  assert.notEqual(full.body.model_id, otherRequest.body.model_id);
});

check('full-mix and segment narration resolve to the same OpenAI voice and model', () => {
  const config = voice.parseAudiobookVoiceConfig({
    provider: 'openai',
    modelId: 'gpt-4o-mini-tts',
    openaiVoice: 'shimmer',
  });
  const options = { apiKey: 'test-key', baseUrl: 'https://openai.example/v1' };
  const full = voice.buildSpeechRequest(config, 'Full-mix narration for the lesson.', options);
  const segment = voice.buildSpeechRequest(config, 'One question narration.', options);
  assert.notEqual(full.body.input, segment.body.input, 'the two requests must carry different text');
  assert.equal(full.url, segment.url, 'full mix and segment must use the same endpoint');
  assert.equal(full.body.model, segment.body.model, 'both paths must use the same model');
  assert.equal(full.body.model, config.modelId);
  assert.equal(full.body.voice, segment.body.voice, 'both paths must use the same voice');
  assert.equal(full.body.voice, config.openaiVoice);
  assert.equal(full.body.response_format, segment.body.response_format);
  assert.equal(full.body.response_format, 'mp3');
  assert.equal(full.headers.Authorization, segment.headers.Authorization);

  // Sensitivity proof: the equality assertions must not pass on constants.
  const other = voice.parseAudiobookVoiceConfig({
    provider: 'openai',
    modelId: 'tts-1-hd',
    openaiVoice: 'onyx',
  });
  const otherRequest = voice.buildSpeechRequest(other, 'Full-mix narration for the lesson.', options);
  assert.notEqual(full.body.model, otherRequest.body.model);
  assert.notEqual(full.body.voice, otherRequest.body.voice);
});

check('OpenAI request uses its own schema and a trimmed base URL', () => {
  const config = voice.parseAudiobookVoiceConfig({
    provider: 'openai',
    modelId: 'gpt-4o-mini-tts',
    openaiVoice: 'shimmer',
  });
  const request = voice.buildSpeechRequest(config, 'Hello from the audiobook.', {
    apiKey: 'test-key',
    baseUrl: 'https://openai.example/v1/',
  });
  assert.equal(request.url, 'https://openai.example/v1/audio/speech');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(request.body, {
    model: 'gpt-4o-mini-tts',
    input: 'Hello from the audiobook.',
    voice: 'shimmer',
    response_format: 'mp3',
  });
});

check('speech text is capped at the provider limit', () => {
  const config = voice.parseAudiobookVoiceConfig();
  const request = voice.buildSpeechRequest(config, 'a'.repeat(voice.MAX_TTS_CHARS + 250), {
    apiKey: 'test-key',
  });
  assert.equal(request.body.text.length, voice.MAX_TTS_CHARS);
});

check('an empty API key or empty text cannot build a request', () => {
  const config = voice.parseAudiobookVoiceConfig();
  assert.throws(() => voice.buildSpeechRequest(config, 'Hello', { apiKey: '  ' }), /API key/);
  assert.throws(() => voice.buildSpeechRequest(config, '   ', { apiKey: 'test-key' }), /must not be empty/);
});

// --- wiring -------------------------------------------------------------

check('the Edge Function imports and uses the shared configuration', () => {
  const edge = read(EDGE_FUNCTION);
  assert.match(edge, /from '\.\.\/_shared\/audiobookVoice\.ts'/);
  assert.match(edge, /audiobookVoiceFromEnv\(Deno\.env\.toObject\(\)\)/);
  assert.match(edge, /buildSpeechRequest\(config, narration/);
  assert.doesNotMatch(edge, /Deno\.env\.get\('TTS_MODEL_ID'\)/);
  assert.doesNotMatch(edge, /Deno\.env\.get\('TTS_VOICE'\)/);
  assert.doesNotMatch(edge, /api\.elevenlabs\.io\/v1\/text-to-speech/);
});

check('both narration paths go through one voice builder', () => {
  const edge = read(EDGE_FUNCTION);
  assert.match(edge, /async function synthesizeAudio\(narration: string\): Promise<Uint8Array>/);
  assert.equal(
    (edge.match(/buildSpeechRequest\(/g) ?? []).length,
    1,
    'the full mix and segments must share the one request builder'
  );
  assert.equal(
    (edge.match(/audiobookVoiceFromEnv\(/g) ?? []).length,
    1,
    'the voice must be resolved once per synthesis, not per narration kind'
  );
  assert.match(edge, /const mix = await synthesizeAudio\(fullNarration\);/);
  assert.match(edge, /const seg = await synthesizeAudio\(row\.prompt\.slice\(0, 1000\)\);/);
  assert.equal(
    (edge.match(/await synthesizeAudio\(/g) ?? []).length,
    2,
    'there should be exactly one full-mix call and one segment call'
  );
});

check('the preview command uses the same builder and writes both samples', () => {
  const preview = read(PREVIEW_SCRIPT);
  assert.match(preview, /audiobookVoiceFromEnv\(process\.env\)/);
  assert.match(preview, /voice\.buildSpeechRequest\(config, text/);
  assert.match(preview, /full-mix\.mp3/);
  assert.match(preview, /segment\.mp3/);
  assert.match(preview, /--preview/);
  assert.match(preview, /manifest\.json/);
  assert.match(preview, /verifyConfiguredVoice/);
  assert.match(preview, /\/v1\/voices\//);
  assert.match(preview, /no longer exists/);
});

check('the bundled premium narrator sample is short, playable and wired to free surfaces', () => {
  const samplePath = path.join(ROOT, 'assets', 'audio', 'premium-narrator-sample.mp3');
  assert.ok(fs.existsSync(samplePath), 'bundled narrator sample is missing');
  const bytes = fs.readFileSync(samplePath);
  assert.ok(bytes.length > 40_000, 'bundled narrator sample is unexpectedly small');
  assert.ok(bytes.length < 200_000, 'bundled narrator sample is too large for a short audition');
  const id3 = bytes.subarray(0, 3).toString('ascii') === 'ID3';
  const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  assert.ok(id3 || frameSync, 'bundled narrator sample is not an MP3');

  const narrationAsset = read(path.join(ROOT, 'assets', 'narrator.ts'));
  assert.match(narrationAsset, /require\('\.\/audio\/premium-narrator-sample\.mp3'\)/);
  assert.match(narrationAsset, /PREMIUM_NARRATOR_SAMPLE_TEXT/);

  const sampleComponent = read(path.join(ROOT, 'components', 'PremiumNarratorSample.tsx'));
  assert.match(sampleComponent, /Premium narrator sample/);
  assert.match(sampleComponent, /TTS credits/);
  assert.doesNotMatch(sampleComponent, /fetch\(|signedUrl|elevenlabs/i);

  const settings = read(path.join(ROOT, 'src', 'app', 'settings.tsx'));
  assert.match(settings, /PremiumNarratorSample/);
  assert.match(settings, /PREMIUM_NARRATOR_SAMPLE/);

  const paywall = read(path.join(ROOT, 'src', 'app', 'paywall.tsx'));
  assert.match(paywall, /PremiumNarratorSample/);
  assert.match(paywall, /PREMIUM_NARRATOR_SAMPLE/);

  assert.match(read(DOCS), /premium-narrator-sample\.mp3/);
});

check('both new runtime files parse', () => {
  assertTranspiles(EDGE_FUNCTION);
  assertJavaScriptParses(PREVIEW_SCRIPT);
});

check('the ElevenLabs stub preload exists and reroutes only the provider origin', () => {
  const preload = read(ELEVENLABS_PRELOAD);
  assert.match(preload, /api\.elevenlabs\.io/);
  assert.match(preload, /ELEVENLABS_STUB_URL/);
  assert.match(preload, /globalThis\.fetch/);
  assert.match(preload, /realFetch/);
});

check('the pre-deploy preflight verifies the voice is in the key workspace', () => {
  const preflight = read(PREFLIGHT_SCRIPT);
  assert.match(preflight, /audiobookVoiceFromEnv\(process\.env\)/);
  assert.match(preflight, /\/v1\/user/);
  assert.match(preflight, /\/v1\/voices/);
  assert.match(preflight, /workspace_id/);
  assert.match(preflight, /voiceInWorkspace/);
  assert.match(preflight, /not listed in workspace/);
  assert.match(preflight, /TTS_PROVIDER/);
  assert.match(preflight, /--consent/);
  assert.match(preflight, /TTS_CONSENT_RECORD/);
  assert.match(preflight, /CLONED_VOICE_CATEGORIES/);
});

check('the full-lesson verifier reads a real uploaded lesson and uses the same builder', () => {
  const verifier = read(VERIFY_SCRIPT);
  assert.match(verifier, /audiobookVoiceFromEnv\(process\.env\)/);
  assert.match(verifier, /voiceModule\.buildSpeechRequest\(config, job\.text/);
  assert.match(verifier, /\/rest\/v1\/lessons/);
  assert.match(verifier, /\/rest\/v1\/questions/);
  assert.match(verifier, /upload_source_id/);
  assert.match(verifier, /full-mix\.mp3/);
  assert.match(verifier, /segments\//);
  assert.match(verifier, /AUDIOBOOK_VOICE_DEFAULTS\.voiceId/);
  assert.match(verifier, /--allow-default-voice/);
  assert.match(verifier, /--plan/);
  assert.match(verifier, /--list/);
});

check('package scripts expose validation, preview and full-lesson verification', () => {
  const pkg = JSON.parse(read(PACKAGE_JSON));
  assert.ok(pkg.scripts['audio:voice'], 'audio:voice script is missing');
  assert.ok(pkg.scripts['audio:preflight'], 'audio:preflight script is missing');
  assert.ok(pkg.scripts['audio:preview'], 'audio:preview script is missing');
  assert.ok(pkg.scripts['check:audiobook-voice'], 'check:audiobook-voice script is missing');
  assert.ok(pkg.scripts['verify:lesson-audio'], 'verify:lesson-audio script is missing');
  assert.match(pkg.scripts.test, /check[:-]audiobook-voice/, 'npm test must run the config check');
  assert.doesNotMatch(
    pkg.scripts.test,
    /verify[:-]lesson[:-]audio/,
    'npm test must not spend TTS credits on a real lesson'
  );
});

check('the setup is documented', () => {
  assert.ok(fs.existsSync(DOCS), 'docs/audiobook-voice.md is missing');
  const docs = read(DOCS);
  assert.match(docs, /TTS_VOICE_ID/);
  assert.match(docs, /audio:preview/);
  assert.match(docs, /full-mix\.mp3/);
  assert.match(docs, /segment\.mp3/);
  assert.match(docs, /## ElevenLabs voice setup/);
  assert.match(docs, /## Consent requirements/);
  assert.match(docs, /## Free versus Premium behavior/);
  assert.match(docs, /API key ID used as API key/);
  assert.match(docs, /workspace_id/);
  assert.match(docs, /verify:lesson-audio/);
  assert.match(docs, /## Verify a real uploaded lesson/);
  assert.match(docs, /audio:preflight/);
  assert.match(docs, /## Preflight the voice before deployment/);
  assert.match(docs, /Cloned-voice consent record/);
  assert.match(docs, /TTS_CONSENT_RECORD/);
  assert.match(docs, /ElevenLabs stub test/);
  assert.match(docs, /OpenAI stub test/);
  assert.match(docs, /preflight stub test/);
  assert.match(docs, /elevenlabs-stub-preload\.cjs/);
  assert.match(docs, /read-only `GET \/v1\/voices\//);
  assert.match(docs, /no longer exists/);
  assert.match(read(README), /docs\/audiobook-voice\.md/);
});

// --- end-to-end preview against a local stub ---------------------------

const openAiPreviewCheck = checkAsync(
  'an OpenAI stub captures both preview requests with the same voice and model',
  async () => {
  const received = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      let parsed = null;
      try {
        parsed = JSON.parse(body);
      } catch {
        // The assertion below will report the malformed request body.
      }
      received.push({ url: req.url, headers: req.headers, body: parsed });
      const fakeMp3 = Buffer.alloc(2048);
      fakeMp3.write('ID3', 0, 'ascii');
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      res.end(fakeMp3);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('stub server did not get a port');

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-audiobook-check-'));
  try {
    const result = await runNode([PREVIEW_SCRIPT, '--preview', '--out', outDir, '--json'], {
      TTS_PROVIDER: 'openai',
      TTS_MODEL_ID: 'tts-1',
      TTS_VOICE_ID: '21m00Tcm4TlvDq8ikWAM',
      TTS_VOICE: 'alloy',
      TTS_OUTPUT_FORMAT: 'mp3_44100_128',
      TTS_STABILITY: '0.5',
      TTS_SIMILARITY_BOOST: '0.75',
      TTS_STYLE: '0',
      TTS_SPEAKER_BOOST: 'true',
      TTS_API_KEY: 'test-key',
      ELEVENLABS_API_KEY: '',
      OPENAI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
      TTS_PREVIEW_FULL_MIX: 'Full mix test line.',
      TTS_PREVIEW_SEGMENT: 'Sehemu ya jaribio.',
    });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(received.length, 2, 'expected one request per preview');
    assert.deepEqual(
      received.map((request) => request.body && request.body.input),
      ['Full mix test line.', 'Sehemu ya jaribio.']
    );
    for (const request of received) {
      assert.equal(request.url, '/v1/audio/speech');
      assert.equal(request.headers.authorization, 'Bearer test-key');
      assert.equal(request.body.model, 'tts-1');
      assert.equal(request.body.voice, 'alloy');
      assert.equal(request.body.response_format, 'mp3');
    }
    assert.equal(received[0].url, received[1].url, 'both previews must use the same endpoint');
    assert.equal(
      received[0].body.model,
      received[1].body.model,
      'the full mix and the segment must use the same model id'
    );
    assert.equal(
      received[0].body.voice,
      received[1].body.voice,
      'the full mix and the segment must use the same voice'
    );
    assert.equal(received[0].body.response_format, received[1].body.response_format);

    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.validated, true);
    assert.equal(manifest.provider, 'openai');
    assert.equal(manifest.modelId, 'tts-1');
    assert.equal(manifest.openaiVoice, 'alloy');
    assert.ok(manifest.files.fullMix.bytes >= 1024);
    assert.ok(manifest.files.segment.bytes >= 1024);
    assert.ok(fs.existsSync(path.join(outDir, 'full-mix.mp3')));
    assert.ok(fs.existsSync(path.join(outDir, 'segment.mp3')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

const elevenLabsPreviewCheck = checkAsync(
  'an ElevenLabs stub captures both preview requests with the same voice and model',
  async () => {
    const voiceId = 'testVoice0000000001';
    const modelId = 'eleven_multilingual_v2';
    const received = [];
    const voiceChecks = [];
    const events = [];
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === `/v1/voices/${voiceId}`) {
        voiceChecks.push({ method: req.method, url: req.url, headers: req.headers });
        events.push('voice-check');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            voice_id: voiceId,
            name: 'Test Voice',
            category: 'professional',
          })
        );
        return;
      }

      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          // The assertions below report a malformed body.
        }
        events.push('synthesis');
        received.push({ method: req.method, url: req.url, headers: req.headers, body: parsed });
        const fakeMp3 = Buffer.alloc(2048);
        fakeMp3.write('ID3', 0, 'ascii');
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        res.end(fakeMp3);
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('stub server did not get a port');

    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-elevenlabs-check-'));
    try {
      const result = await runNode([PREVIEW_SCRIPT, '--preview', '--out', outDir, '--json'], {
        TTS_PROVIDER: 'elevenlabs',
        TTS_MODEL_ID: modelId,
        TTS_VOICE_ID: voiceId,
        TTS_OUTPUT_FORMAT: 'mp3_44100_128',
        TTS_STABILITY: '0.42',
        TTS_SIMILARITY_BOOST: '0.81',
        TTS_STYLE: '0.12',
        TTS_SPEAKER_BOOST: 'true',
        TTS_API_KEY: 'test-elevenlabs-key',
        ELEVENLABS_API_KEY: 'test-elevenlabs-key',
        OPENAI_BASE_URL: '',
        ELEVENLABS_STUB_URL: `http://127.0.0.1:${address.port}`,
        NODE_OPTIONS: '--require ./scripts/elevenlabs-stub-preload.cjs',
        TTS_PREVIEW_FULL_MIX: 'Full mix ElevenLabs line.',
        TTS_PREVIEW_SEGMENT: 'Sehemu ya jaribio la ElevenLabs.',
      });
      assert.equal(result.code, 0, result.stderr || result.stdout);
      assert.equal(voiceChecks.length, 1, 'expected one read-only voice lookup');
      assert.equal(voiceChecks[0].headers['xi-api-key'], 'test-elevenlabs-key');
      assert.equal(events[0], 'voice-check', 'voice lookup must happen before synthesis');
      assert.equal(
        received.length,
        2,
        'expected one request for the full mix and one for the segment'
      );

      const urls = received.map((request) => new URL(request.url, 'http://stub.local'));
      for (const url of urls) {
        assert.equal(url.pathname, `/v1/text-to-speech/${voiceId}`);
        assert.equal(url.searchParams.get('output_format'), 'mp3_44100_128');
      }
      assert.equal(
        urls[0].pathname,
        urls[1].pathname,
        'the full mix and the segment must resolve to the same voice id'
      );

      for (const request of received) {
        assert.equal(request.method, 'POST');
        assert.equal(request.headers['xi-api-key'], 'test-elevenlabs-key');
        assert.equal(request.headers.accept, 'audio/mpeg');
        assert.equal(request.body.model_id, modelId);
        assert.deepEqual(request.body.voice_settings, {
          stability: 0.42,
          similarity_boost: 0.81,
          style: 0.12,
          use_speaker_boost: true,
        });
      }
      assert.equal(
        received[0].body.model_id,
        received[1].body.model_id,
        'the full mix and the segment must use the same model id'
      );
      assert.equal(received[0].body.text, 'Full mix ElevenLabs line.');
      assert.equal(received[1].body.text, 'Sehemu ya jaribio la ElevenLabs.');

      const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
      assert.equal(manifest.provider, 'elevenlabs');
      assert.equal(manifest.voiceId, voiceId);
      assert.equal(manifest.modelId, modelId);
      assert.equal(manifest.voiceCheck.checked, true);
      assert.equal(manifest.voiceCheck.name, 'Test Voice');
      assert.ok(fs.existsSync(path.join(outDir, 'full-mix.mp3')));
      assert.ok(fs.existsSync(path.join(outDir, 'segment.mp3')));
    } finally {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }
);

const missingVoicePreviewCheck = checkAsync(
  'the preview fails clearly before synthesis when the voice no longer exists',
  async () => {
    const voiceId = 'deletedVoice0000001';
    let synthesisRequests = 0;
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === `/v1/voices/${voiceId}`) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: { message: 'Voice not found' } }));
        return;
      }
      if (req.method === 'POST') {
        synthesisRequests += 1;
        const fakeMp3 = Buffer.alloc(2048);
        fakeMp3.write('ID3', 0, 'ascii');
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        res.end(fakeMp3);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ detail: 'not found' }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('stub server did not get a port');

    const outDir = path.join(
      os.tmpdir(),
      `bolingo-missing-voice-${process.pid}-${Date.now()}`
    );
    try {
      const result = await runNode([PREVIEW_SCRIPT, '--preview', '--out', outDir, '--json'], {
        TTS_PROVIDER: 'elevenlabs',
        TTS_MODEL_ID: 'eleven_multilingual_v2',
        TTS_VOICE_ID: voiceId,
        TTS_OUTPUT_FORMAT: 'mp3_44100_128',
        TTS_STABILITY: '0.5',
        TTS_SIMILARITY_BOOST: '0.75',
        TTS_STYLE: '0',
        TTS_SPEAKER_BOOST: 'true',
        TTS_API_KEY: 'test-elevenlabs-key',
        ELEVENLABS_API_KEY: '',
        OPENAI_BASE_URL: '',
        ELEVENLABS_STUB_URL: `http://127.0.0.1:${address.port}`,
        NODE_OPTIONS: '--require ./scripts/elevenlabs-stub-preload.cjs',
        TTS_PREVIEW_FULL_MIX: 'This must never be synthesized.',
        TTS_PREVIEW_SEGMENT: 'Hii haipaswi kusemwa.',
      });
      assert.equal(result.code, 1, 'a deleted voice must fail the preview');
      assert.match(result.stderr, /no longer exists/);
      assert.match(result.stderr, new RegExp(voiceId));
      assert.equal(synthesisRequests, 0, 'no TTS request may run after a failed voice lookup');
      assert.equal(fs.existsSync(outDir), false, 'no output directory should be created on failure');
    } finally {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }
);

const voicePreflightCheck = checkAsync(
  'the voice preflight proves workspace membership and cloned-voice consent',
  async () => {
    let listed = true;
    let category = 'professional';
    const seen = [];
    const voiceId = 'testVoice0000000001';
    const server = http.createServer((req, res) => {
      seen.push(req.url);
      const send = (body, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.url === '/v1/user') {
        return send({ workspace_id: 'ws_test', user_id: 'user_test' });
      }
      if (req.url === `/v1/voices/${voiceId}`) {
        return send({
          voice_id: voiceId,
          name: 'Test Voice',
          category,
          is_owner: true,
          sharing: { status: 'copied' },
        });
      }
      if (req.url.startsWith('/v1/voices?')) {
        return send({
          voices: listed
            ? [{ voice_id: voiceId, name: 'Test Voice', category, is_owner: true }]
            : [],
        });
      }
      return send({ detail: 'not found' }, 404);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('stub server did not get a port');

    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-voice-consent-'));
    const day = 24 * 60 * 60 * 1000;
    const isoDay = (offset) => new Date(Date.now() + offset * day).toISOString().slice(0, 10);
    const baseRecord = {
      templateVersion: '2026-10-30',
      recordId: 'VC-TEST-001',
      status: 'Active',
      completed: true,
      provider: 'ElevenLabs',
      voiceId,
      workspaceId: 'ws_test',
      voiceType: 'Professional Voice Clone',
      speaker: 'Test Speaker',
      signedOn: isoDay(-30),
      reviewDueOn: isoDay(335),
      approvedBy: 'Test Operator',
      approvedOn: isoDay(-1),
    };
    const writeRecord = (name, changes) => {
      const file = path.join(fixtureDir, name);
      fs.writeFileSync(file, JSON.stringify({ ...baseRecord, ...changes }, null, 2));
      return file;
    };
    const consentFile = writeRecord('consent.json', {});
    const draftFile = writeRecord('draft.json', { status: 'Draft' });
    const expiredFile = writeRecord('expired.json', { reviewDueOn: isoDay(-1) });
    const wrongVoiceFile = writeRecord('wrong-voice.json', { voiceId: 'otherVoice00000001' });

    const env = {
      TTS_PROVIDER: 'elevenlabs',
      TTS_MODEL_ID: 'eleven_multilingual_v2',
      TTS_VOICE_ID: voiceId,
      TTS_API_KEY: 'test-preflight-key',
      ELEVENLABS_API_KEY: 'test-preflight-key',
      TTS_CONSENT_RECORD: '',
    };
    const args = [
      PREFLIGHT_SCRIPT,
      '--base-url',
      `http://127.0.0.1:${address.port}`,
      '--json',
    ];
    const withConsent = [...args, '--consent', consentFile];
    try {
      const missingConsent = await runNode(args, env);
      assert.equal(missingConsent.code, 1, 'a cloned voice must require consent');
      assert.match(
        missingConsent.stderr,
        /refuses to validate it without a completed, active consent record/
      );
      assert.match(missingConsent.stderr, /professional/);

      const draft = await runNode([...args, '--consent', draftFile], env);
      assert.equal(draft.code, 1, 'a draft consent record must fail');
      assert.match(draft.stderr, /must be "Active"/);

      const expired = await runNode([...args, '--consent', expiredFile], env);
      assert.equal(expired.code, 1, 'an expired consent record must fail');
      assert.match(expired.stderr, /expired/);

      const wrongVoice = await runNode([...args, '--consent', wrongVoiceFile], env);
      assert.equal(wrongVoice.code, 1, 'a record for another voice must fail');
      assert.match(wrongVoice.stderr, /is for voice otherVoice00000001/);

      const result = await runNode(withConsent, env);
      assert.equal(result.code, 0, result.stderr || result.stdout);
      const data = JSON.parse(result.stdout);
      assert.equal(data.ok, true);
      assert.equal(data.workspaceId, 'ws_test');
      assert.equal(data.voiceId, voiceId);
      assert.equal(data.voiceInWorkspace, true);
      assert.equal(data.voice.name, 'Test Voice');
      assert.equal(data.workspaceVoiceCount, 1);
      assert.equal(data.consent.required, true);
      assert.equal(data.consent.provided, true);
      assert.equal(data.consent.recordId, 'VC-TEST-001');
      assert.equal(data.consent.status, 'Active');
      assert.ok(seen.includes('/v1/user'));
      assert.ok(seen.includes(`/v1/voices/${voiceId}`));
      assert.ok(seen.some((url) => url.startsWith('/v1/voices?')));

      const fromEnv = await runNode(args, { ...env, TTS_CONSENT_RECORD: consentFile });
      assert.equal(fromEnv.code, 0, fromEnv.stderr || fromEnv.stdout);

      category = 'premade';
      const premade = await runNode(args, env);
      assert.equal(premade.code, 0, 'a non-cloned voice must not require a record');
      const premadeData = JSON.parse(premade.stdout);
      assert.equal(premadeData.consent.required, false);
      assert.equal(premadeData.consent.provided, false);
      category = 'professional';

      listed = false;
      const missing = await runNode(withConsent, env);
      assert.equal(missing.code, 1, 'a shared-only voice must fail the preflight');
      assert.match(missing.stderr, /not listed in workspace/);

      const wrongProvider = await runNode([PREFLIGHT_SCRIPT, '--json'], {
        ...env,
        TTS_PROVIDER: 'openai',
        TTS_MODEL_ID: 'tts-1',
        TTS_VOICE: 'alloy',
      });
      assert.equal(wrongProvider.code, 1);
      assert.match(wrongProvider.stderr, /ElevenLabs/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  }
);

(async () => {
  await openAiPreviewCheck;
  await elevenLabsPreviewCheck;
  await missingVoicePreviewCheck;
  await voicePreflightCheck;
  if (failures > 0) {
    console.error(`\n${failures} audiobook-voice check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\n[ok] audiobook voice configuration is validated end to end');
  }
})().catch((error) => {
  console.error(`[FAIL] unexpected check error: ${error.stack || error}`);
  process.exitCode = 1;
});
