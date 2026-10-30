#!/usr/bin/env node
/**
 * Guards SRT/VTT subtitle imports.
 *
 * The subtitle path exists so an editor can take a licensed video transcript
 * (already translated) and turn it into unpublished lesson drafts without
 * hand-building JSON. This check drives the real parser, sidecar manifest
 * validation and draft generator with temporary files, and covers the common
 * cue conventions plus the failures that must block a draft:
 *
 *   - a missing sidecar (no licence / attribution / boundaries);
 *   - a non-open licence;
 *   - a cue with no English translation;
 *   - overlapping lesson ranges;
 *   - malformed ranges and empty subtitle files;
 *   - a name map that targets anything other than Livia/Bingo/Zora, tries
 *     to rename a platform character, or is not an object;
 *   - an unsupported file extension.
 *
 * Runs inside `npm test`, and directly:
 *   npm run check:subtitles
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  readTranscript,
  buildDrafts,
  buildSql,
  outputPaths,
  parseArgs,
  parseTimestamp,
} = require('./import-language-transcripts.cjs');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-subtitles-'));
const write = (name, content) => {
  const file = path.join(work, name);
  fs.writeFileSync(file, content, 'utf8');
  return file;
};
const json = (name, value) => write(name, `${JSON.stringify(value, null, 2)}\n`);

function source(id) {
  return {
    id,
    title: `Licensed video ${id}`,
    url: `https://example.com/${id}`,
    license: 'CC BY 4.0',
    attribution: `Example licensed video (${id})`,
    courseId: 'swahili',
    language: 'sw',
  };
}

function expectError(fn, pattern, label) {
  try {
    fn();
  } catch (error) {
    assert.match(String(error.message), pattern, `${label}: unexpected error message`);
    return;
  }
  assert.fail(`${label}: expected an error but the import succeeded.`);
}

const srt = write(
  'lesson.srt',
  `1
00:00:00,000 --> 00:00:03,000
Livia: Habari yako! | Hello!

2
00:00:03,000 --> 00:00:06,000
Bingo: Nzuri sana.
Very good.

3
00:00:06,000 --> 00:00:09,000
SW: Unajifunza Kiswahili?
EN: Are you learning Swahili?

4
00:00:09,000 --> 00:00:12,000
Livia: Ndiyo, ninajifunza. | Yes, I am learning.

5
00:00:12,000 --> 00:00:15,000
Livia: Tafadhali, sema polepole. | Please speak slowly.

6
00:00:15,000 --> 00:00:18,000
Bingo: Sawa, nitasema polepole. | Okay, I will speak slowly.

7
00:00:18,000 --> 00:00:21,000
Livia: Asante sana! | Thank you very much!

8
00:00:21,000 --> 00:00:24,000
Bingo: Karibu. | You're welcome.
`
);

json('lesson.import.json', {
  source: source('swahili-subcheck'),
  defaultSpeaker: 'Narrator',
  lessons: [
    { id: 'swahili-subcheck-01', title: 'Greetings', start: '00:00:00', end: '00:00:12' },
    { id: 'swahili-subcheck-02', title: 'Politeness', start: '00:00:12', end: '00:00:24' },
  ],
});

const transcript = readTranscript(srt);
assert.equal(transcript.source.mediaType, 'video');
assert.equal(transcript.lessons.length, 2);
assert.deepEqual(
  transcript.lessons[0].dialogue,
  [
    { speaker: 'Livia', sw: 'Habari yako!', en: 'Hello!' },
    { speaker: 'Bingo', sw: 'Nzuri sana.', en: 'Very good.' },
    { speaker: 'Narrator', sw: 'Unajifunza Kiswahili?', en: 'Are you learning Swahili?' },
    { speaker: 'Livia', sw: 'Ndiyo, ninajifunza.', en: 'Yes, I am learning.' },
  ]
);
assert.equal(transcript.lessons[1].dialogue.length, 4);

const drafts = buildDrafts(transcript);
assert.equal(drafts.lessons.length, 2);
for (const lesson of drafts.lessons) {
  assert.ok(lesson.questions.length >= 3 && lesson.questions.length <= 5);
  assert.ok(lesson.theory.at(-1).includes('licensed video transcript'));
}
const sql = buildSql(drafts, srt);
assert.ok(sql.includes('published = false'));
assert.ok(sql.includes('swahili-subcheck-01'));
assert.equal(
  path.basename(outputPaths({ id: 'swahili-video-a', courseId: 'swahili' }).sql),
  'drafts_swahili_video-a.sql'
);
assert.equal(
  path.basename(outputPaths({ id: 'fsi-swahili-basic-course', courseId: 'swahili' }).sql),
  'drafts_swahili_fsi.sql'
);

// VTT: NOTE/STYLE blocks, cue settings, voice tags and inline markup.
const vtt = write(
  'lesson-vtt.vtt',
  `WEBVTT

NOTE Temporary test captions.

STYLE
::cue { color: lime; }

00:00:00.000 --> 00:00:03.000 align:start position:0%
<v Livia><i>Habari yako!</i> | Hello &amp; welcome!

00:00:03.000 --> 00:00:06.000
<v Bingo>Nzuri sana. | Very good.

00:00:06.000 --> 00:00:09.000
<v Livia>Unajifunza Kiswahili? | Are you learning Swahili?

00:00:09.000 --> 00:00:12.000
<v Bingo>Ndiyo, ninajifunza. | Yes, I am learning.
`
);
json('lesson-vtt.import.json', {
  source: source('swahili-subcheck-vtt'),
  lessons: [{ id: 'swahili-subcheck-vtt-01', title: 'Greetings' }],
});
const vttTranscript = readTranscript(vtt);
assert.equal(vttTranscript.lessons[0].dialogue[0].speaker, 'Livia');
assert.equal(vttTranscript.lessons[0].dialogue[0].sw, 'Habari yako!');
assert.equal(vttTranscript.lessons[0].dialogue[0].en, 'Hello & welcome!');
assert.equal(vttTranscript.lessons[0].dialogue[1].speaker, 'Bingo');
const vttDrafts = buildDrafts(vttTranscript);
assert.equal(vttDrafts.lessons.length, 1);
assert.ok(vttDrafts.lessons[0].questions.length >= 3);

// A custom manifest path overrides the default <name>.import.json lookup.
const customManifest = json('custom-vtt.import.json', {
  source: source('swahili-subcheck-vtt-custom'),
  defaultSpeaker: 'Zora',
  lessons: [{ id: 'swahili-subcheck-vtt-custom-01', title: 'Greetings' }],
});
const customTranscript = readTranscript(vtt, { manifestPath: customManifest });
assert.equal(customTranscript.source.id, 'swahili-subcheck-vtt-custom');
assert.equal(customTranscript.lessons[0].dialogue[0].speaker, 'Livia');

// Monolingual captions use translations keyed by cue number. The entire cue is
// Swahili even when the subtitle wraps it over two lines.
const mono = write(
  'mono.vtt',
  `WEBVTT

00:00:00.000 --> 00:00:03.000
Habari
yako!

00:00:03.000 --> 00:00:06.000
Nzuri sana.

00:00:06.000 --> 00:00:09.000
Unajifunza Kiswahili?

00:00:09.000 --> 00:00:12.000
Ndiyo, ninajifunza.
`
);
json('mono.import.json', {
  source: source('swahili-subcheck-mono'),
  translations: {
    1: 'Hello!',
    2: 'Very good.',
    3: 'Are you learning Swahili?',
    4: 'Yes, I am learning.',
  },
  lessons: [{ id: 'swahili-subcheck-mono-01', title: 'Greetings' }],
});
const monoTranscript = readTranscript(mono);
assert.equal(monoTranscript.lessons[0].dialogue[0].sw, 'Habari yako!');
assert.equal(monoTranscript.lessons[0].dialogue[0].en, 'Hello!');
assert.equal(monoTranscript.lessons[0].dialogue[0].speaker, 'Narrator');

// A name map swaps only the explicitly listed generic names, in speaker labels,
// dialogue text, titles and summaries. Unmapped names and longer words stay put.
const named = write(
  'named.srt',
  `1
00:00:00,000 --> 00:00:03,000
Juma: Mimi ni Juma. | I am Juma.

2
00:00:03,000 --> 00:00:06,000
Maria: Nzuri sana. | Very good.

3
00:00:06,000 --> 00:00:09,000
Juma: Jumamosi ni siku ya furaha. | Saturday is a happy day.

4
00:00:09,000 --> 00:00:12,000
Amina: Ndiyo, ninajifunza. | Yes, I am learning.

5
00:00:12,000 --> 00:00:15,000
Neema: Karibu. | You're welcome.
`
);
json('named.import.json', {
  source: source('swahili-subcheck-names'),
  nameMap: { Juma: 'Bingo', Maria: 'Livia', Amina: 'Zora' },
  lessons: [
    {
      id: 'swahili-subcheck-names-01',
      title: 'Juma and Maria',
      summary: 'Juma meets Maria and Neema.',
    },
  ],
});
const namedTranscript = readTranscript(named);
assert.equal(namedTranscript.lessons[0].title, 'Bingo and Livia');
assert.equal(namedTranscript.lessons[0].summary, 'Bingo meets Livia and Neema.');
assert.deepEqual(
  namedTranscript.lessons[0].dialogue.map((line) => line.speaker),
  ['Bingo', 'Livia', 'Bingo', 'Zora', 'Neema']
);
assert.equal(namedTranscript.lessons[0].dialogue[0].sw, 'Mimi ni Bingo.');
assert.equal(namedTranscript.lessons[0].dialogue[0].en, 'I am Bingo.');
assert.equal(namedTranscript.lessons[0].dialogue[2].sw, 'Jumamosi ni siku ya furaha.');
const namedDrafts = buildDrafts(namedTranscript);
assert.ok(
  namedDrafts.lessons[0].theory.some((line) => line.includes('Bingo: “Mimi ni Bingo.”'))
);

// The same allowlist works in a JSON transcript.
const namedJson = json('named.json', {
  source: {
    ...source('swahili-subcheck-json-names'),
    title: 'Juma and Maria source',
    attribution: 'Juma Mwangi, Example',
  },
  nameMap: { Juma: 'Bingo', Neema: 'Livia' },
  lessons: [
    {
      id: 'swahili-subcheck-json-names-01',
      title: 'Juma says hello',
      dialogue: [
        { speaker: 'Juma', sw: 'Mimi ni Juma.', en: 'I am Juma.' },
        { speaker: 'Neema', sw: 'Karibu.', en: 'Welcome.' },
      ],
    },
  ],
});
const namedJsonTranscript = readTranscript(namedJson);
assert.equal(namedJsonTranscript.source.title, 'Juma and Maria source');
assert.equal(namedJsonTranscript.source.attribution, 'Juma Mwangi, Example');
assert.equal(namedJsonTranscript.lessons[0].title, 'Bingo says hello');
assert.deepEqual(
  namedJsonTranscript.lessons[0].dialogue.map((line) => line.speaker),
  ['Bingo', 'Livia']
);
assert.equal(namedJsonTranscript.lessons[0].dialogue[0].sw, 'Mimi ni Bingo.');

const specialName = json('special-name.json', {
  source: source('swahili-subcheck-special-name'),
  nameMap: { 'Mrs. Kirambo': 'Livia' },
  lessons: [
    {
      id: 'swahili-subcheck-special-name-01',
      title: 'Mrs. Kirambo arrives',
      dialogue: [
        { speaker: 'Mrs. Kirambo', sw: 'Habari, Mrs. Kirambo.', en: 'Hello, Mrs. Kirambo.' },
        { speaker: 'Neema', sw: 'Karibu.', en: 'Welcome.' },
      ],
    },
  ],
});
const specialNameTranscript = readTranscript(specialName);
assert.equal(specialNameTranscript.lessons[0].title, 'Livia arrives');
assert.equal(specialNameTranscript.lessons[0].dialogue[0].speaker, 'Livia');
assert.equal(specialNameTranscript.lessons[0].dialogue[0].en, 'Hello, Livia.');

// Only the three platform characters may be targets; platform characters may
// not be renamed, and the map may not be a bare string.
json('bad-name-map.import.json', {
  source: source('swahili-subcheck-bad-map'),
  nameMap: { Juma: 'Duma' },
  lessons: [{ id: 'swahili-subcheck-bad-map-01', title: 'Greetings' }],
});
expectError(
  () => readTranscript(named, { manifestPath: path.join(work, 'bad-name-map.import.json') }),
  /Only Livia, Bingo or Zora/,
  'non-character name target'
);
json('platform-name-map.import.json', {
  source: source('swahili-subcheck-platform-map'),
  nameMap: { Livia: 'Bingo' },
  lessons: [{ id: 'swahili-subcheck-platform-map-01', title: 'Greetings' }],
});
expectError(
  () => readTranscript(named, { manifestPath: path.join(work, 'platform-name-map.import.json') }),
  /cannot rename the platform character/,
  'platform character as source name'
);
json('string-name-map.import.json', {
  source: source('swahili-subcheck-string-map'),
  nameMap: 'Juma',
  lessons: [{ id: 'swahili-subcheck-string-map-01', title: 'Greetings' }],
});
expectError(
  () => readTranscript(named, { manifestPath: path.join(work, 'string-name-map.import.json') }),
  /nameMap must be an object/,
  'name map is not an object'
);

// Timestamp helpers accept both SRT and VTT shapes.
assert.equal(parseTimestamp('00:00:01,500'), 1.5);
assert.equal(parseTimestamp('00:01.500'), 1.5);
assert.equal(parseTimestamp('01:02:03.250'), 3723.25);
assert.equal(parseTimestamp(12), 12);
assert.deepEqual(parseArgs(['video.srt', '--manifest', 'video.import.json']), {
  file: 'video.srt',
  manifest: 'video.import.json',
  apply: false,
});
assert.deepEqual(parseArgs(['--apply', 'video.vtt']), {
  file: 'video.vtt',
  manifest: undefined,
  apply: true,
});
expectError(() => parseArgs(['--manifest']), /needs a file path/, 'manifest without a path');
expectError(() => parseArgs(['--unknown']), /Unknown option/, 'unknown option');

// Missing sidecar: provenance and boundaries are not optional.
const orphan = write(
  'orphan.srt',
  '1\n00:00:00,000 --> 00:00:03,000\nHabari! | Hello!\n\n2\n00:00:03,000 --> 00:00:06,000\nNzuri. | Good.\n'
);
expectError(() => readTranscript(orphan), /sidecar manifest/, 'missing sidecar');

// Non-open licence.
json('closed.srt.import.json', {
  source: { ...source('swahili-subcheck-closed'), license: 'All rights reserved' },
  lessons: [{ id: 'swahili-subcheck-closed-01', title: 'Greetings' }],
});
expectError(
  () => readTranscript(orphan, { manifestPath: path.join(work, 'closed.srt.import.json') }),
  /Only public-domain/,
  'closed licence'
);

// A monolingual cue without a translation must not become a lesson.
const untranslated = write(
  'untranslated.srt',
  '1\n00:00:00,000 --> 00:00:03,000\nHabari yako!\n\n2\n00:00:03,000 --> 00:00:06,000\nNzuri sana.\n'
);
json('untranslated.import.json', {
  source: source('swahili-subcheck-untranslated'),
  lessons: [{ id: 'swahili-subcheck-untranslated-01', title: 'Greetings' }],
});
expectError(() => readTranscript(untranslated), /no English translation/, 'missing translation');

// Overlapping lesson ranges would duplicate cues.
json('overlap.import.json', {
  source: source('swahili-subcheck-overlap'),
  lessons: [
    { id: 'swahili-subcheck-overlap-01', title: 'One', start: '00:00:00', end: '00:00:12' },
    { id: 'swahili-subcheck-overlap-02', title: 'Two', start: '00:00:10', end: '00:00:20' },
  ],
});
expectError(() => readTranscript(srt, { manifestPath: path.join(work, 'overlap.import.json') }), /overlap/, 'overlap');

// Bad range.
json('bad-range.import.json', {
  source: source('swahili-subcheck-range'),
  lessons: [{ id: 'swahili-subcheck-range-01', title: 'One', start: 'not-a-time', end: '00:00:12' }],
});
expectError(
  () => readTranscript(srt, { manifestPath: path.join(work, 'bad-range.import.json') }),
  /HH:MM:SS/,
  'bad range'
);

// Empty subtitle.
const empty = write('empty.vtt', 'WEBVTT\n\nNOTE No cues here.\n');
json('empty.import.json', {
  source: source('swahili-subcheck-empty'),
  lessons: [{ id: 'swahili-subcheck-empty-01', title: 'Empty' }],
});
expectError(() => readTranscript(empty), /No subtitle cues/, 'empty subtitles');

// Unknown extension.
const text = write('notes.txt', 'Habari | Hello\n');
expectError(() => readTranscript(text), /Unsupported transcript format/, 'unsupported extension');

fs.rmSync(work, { recursive: true, force: true });
console.log(
  `Subtitle import OK — SRT/VTT cues, sidecar manifests, translations, name maps and ${
    drafts.lessons.length + vttDrafts.lessons.length
  } draft lessons verified.`
);
