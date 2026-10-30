#!/usr/bin/env node
/**
 * Guards deterministic character voice casting.
 *
 * The regression this prevents: whichever character was auditioned first used
 * to claim the best installed voice, permanently changing the voice that same
 * character got in lessons. The planner is now a pure whole-cast assignment in
 * fixed Livia → Bingo → Zora order, with a stable tie-break. This check runs the
 * real planner against synthetic voice lists in several orders.
 *
 * Runs inside `npm test`, and directly:
 *   npm run check:casting
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

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

const casting = require(path.join(ROOT, 'lib', 'voiceCasting.ts'));

const failures = [];
const fail = (message) => failures.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};

const voice = (identifier, name, language, quality = 'Default') => ({
  identifier,
  name,
  language,
  quality,
});

const SPANISH = {
  base: 'es',
  locales: ['es-MX', 'es-US', 'es-ES'],
  related: ['it'],
};

const cast = () => [
  voice('es-mx-ava', 'Ava', 'es-MX'),
  voice('es-mx-daniel', 'Daniel', 'es-MX'),
  voice('es-mx-samantha', 'Samantha', 'es-MX'),
  voice('es-es-paulina', 'Paulina', 'es-ES'),
];

const ids = (plan) => ({
  livia: plan.livia.voice?.identifier ?? null,
  bingo: plan.bingo.voice?.identifier ?? null,
  zora: plan.zora.voice?.identifier ?? null,
});

/* ---- Fixed order and stable ranking ---- */
check(
  JSON.stringify(casting.VOICE_CAST_ORDER) === JSON.stringify(['livia', 'bingo', 'zora']),
  'cast order changed; auditions and lessons can drift again.'
);
check(
  casting.CHARACTER_GENDER.livia === 'feminine' &&
    casting.CHARACTER_GENDER.bingo === 'masculine' &&
    casting.CHARACTER_GENDER.zora === 'feminine',
  'character gender map changed.'
);

const base = casting.planVoiceCast(cast(), SPANISH);
check(base.livia.voice?.identifier === 'es-mx-ava', 'Livia did not get the best feminine voice.');
check(base.bingo.voice?.identifier === 'es-mx-daniel', 'Bingo did not get the best masculine voice.');
check(base.zora.voice?.identifier === 'es-mx-samantha', 'Zora did not get the remaining feminine voice.');
check(
  new Set([base.livia.voice?.identifier, base.bingo.voice?.identifier, base.zora.voice?.identifier]).size === 3,
  'characters did not receive three distinct voices when three were available.'
);
check(
  base.livia.matchedVoice && base.bingo.matchedVoice && base.zora.matchedVoice,
  'native assignments were not marked as native.'
);
check(
  !base.livia.approximate && !base.bingo.approximate && !base.zora.approximate,
  'native assignments were marked approximate.'
);

/* ---- OS list order is irrelevant ---- */
const reversed = casting.planVoiceCast([...cast()].reverse(), SPANISH);
check(
  JSON.stringify(ids(reversed)) === JSON.stringify(ids(base)),
  'reversing the installed-voice list remapped the cast.'
);
const rotated = casting.planVoiceCast([...cast()].slice(2).concat([...cast()].slice(0, 2)), SPANISH);
check(
  JSON.stringify(ids(rotated)) === JSON.stringify(ids(base)),
  'rotating the installed-voice list remapped the cast.'
);

/* ---- The same call twice is the same assignment ---- */
const repeat = casting.planVoiceCast(cast(), SPANISH);
check(
  JSON.stringify(ids(repeat)) === JSON.stringify(ids(base)),
  'repeated planning changed the cast.'
);

/* ---- Quality and preference still rank as documented ---- */
const enhanced = casting.planVoiceCast(
  [
    ...cast(),
    voice('es-us-monica', 'Monica', 'es-US', 'Enhanced'),
  ],
  SPANISH
);
check(
  enhanced.livia.voice?.identifier === 'es-us-monica',
  'an enhanced voice did not win the feminine slot.'
);
check(
  enhanced.zora.voice?.identifier === 'es-mx-ava',
  'Zora did not take the next-best feminine voice after Livia.'
);

