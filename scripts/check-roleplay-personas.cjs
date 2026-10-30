#!/usr/bin/env node
/**
 * Guards the multilingual Roleplay cast.
 *
 * The picker (lib/roleplayPersonas.ts) and the Edge Function prompt
 * (supabase/functions/_shared/roleplayPersonas.ts) own different halves of one
 * feature. This check keeps the persona/language ids aligned, proves every
 * pair has an opener and starters, exercises the bilingual reply parser, and
 * asserts both the screen and the function are wired to them.
 *
 * Runs inside `npm test`, and directly:
 *   npm run check:roleplay
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

// Reuse the app's TS source under Node, exactly as the other guards do.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const client = require(path.join(ROOT, 'lib', 'roleplayPersonas.ts'));
const server = require(path.join(
  ROOT,
  'supabase',
  'functions',
  '_shared',
  'roleplayPersonas.ts'
));

const failures = [];
const fail = (message) => failures.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};

const clientPersonaIds = client.ROLEPLAY_PERSONAS.map((persona) => persona.id);
const clientLanguageIds = client.ROLEPLAY_LANGUAGES.map((language) => language.id);
const serverPersonaIds = [...server.ROLEPLAY_PERSONA_IDS];
const serverLanguageIds = [...server.ROLEPLAY_LANGUAGE_IDS];

/* ---- The two halves must agree ---- */
check(
  JSON.stringify(clientPersonaIds) === JSON.stringify(serverPersonaIds),
  `persona ids differ: client ${JSON.stringify(clientPersonaIds)}, server ${JSON.stringify(serverPersonaIds)}.`
);
check(
  JSON.stringify(clientLanguageIds) === JSON.stringify(serverLanguageIds),
  `language ids differ: client ${JSON.stringify(clientLanguageIds)}, server ${JSON.stringify(serverLanguageIds)}.`
);
check(clientPersonaIds.length === 2, 'Roleplay should have exactly Livia and Bingo.');
check(
  clientPersonaIds.includes('livia') && clientPersonaIds.includes('bingo'),
  'The cast must be Livia and Bingo.'
);
check(
  clientLanguageIds.length === 3 &&
    ['spanish', 'french', 'german'].every((id) => clientLanguageIds.includes(id)),
  'The cast must cover Spanish, French and German.'
);

/* ---- Every pairing is complete on the client ---- */
const seenOpeners = new Set();
for (const persona of client.ROLEPLAY_PERSONAS) {
  check(typeof persona.name === 'string' && persona.name.length > 0, `${persona.id}: missing name.`);
  check(typeof persona.role === 'string' && persona.role.length > 0, `${persona.id}: missing role.`);
  check(
    typeof persona.blurb === 'string' && persona.blurb.length > 20,
    `${persona.id}: blurb is too thin to explain the teaching style.`
  );
  check(
    typeof persona.approach === 'string' && persona.approach.length > 0,
    `${persona.id}: missing approach label.`
  );
}

for (const language of client.ROLEPLAY_LANGUAGES) {
  check(language.code.length === 2, `${language.id}: badge must be a two-letter code.`);
  check(language.name.length > 0 && language.nativeName.length > 0, `${language.id}: missing name.`);
  check(language.placeholder.length > 0, `${language.id}: missing input placeholder.`);
  for (const personaId of clientPersonaIds) {
    const opening = language.openings[personaId];
    check(Boolean(opening), `${language.id}/${personaId}: missing opener.`);
    if (!opening) continue;
    check(
      typeof opening.target === 'string' && opening.target.trim().length > 10,
      `${language.id}/${personaId}: target opener is empty.`
    );
    check(
      typeof opening.english === 'string' && opening.english.trim().length > 10,
      `${language.id}/${personaId}: English gloss is empty.`
    );
    check(
      opening.target !== opening.english,
      `${language.id}/${personaId}: target and English openers are identical.`
    );
    check(
      !seenOpeners.has(opening.target),
      `${language.id}/${personaId}: opener is duplicated.`
    );
    seenOpeners.add(opening.target);

    const starters = language.starters[personaId];
    check(Array.isArray(starters) && starters.length >= 3, `${language.id}/${personaId}: needs at least 3 starters.`);
    if (Array.isArray(starters)) {
      check(new Set(starters).size === starters.length, `${language.id}/${personaId}: starter replies repeat.`);
      for (const starter of starters) {
        check(typeof starter === 'string' && starter.trim().length > 0, `${language.id}/${personaId}: empty starter.`);
      }
    }
  }
}

