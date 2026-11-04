#!/usr/bin/env node
/**
 * Guard the character studio voices (Livia, Bingo, Zora).
 *
 * Three layers, no network:
 *   1. Behaviour — the real shared registry is transpiled and executed: the
 *      tuning ranges, the language list, unknown ids, the 320-character cap and
 *      the cache key all have to behave.
 *   2. Wiring — the Edge Function must authenticate, cache by content and never
 *      hard-code a voice id; the client must fall back rather than go silent.
 *   3. Copy — nothing may still promise that the characters are device-only.
 *
 * Run with `node scripts/check-character-voices.cjs`.
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'supabase', 'functions', '_shared', 'characterVoices.ts');
const EDGE = path.join(ROOT, 'supabase', 'functions', 'character-voice', 'index.ts');
const PRONUNCIATION = path.join(ROOT, 'lib', 'pronunciation.ts');
const CLIENT = path.join(ROOT, 'lib', 'studioVoices.ts');
const LAYOUT = path.join(ROOT, 'src', 'app', '_layout.tsx');
const PAYWALL = path.join(ROOT, 'src', 'app', 'paywall.tsx');
const SETTINGS = path.join(ROOT, 'src', 'app', 'settings.tsx');

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

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function loadRegistry() {
  const source = read(REGISTRY);
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: REGISTRY,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(diagnostics.map((d) => d.messageText).join('\n'));
  }
  const compiled = { exports: {} };
  // eslint-disable-next-line no-new-func -- executing our own transpiled source.
  new Function('exports', 'require', 'module', outputText)(compiled.exports, require, compiled);
  return compiled.exports;
}

let registry;
try {
  registry = loadRegistry();
} catch (error) {
  console.error(`[FAIL] could not load the character voice registry\n       ${error.message}`);
  process.exit(1);
}

const { CHARACTER_VOICES, MAX_CHARACTER_LINE_CHARS } = registry;

// --- registry -----------------------------------------------------------

check('all three characters carry a studio voice', () => {
  assert.ok(Array.isArray(CHARACTER_VOICES), 'CHARACTER_VOICES must be an array.');
  assert.deepEqual(
    CHARACTER_VOICES.map((voice) => voice.id).sort(),
    ['bingo', 'livia', 'zora'],
    'The cast must be Livia, Bingo and Zora.'
  );
  for (const voice of CHARACTER_VOICES) {
    assert.match(String(voice.voiceId), /^[A-Za-z0-9]{20}$/, `${voice.name}: not an ElevenLabs voice id.`);
    assert.ok(voice.studioName && /—/.test(voice.studioName), `${voice.name}: must name the studio voice.`);
    assert.ok(voice.note && voice.note.length > 20, `${voice.name}: needs an honest one-line description.`);
  }
});

check('no two characters share a voice', () => {
  const ids = CHARACTER_VOICES.map((voice) => voice.voiceId);
  assert.equal(new Set(ids).size, ids.length, 'Two characters on one voice would erase the distinction.');
});

check('every character is tuned inside the provider limits', () => {
  for (const voice of CHARACTER_VOICES) {
    for (const field of ['stability', 'similarityBoost', 'style']) {
      const value = voice[field];
      assert.equal(typeof value, 'number', `${voice.name}: ${field} must be a number.`);
      assert.ok(value >= 0 && value <= 1, `${voice.name}: ${field}=${value} is outside 0..1.`);
    }
    assert.ok(voice.speed >= 0.7 && voice.speed <= 1.2, `${voice.name}: speed=${voice.speed} is outside 0.7..1.2.`);
    assert.equal(voice.useSpeakerBoost, true, `${voice.name}: speaker boost should be on.`);
    assert.equal(voice.modelId, 'eleven_multilingual_v2', `${voice.name}: needs the multilingual model.`);
  }
});

check('characters differ from the narrator settings, so tuning is real', () => {
  const stabilities = new Set(CHARACTER_VOICES.map((voice) => voice.stability));
  assert.ok(stabilities.size >= 2, 'All characters share one stability value — that is not tuning.');
  const styles = CHARACTER_VOICES.map((voice) => voice.style);
  assert.ok(Math.max(...styles) - Math.min(...styles) >= 0.1, 'Style is too uniform to be a character difference.');
});

check('Swahili is excluded instead of being read with English phonetics', () => {
  for (const voice of CHARACTER_VOICES) {
    assert.ok(
      !voice.languages.includes('sw'),
      `${voice.name}: the multilingual model does not speak Swahili; it must stay on the device voice.`
    );
  }
  assert.equal(registry.characterSpeaks('livia', 'sw-KE'), false, 'Swahili must not reach the studio voice.');
  assert.equal(registry.characterSpeaks('livia', 'es-MX'), true, 'Spanish must reach the studio voice.');
});

check('an unknown id is refused before it can reach the provider', () => {
  assert.equal(registry.characterVoice('', undefined), null);
  assert.equal(registry.characterVoice('narrator'), null);
  assert.equal(registry.characterVoice('LIVIA'), null, 'Ids are exact; no case coercion.');
  assert.equal(registry.characterSpeaks('nobody', 'en'), false);
});

// --- request ------------------------------------------------------------

check('the provider request carries the character tuning', () => {
  const voice = registry.characterVoice('bingo');
  const request = registry.buildCharacterSpeechRequest(voice, '  Hey,  ready?  ', { apiKey: 'test-key' });
  assert.match(request.url, new RegExp(`${voice.voiceId}\\?output_format=mp3_44100_128$`));
  assert.equal(request.headers['xi-api-key'], 'test-key');
  assert.equal(request.body.text, 'Hey, ready?');
  assert.equal(request.body.model_id, voice.modelId);
  assert.deepEqual(Object.keys(request.body.voice_settings).sort(), [
    'similarity_boost',
    'speed',
    'stability',
    'style',
    'use_speaker_boost',
  ]);
  assert.equal(request.body.voice_settings.speed, voice.speed);
});

check('only the provider ceiling refuses a line, and it is the provider\'s, not ours', () => {
  const voice = registry.characterVoice('zora');
  assert.throws(() => registry.buildCharacterSpeechRequest(voice, '   ', { apiKey: 'k' }), /Nothing to say/);
  assert.throws(() => registry.buildCharacterSpeechRequest(voice, 'Hi', { apiKey: '' }), /API key/);
  assert.throws(
    () => registry.buildCharacterSpeechRequest(voice, 'a'.repeat(MAX_CHARACTER_LINE_CHARS + 1), { apiKey: 'k' }),
    /ElevenLabs accepts at most/
  );
  assert.doesNotThrow(() =>
    registry.buildCharacterSpeechRequest(voice, 'a'.repeat(MAX_CHARACTER_LINE_CHARS), { apiKey: 'k' })
  );
  // A paragraph is a normal character line. Only ElevenLabs' own per-request
  // limit may stop it — the app must not impose a shorter one.
  assert.equal(MAX_CHARACTER_LINE_CHARS, 10_000, 'The ceiling must be the provider\'s, not a product cap.');
  assert.doesNotThrow(() =>
    registry.buildCharacterSpeechRequest(voice, 'word '.repeat(400).trim(), { apiKey: 'k' }),
    'A 2,000-character paragraph must still synthesize.'
  );
});

check('the cache key tracks text and tuning but ignores whitespace', () => {
  const voice = registry.characterVoice('livia');
  const a = registry.characterLineKey(voice, 'Hola, ¿cómo estás?', 'es');
  const b = registry.characterLineKey(voice, '  Hola,   ¿cómo estás? ', 'es');
  const otherLang = registry.characterLineKey(voice, 'Hola, ¿cómo estás?', 'fr');
  const retuned = registry.characterLineKey({ ...voice, style: 0.9 }, 'Hola, ¿cómo estás?', 'es');
  assert.equal(a, b, 'Whitespace must not create a second paid clip.');
  assert.notEqual(a, otherLang, 'Language must be part of the key.');
  assert.notEqual(a, retuned, 'Retuning a character must produce a new clip, not the old delivery.');
});

// --- edge function ------------------------------------------------------

check('the Edge Function authenticates and falls back instead of erroring out', () => {
  const source = read(EDGE);
  assert.match(source, /getUser\(jwt\)/, 'The function must verify the caller.');
  assert.ok(
    source.indexOf('getUser(jwt)') < source.indexOf('characterVoice(payload.character)'),
    'Auth must run before the character is read.'
  );
  assert.match(source, /fallback: true/, 'Every failure must tell the client to use the device voice.');
  assert.match(source, /characterSpeaks\(voice\.id, language\)/, 'Unsupported languages must fall back, not synthesize.');
});

check('the Edge Function caches the audio and never hard-codes a voice', () => {
  const source = read(EDGE);
  assert.match(source, /createSignedUrl\(path/, 'A cached clip must be served as a signed URL.');
  assert.match(source, /\.upload\(path, audio/, 'New clips must be stored.');
  assert.match(source, /contentType: 'audio\/mpeg'/);
  assert.match(source, /characterLineKey\(/, 'The cache key must come from the shared registry.');
  assert.doesNotMatch(
    source,
    /\b(?=[A-Za-z0-9]{20}\b)(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{20}\b/,
    'No voice id may be hard-coded in the function — the registry owns them.'
  );
});

// --- client -------------------------------------------------------------

check('the lesson path tries the studio voice, then the device voice', () => {
  const source = read(PRONUNCIATION);
  assert.match(source, /export function setStudioLinePlayer/, 'The seam must be injectable.');
  assert.match(source, /studioPlayer\(\{ character, text: phrase, language: language\.base, slow \}\)/);
  assert.ok(
    source.indexOf('studioName = await studioPlayer') < source.indexOf('const ok = await speakChunk'),
    'The studio attempt must come before the device utterance.'
  );
  assert.doesNotMatch(source, /expo-audio/, 'pronunciation.ts must stay free of audio imports so Node guards run it.');
  assert.match(source, /studio\?: boolean/, 'The result must say which voice actually spoke.');
});

check('the client gives up after repeated failures instead of stalling every line', () => {
  const source = read(CLIENT);
  assert.match(source, /MAX_CONSECUTIVE_FAILURES/);
  assert.match(source, /studioVoicesAvailable\(\)/);
  assert.match(source, /return null;/, 'Failures must return null so the caller falls back.');
  assert.match(source, /characterSpeaks\(voice\.id, request\.language\)/, 'Swahili must not cost a request.');
  assert.match(
    source,
    /let started = false/,
    'A blocked autoplay must not count as a played line — the timeout may only succeed after playback started.'
  );
  assert.match(source, /finish\(started\)/, 'The safety timer must depend on observed playback.');
});

check('the app registers the studio player once, at startup', () => {
  const layout = read(LAYOUT);
  assert.match(layout, /setStudioLinePlayer\(playStudioLine, stopStudioLine\)/);
});

check('the product copy no longer promises device-only characters', () => {
  assert.doesNotMatch(read(PAYWALL), /Livia, Bingo and Zora stay on-device on both plans/);
  assert.match(read(PAYWALL), /fall back to your device voice/);
  assert.match(read(SETTINGS), /studio voices when you are online/);
});

check('the voice audit names a studio line as a studio voice, not a device one', () => {
  const settings = read(SETTINGS);
  // A learner reading the audit must see which voice they actually heard.
  assert.match(settings, /'Studio voice'/);
  assert.match(settings, /Every character played its studio voice over the connection/);
  assert.match(
    settings,
    /!capture\.result\.studio && capture\.result\.matchedVoice/,
    'Studio lines must not also be counted as device-native voices.'
  );
});

if (failures > 0) {
  console.error(`\n[FAIL] ${failures} character voice check(s) failed.`);
  process.exit(1);
}
console.log('\n[ok] character studio voices are tuned, cached and fallback-safe');
