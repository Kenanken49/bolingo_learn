#!/usr/bin/env node
/**
 * Cold TTS session regression.
 *
 * The bug this prevents: a cold Android TTS engine takes a few seconds to
 * enumerate its installed voices. The voice loader used to give up after 1.2 s,
 * so the first phrase of a session spoke with the engine default (often an
 * English voice) even though a native Swahili voice was installed. Subsequent
 * phrases were correct, which made the problem easy to miss in a quick check.
 *
 * This guard runs the real `speakAs` path — the same Livia call the lesson and
 * the device audit use — against a stubbed `expo-speech` whose voice list
 * arrives 2.5 s late, then speaks every phrase in the three Swahili lessons
 * added after the original bank (every question of every lesson, ≥5 each).
 * It asserts:
 *
 *   - the cold call waits for the list instead of falling back,
 *   - the first phrase gets the native Swahili voice the cast planner assigns
 *     to Livia, with a sw locale,
 *   - every phrase reuses that same native voice,
 *   - the list is enumerated once and the settled cast is cached.
 *
 * No device or network is needed. Runs inside `npm test`, and directly:
 *   npm run check:cold-tts
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const PRONUNCIATION = path.join(ROOT, 'lib', 'pronunciation.ts');
const AUDIT_ROUTE = path.join(ROOT, 'src', 'app', 'dev', 'swahili-voice-audit.tsx');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

/** A cold engine: the list is only ready after this delay. */
const COLD_VOICE_DELAY_MS = 2500;
/** Android's documented cold-start budget in lib/pronunciation.ts. */
const NATIVE_VOICE_BUDGET_MS = 4000;

const LESSON_IDS = ['swahili-questions', 'swahili-adjectives', 'swahili-health'];

const INSTALLED_VOICES = [
  { identifier: 'sw-ke-ava-001', name: 'Ava', language: 'sw-KE', quality: 'Enhanced' },
  { identifier: 'sw-ke-daniel-002', name: 'Daniel', language: 'sw-KE', quality: 'Default' },
  { identifier: 'en-us-ava-003', name: 'Ava', language: 'en-US', quality: 'Enhanced' },
];

let voiceListCalls = 0;
const spoken = [];
const stub = {
  getAvailableVoicesAsync() {
    voiceListCalls += 1;
    if (voiceListCalls === 1) {
      return new Promise((resolve) => setTimeout(() => resolve(INSTALLED_VOICES), COLD_VOICE_DELAY_MS));
    }
    return Promise.resolve(INSTALLED_VOICES);
  },
  speak(text, options) {
    spoken.push({ text, options });
    // Finish immediately; the expression timing is not what this check guards.
    queueMicrotask(() => options?.onDone?.());
  },
  stop() {
    return Promise.resolve();
  },
};

// The module under test imports React Native for Platform and expo-speech for
// the engine. Supply only those surfaces, so the real pronunciation code runs
// unmodified.
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === 'react-native') return { Platform: { OS: 'android' } };
  if (request === 'expo-speech') return stub;
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(
      `${path.relative(ROOT, filename)} has TypeScript errors: ` +
        diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')
    );
  }
  module._compile(outputText, filename);
};

