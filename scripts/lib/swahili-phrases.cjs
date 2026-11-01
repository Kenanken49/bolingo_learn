/* global __dirname -- Node CJS globals. */

'use strict';

/**
 * One source of truth for the Swahili phrases that get a natural Fliki clip.
 *
 * The lesson banks live in TypeScript, so this loads them through the project's
 * own compiler and stubs the two native modules that `pronunciation.ts` imports.
 * Both the Fliki generator and its contract check use this list, so a new
 * Swahili question can never silently ship without narration.
 */

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const ROOT = path.resolve(__dirname, '..', '..');

/** Lessons that were authored from the Swahili phrase video. */
const SWAHILI_LESSON_IDS = ['swahili-questions', 'swahili-adjectives', 'swahili-health'];

let stubsInstalled = false;
let tsRegistered = false;

function registerTypeScript() {
  if (tsRegistered) return;
  const ts = require(path.join(ROOT, 'node_modules', 'typescript'));
  const compile = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    }).outputText;
    module._compile(output, filename);
  };
  Module._extensions['.ts'] = compile;
  Module._extensions['.tsx'] = compile;
  tsRegistered = true;
}

function installNativeStubs() {
  if (stubsInstalled) return;
  const originalLoad = Module._load;
  const stubs = {
    'expo-speech': {
      speak: () => {},
      stop: async () => {},
      getAvailableVoicesAsync: async () => [],
      isSpeakingAsync: async () => false,
    },
    'react-native': {
      Platform: { OS: 'android', select: (options) => options.android ?? options.default },
    },
  };
  Module._load = function load(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  stubsInstalled = true;
}

/** Collapse a phrase to a stable lookup key: case, punctuation and spacing only. */
function phraseKey(text) {
  return String(text)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** File-safe name derived from the key (Swahili is Latin-script). */
function phraseSlug(text) {
  return phraseKey(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Every spoken Swahili phrase across the three new lessons, deduplicated.
 * Each entry keeps the lesson and question that first introduced it so the
 * generated manifest is reviewable and the app can key clips by text.
 */
function getSwahiliPhrases() {
  registerTypeScript();
  installNativeStubs();

  const { getLanguageLesson } = require(path.join(ROOT, 'lib', 'languages.ts'));
  const { phraseForQuestion, SWAHILI_SPEECH } = require(path.join(ROOT, 'lib', 'pronunciation.ts'));

  const byKey = new Map();
  for (const lessonId of SWAHILI_LESSON_IDS) {
    const lesson = getLanguageLesson(lessonId);
    if (!lesson) throw new Error(`Swahili lesson not found: ${lessonId}`);
    lesson.questions.forEach((question, index) => {
      const phrase = phraseForQuestion(question, SWAHILI_SPEECH).trim();
      const key = phraseKey(phrase);
      if (!key) {
        // A match board pairs phrases instead of presenting one, so it has
        // nothing to narrate. Any other question losing its phrase is a bug.
        if (question.kind === 'match') return;
        throw new Error(`Empty phrase at ${lessonId}:${index}`);
      }
      if (byKey.has(key)) return;
      byKey.set(key, {
        key,
        slug: phraseSlug(phrase),
        phrase,
        lessonId,
        lessonTitle: lesson.title,
        questionIndex: index,
        question: question.prompt,
      });
    });
  }

  return [...byKey.values()];
}

module.exports = {
  ROOT,
  SWAHILI_LESSON_IDS,
  getSwahiliPhrases,
  phraseKey,
  phraseSlug,
};