/* ---- Sparse devices still get a usable, stable cast ---- */
const single = casting.planVoiceCast([voice('android-01', 'Spanish voice', 'es-ES')], SPANISH);
check(single.livia.voice?.identifier === 'android-01', 'single-voice device left Livia silent.');
check(single.bingo.voice?.identifier === 'android-01', 'single-voice device left Bingo silent.');
check(single.zora.voice?.identifier === 'android-01', 'single-voice device left Zora silent.');
check(
  single.livia.matchedVoice && single.bingo.matchedVoice && single.zora.matchedVoice,
  'single native voice was not marked as native.'
);

const oneGender = casting.planVoiceCast(
  [
    voice('es-mx-ava', 'Ava', 'es-MX'),
    voice('es-mx-samantha', 'Samantha', 'es-MX'),
  ],
  SPANISH
);
check(oneGender.bingo.voice !== null, 'Bingo went silent when only feminine voices were installed.');
check(
  oneGender.bingo.voice?.identifier !== oneGender.livia.voice?.identifier,
  'Bingo reused Livia’s voice even though an unused voice existed.'
);

/* ---- Related-language fallback ---- */
const fallback = casting.planVoiceCast(
  [voice('it-it-alice', 'Alice', 'it-IT', 'Enhanced')],
  { base: 'sw', locales: ['sw-KE', 'sw-TZ', 'sw'], related: ['it', 'es'] }
);
check(
  fallback.livia.voice?.identifier === 'it-it-alice',
  'Swahili did not fall back to the installed Italian voice.'
);
check(
  fallback.livia.approximate && fallback.bingo.approximate && fallback.zora.approximate,
  'related-language fallback was not marked approximate.'
);
check(
  !fallback.livia.matchedVoice,
  'related-language fallback was incorrectly marked native.'
);

/* ---- Empty and excluded lists remain honest ---- */
const missing = casting.planVoiceCast([], SPANISH);
check(
  missing.livia.voice === null && missing.bingo.voice === null && missing.zora.voice === null,
  'an empty voice list produced a voice.'
);
check(!missing.livia.hasVoiceList, 'an empty voice list was reported as available.');
check(!missing.livia.matchedVoice && !missing.livia.approximate, 'empty list was marked matched/approximate.');

const novelty = casting.planVoiceCast(
  [voice('es-mx-whisper', 'Whisper', 'es-MX')],
  SPANISH
);
check(novelty.livia.voice === null, 'a novelty voice was used for teaching.');
check(novelty.livia.hasVoiceList, 'novelty-only list should still report that voices exist.');

/* ---- Shipped resolution path uses the whole-cast planner ---- */
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pronunciation = read('lib/pronunciation.ts');
const voiceCast = read('lib/voiceCast.ts');
const settings = read('src/app/settings.tsx');
const pkg = JSON.parse(read('package.json'));

check(
  pronunciation.includes('planVoiceCast(voices, preset)'),
  'pronunciation does not use the deterministic whole-cast planner.'
);
check(
  pronunciation.includes('return plan[character];'),
  'pronunciation does not read the character’s slot from the shared plan.'
);
check(
  !pronunciation.includes('usedIdentifiers'),
  'the old order-dependent used-voice set is still present.'
);
check(
  !pronunciation.includes('voiceCache'),
  'the per-character cache that let auditions claim voices still exists.'
);
check(
  voiceCast.includes('auditionVoice') && voiceCast.includes('speakAs('),
  'Settings auditions no longer go through the lesson speak path.'
);
check(
  settings.includes('auditionVoice(character, language)'),
  'Settings no longer calls the shared audition path.'
);
check(
  pkg.scripts['check:casting'] === 'node scripts/check-voice-casting.cjs',
  'package.json does not expose check:casting.'
);
check(
  pkg.scripts.test.includes('check-voice-casting.cjs'),
  'check:casting is not included in npm test.'
);

if (failures.length > 0) {
  console.error('Voice casting check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  'Voice casting OK — fixed Livia → Bingo → Zora plan, stable voice ranking, auditions and lessons share it.'
);