const pronunciation = require(PRONUNCIATION);
const languages = require(path.join(ROOT, 'lib', 'languages.ts'));
const casting = require(path.join(ROOT, 'lib', 'voiceCasting.ts'));

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/** The speaker appends terminal punctuation; compare the phrase itself. */
function phraseKey(text) {
  return String(text)
    .trim()
    .replace(/[.!?…]+$/u, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function lessonPhrases() {
  return LESSON_IDS.flatMap((lessonId) => {
    const lesson = languages.getLanguageLesson(lessonId);
    assert.ok(lesson, `${lessonId} is missing from the language catalog`);
    return lesson.questions
      .map((question, index) => ({
        key: `${lessonId}:${index + 1}`,
        lesson: lesson.title,
        phrase: pronunciation.phraseForQuestion(question, pronunciation.SWAHILI_SPEECH),
      }))
      // A match board pairs phrases; it has no phrase of its own to speak.
      .filter((item) => item.phrase.trim().length > 0);
  });
}

const items = lessonPhrases();
const expectedLivia = casting.planVoiceCast(INSTALLED_VOICES, pronunciation.SWAHILI_SPEECH).livia;

async function run() {
  const perLesson = LESSON_IDS.map(
    (id) =>
      languages
        .getLanguageLesson(id)
        .questions.filter((q) => q.kind !== 'match').length
  );
  assert.equal(
    items.length,
    perLesson.reduce((sum, n) => sum + n, 0),
    'a narratable Swahili lesson question has no phrase'
  );
  assert.ok(
    perLesson.every((n) => n >= 5),
    `each cold-audit lesson must keep at least 5 phrases (found ${perLesson.join(', ')})`
  );
  assert.ok(expectedLivia.voice, 'the cast planner did not assign Livia a native Swahili voice');
  assert.equal(
    expectedLivia.voice.language.split('-')[0].toLowerCase(),
    'sw',
    'the planner assigned Livia a non-Swahili voice'
  );
  assert.ok(
    items.every((item) => item.phrase && item.phrase.trim().length > 0),
    'a lesson phrase resolved to empty text'
  );

  const startedAt = Date.now();
  const results = [];
  for (const item of items) {
    results.push(
      await pronunciation.speakAs({
        character: 'livia',
        text: item.phrase,
        language: pronunciation.SWAHILI_SPEECH,
      })
    );
  }
  const elapsed = Date.now() - startedAt;

  // 1. The cold start actually waited for the late list (the old 1.2 s cap
  //    would have resolved first and spoken with the engine default).
  assert.ok(
    elapsed >= COLD_VOICE_DELAY_MS,
    `the session spoke in ${elapsed} ms, before the ${COLD_VOICE_DELAY_MS} ms cold voice list arrived`
  );

  // 2. The first phrase — the one that used to be wrong — got Livia's native
  //    Swahili assignment, not the engine default.
  const first = spoken[0];
  assert.ok(first, 'the first phrase never reached the speech engine');
  assert.equal(
    first.options.voice,
    expectedLivia.voice.identifier,
    `first phrase used ${first.options.voice ?? 'the engine default'} instead of Livia's native voice`
  );
  assert.equal(
    first.options.language,
    expectedLivia.locale,
    `first phrase requested ${first.options.language} instead of ${expectedLivia.locale}`
  );
  assert.match(
    String(first.options.language).toLowerCase(),
    /^sw([-_]|$)/,
    'the first phrase did not request a Swahili locale'
  );
  assert.equal(results[0].matchedVoice, true, 'the first result was not marked native');
  assert.equal(results[0].approximate, false, 'the first result was marked approximate');
  assert.equal(results[0].voiceName, expectedLivia.voice.name, 'the first result named the wrong voice');
  assert.equal(
    phraseKey(first.text),
    phraseKey(items[0].phrase),
    'the first phrase text drifted from the lesson model'
  );

  // 3. Every phrase in the three lessons reuses that same native voice.
  assert.equal(spoken.length, items.length, 'not every lesson phrase reached the speech engine');
  for (const [index, call] of spoken.entries()) {
    const item = items[index];
    assert.equal(phraseKey(call.text), phraseKey(item.phrase), `${item.key} spoke the wrong phrase`);
    assert.equal(
      call.options.voice,
      expectedLivia.voice.identifier,
      `${item.key} used ${call.options.voice ?? 'the engine default'} instead of Livia's native voice`
    );
    assert.match(
      String(call.options.language).toLowerCase(),
      /^sw([-_]|$)/,
      `${item.key} requested a non-Swahili locale (${call.options.language})`
    );
    assert.equal(results[index].matchedVoice, true, `${item.key} was not marked native`);
    assert.equal(results[index].approximate, false, `${item.key} used an approximate voice`);
  }

  // 4. The list was enumerated once and the settled plan was cached: later
  //    phrases must not re-pay the cold-start wait or re-cast Livia.
  assert.equal(voiceListCalls, 1, `the voice list was enumerated ${voiceListCalls} times, not once`);

  // 5. Static guards: keep the cold budget, the shared path and the device
  //    audit wired together.
  const source = read(PRONUNCIATION);
  const budget = /Platform\.OS === 'web' \? 1200 : (\d+)/.exec(source);
  assert.ok(budget, 'the native/web voice-list budget is no longer visible in pronunciation.ts');
  assert.ok(
    Number(budget[1]) >= NATIVE_VOICE_BUDGET_MS,
    `the native cold-start budget dropped to ${budget[1]} ms; a cold engine will speak before its voice list arrives`
  );
  assert.match(
    source,
    /if \(voices\.length === 0\) voicesPromise = null;/,
    'an empty (cold) voice list is cached, so later phrases cannot recover'
  );
  assert.match(
    source,
    /if \(voices\.length === 0\) castPlans\.delete\(key\);/,
    'an empty cast plan is cached, so later phrases cannot recover'
  );

  const audit = read(AUDIT_ROUTE);
  for (const lessonId of LESSON_IDS) {
    assert.ok(audit.includes(`'${lessonId}'`), `the device audit no longer covers ${lessonId}`);
  }
  assert.ok(audit.includes("character: 'livia'"), 'the device audit no longer speaks as Livia');
  assert.ok(audit.includes('SWAHILI_SPEECH'), 'the device audit no longer requests Swahili');

  const pkg = JSON.parse(read(PACKAGE_JSON));
  assert.equal(pkg.scripts['check:cold-tts'], 'node scripts/check-cold-tts-session.cjs');
  assert.match(pkg.scripts.test, /check-cold-tts-session\.cjs/);

  console.log(
    `Cold TTS session OK — first of ${items.length} Swahili phrases used Livia's ${expectedLivia.voice.name} ` +
      `(${expectedLivia.locale}) after waiting ${elapsed} ms for the cold voice list.`
  );
}

run().catch((error) => {
  console.error('Cold TTS session check failed:');
  console.error(`  ✗ ${error.message}`);
  process.exitCode = 1;
});