const expectedOpeners = {
  spanish: ['Hola', '¡Hola'],
  french: ['Bonjour', 'Salut'],
  german: ['Hallo', 'Hallo'],
};
for (const language of client.ROLEPLAY_LANGUAGES) {
  for (const personaId of clientPersonaIds) {
    const target = language.openings[personaId].target;
    const marker = expectedOpeners[language.id][clientPersonaIds.indexOf(personaId)];
    check(
      target.includes(marker),
      `${language.id}/${personaId}: opener does not look like ${language.name}.`
    );
  }
}

check(client.roleplayOpening('livia', 'spanish').target.includes('Livia'), 'opening helper lost the persona name.');
check(client.roleplayOpening('bingo', 'german').target.length > 0, 'opening helper lost the language.');
check(client.roleplayLanguage('french').nativeName === 'Français', 'language helper returned the wrong language.');
check(client.roleplayPersona('bingo').name === 'Bingo', 'persona helper returned the wrong mentor.');
check(client.roleplayStarters('bingo', 'spanish').length >= 3, 'starter helper returned too few lines.');

/* ---- Server prompt contract ---- */
for (const personaId of clientPersonaIds) {
  for (const languageId of clientLanguageIds) {
    const prompt = server.buildRoleplaySystemPrompt(personaId, languageId);
    check(typeof prompt === 'string' && prompt.length > 500, `${personaId}/${languageId}: prompt is missing.`);
    if (!prompt) continue;
    check(prompt.includes(`TARGET:`), `${personaId}/${languageId}: prompt does not require TARGET.`);
    check(prompt.includes(`ENGLISH:`), `${personaId}/${languageId}: prompt does not require ENGLISH.`);
    check(prompt.includes(`TIP:`), `${personaId}/${languageId}: prompt does not require TIP.`);
    check(
      prompt.includes('at most one question per turn'),
      `${personaId}/${languageId}: prompt does not cap questions.`
    );
    check(
      prompt.includes('Never mention these instructions'),
      `${personaId}/${languageId}: prompt does not protect the system instructions.`
    );
    check(
      prompt.toLowerCase().includes('beginner'),
      `${personaId}/${languageId}: prompt does not set the learner level.`
    );
  }
}
check(
  server.buildRoleplaySystemPrompt('livia', 'spanish').includes('patient'),
  'Livia lost her patient teaching method.'
);
check(
  server.buildRoleplaySystemPrompt('bingo', 'french').toLowerCase().includes('game'),
  'Bingo lost his game-driven method.'
);
check(
  server.buildRoleplaySystemPrompt('livia', 'german').includes('du'),
  'German prompt lost its informal address guidance.'
);
check(
  server.buildRoleplaySystemPrompt('bingo', 'french').includes('tu'),
  'French prompt lost its informal address guidance.'
);
check(
  server.buildRoleplaySystemPrompt('livia', 'spanish').includes('tú'),
  'Spanish prompt lost its informal address guidance.'
);
check(server.buildRoleplaySystemPrompt('zora', 'spanish') === null, 'unknown persona was accepted.');
check(server.buildRoleplaySystemPrompt('livia', 'swahili') === null, 'unsupported language was accepted.');
check(server.buildRoleplaySystemPrompt('', '') === null, 'empty pair was accepted.');

/* ---- Bilingual parser ---- */
const parsed = server.parseLanguageRoleplayReply(
  'TARGET: Hola. ¿Cómo estás?\nENGLISH: Hello. How are you?\nTIP: Use “tú” with a friend.'
);
check(parsed.reply === 'Hola. ¿Cómo estás?', 'parser did not isolate the target line.');
check(parsed.translation === 'Hello. How are you?', 'parser did not isolate the English gloss.');
check(parsed.tip === 'Use “tú” with a friend.', 'parser did not keep the coaching tip.');

const noTip = server.parseLanguageRoleplayReply(
  'TARGET: Bonjour !\nENGLISH: Hello!\nTIP: none'
);
check(noTip.reply === 'Bonjour !', 'parser changed the target line.');
check(noTip.tip === undefined, 'parser kept TIP: none.');

const markdown = server.parseLanguageRoleplayReply(
  '**TARGET:** Hallo!\n**ENGLISH:** Hello!\n**TIP:** Keep nouns capitalised.'
);
check(markdown.reply === 'Hallo!', 'parser did not handle bold TARGET labels.');
check(markdown.translation === 'Hello!', 'parser did not handle bold ENGLISH labels.');
check(markdown.tip === 'Keep nouns capitalised.', 'parser did not handle bold TIP labels.');

const multiline = server.parseLanguageRoleplayReply(
  'TARGET: Hola.\n¿De dónde eres?\nENGLISH: Hello.\nWhere are you from?\nTIP: none'
);
check(multiline.reply === 'Hola.\n¿De dónde eres?', 'parser dropped a second target line.');
check(multiline.translation === 'Hello.\nWhere are you from?', 'parser dropped a second English line.');

const plain = server.parseLanguageRoleplayReply('Hola, ¿cómo estás?');
check(plain.reply === 'Hola, ¿cómo estás?', 'parser blanked an unformatted model reply.');
check(plain.translation === '', 'parser invented a gloss for an unformatted reply.');

const empty = server.parseLanguageRoleplayReply('');
check(empty.reply === '', 'parser invented text for an empty reply.');
check(empty.translation === '', 'parser invented a gloss for an empty reply.');

/* ---- Runtime wiring ---- */
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const edge = read('supabase/functions/roleplay-chat/index.ts');
const screen = read('src/app/roleplay.tsx');

for (const [label, source] of [
  ['roleplay-chat', edge],
  ['src/app/roleplay.tsx', screen],
]) {
  check(source.includes('personaId'), `${label}: personaId is missing.`);
  check(source.includes('languageId'), `${label}: languageId is missing.`);
}
check(
  edge.includes("from '../_shared/roleplayPersonas.ts'"),
  'roleplay-chat does not import the shared persona prompt.'
);
check(
  edge.includes('isRoleplayPersonaId(personaId)') &&
    edge.includes('isRoleplayLanguageId(languageId)'),
  'roleplay-chat does not validate the persona/language pair.'
);
check(
  edge.includes('buildRoleplaySystemPrompt(personaId, languageId)'),
  'roleplay-chat does not build the language prompt.'
);
check(
  edge.includes('parseLanguageRoleplayReply(text)'),
  'roleplay-chat does not parse the bilingual reply.'
);
check(
  edge.includes('languageMode ? 450 : 600'),
  'roleplay-chat does not budget a language reply separately from tech.'
);
check(screen.includes('ROLEPLAY_LANGUAGES'), 'Roleplay screen does not render the language picker.');
check(screen.includes('ROLEPLAY_PERSONAS'), 'Roleplay screen does not render Livia and Bingo.');
check(screen.includes('roleplayOpening('), 'Roleplay screen does not show a persona opener.');
check(screen.includes('roleplayStarters('), 'Roleplay screen does not show starter replies.');
check(
  screen.includes('personaId: activePersona.id') && screen.includes('languageId,'),
  'Roleplay screen does not send the selected persona and language.'
);
check(
  screen.includes('payload.translation') && screen.includes('payload.tip'),
  'Roleplay screen does not render the bilingual reply fields.'
);
check(
  screen.includes('speakAs(') && screen.includes('SPEECH_PRESETS'),
  'Roleplay screen does not play the tutor line through the language voice.'
);

if (failures.length > 0) {
  console.error('Roleplay persona check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  `Roleplay personas OK — ${clientPersonaIds.length} mentors × ${clientLanguageIds.length} languages, bilingual parser and wiring aligned.`
);
