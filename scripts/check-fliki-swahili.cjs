#!/usr/bin/env node
'use strict';

/**
 * Contract check for the Fliki Swahili narration path.
 *
 * Runs offline: validates the generator's voice/request helpers, the phrase
 * inventory, the app wiring, and — when clips have been generated — every MP3,
 * manifest entry and typed key. `npm test` stays green before the first
 * generation, but a generated set cannot drift from the lessons.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  getSwahiliPhrases,
  phraseKey,
  ROOT,
} = require('./lib/swahili-phrases.cjs');
const {
  buildTtsBody,
  chooseSwahiliLanguage,
  chooseSwahiliDialect,
  chooseSwahiliVoice,
  extractAudio,
  extractDuration,
  assertMp3,
  parseArgs,
} = require('./generate-fliki-swahili.cjs');

const OUT_DIR = path.join(ROOT, 'assets', 'audio', 'swahili');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const CLIPS_PATH = path.join(OUT_DIR, 'clips.ts');

function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function mp3Fixture(header) {
  const buffer = Buffer.alloc(512, 0);
  header.copy(buffer, 0);
  return buffer;
}

test('phrase inventory covers all three new lessons', () => {
  const phrases = getSwahiliPhrases();
  assert.equal(phrases.length, 15);
  assert.equal(new Set(phrases.map((p) => p.key)).size, 15);
  for (const id of ['swahili-questions', 'swahili-adjectives', 'swahili-health']) {
    assert.ok(phrases.some((p) => p.lessonId === id), `missing ${id}`);
  }
  for (const phrase of phrases) {
    assert.ok(phrase.phrase.trim().length > 0, `empty phrase: ${phrase.key}`);
    assert.equal(phrase.key, phraseKey(phrase.phrase));
  }
});

test('Fliki language/dialect/voice selection is deterministic', () => {
  const language = chooseSwahiliLanguage([
    { _id: 'en', name: 'English', slug: 'en' },
    { _id: 'sw', name: 'Swahili', slug: 'sw' },
  ]);
  assert.equal(language._id, 'sw');

  const dialect = chooseSwahiliDialect([
    { _id: 'sw-tz', name: 'Tanzanian Swahili', slug: 'sw-tz' },
    { _id: 'sw-ke', name: 'Kenyan Swahili', slug: 'sw-ke' },
  ]);
  assert.equal(dialect._id, 'sw-ke');

  const voice = chooseSwahiliVoice([
    { _id: 'male', name: 'Baraka', gender: 'male', isUltra: 'true', styles: [] },
    { _id: 'female', name: 'Zuri', gender: 'female', isUltra: 'true', styles: [] },
    { _id: 'basic', name: 'Amani', gender: 'female', isUltra: 'false', styles: [] },
  ]);
  assert.equal(voice._id, 'female');
});

test('request body stays within Fliki limits and omits empty style', () => {
  const body = buildTtsBody('Habari, unaendeleaje?', 'voice-1', null);
  assert.equal(body.content, 'Habari, unaendeleaje?');
  assert.equal(body.voiceId, 'voice-1');
  assert.equal(body.sampleRate, 48000);
  assert.equal(body.format, 'mp3');
  assert.equal('voiceStyleId' in body, false);
  assert.equal(buildTtsBody('x', 'voice-1', 'style-1').voiceStyleId, 'style-1');
  assert.throws(() => buildTtsBody('x'.repeat(3001), 'voice-1', null), /3000/);
});

test('response parsing handles documented and wrapped shapes', () => {
  assert.equal(extractAudio({ audio: 'https://cdn.example/a.mp3' }), 'https://cdn.example/a.mp3');
  assert.equal(extractAudio({ data: { audio: 'https://cdn.example/b.mp3' } }), 'https://cdn.example/b.mp3');
  assert.equal(extractDuration({ duration: 1.2 }), 1.2);
  assert.equal(extractDuration({ data: { duration: 2.5 } }), 2.5);
  assert.throws(() => extractAudio({ audio: 'not-a-url' }), /audio URL/);
});

test('MP3 validation accepts ID3/frame sync and rejects HTML', () => {
  assertMp3(mp3Fixture(Buffer.from('ID3', 'ascii')), 'id3');
  assertMp3(mp3Fixture(Buffer.from([0xff, 0xfb, 0x90, 0x64])), 'frame');
  assert.throws(() => assertMp3(Buffer.from('<html>error</html>'.repeat(40)), 'html'), /not an MP3/);
});

test('CLI flags parse without touching the network', () => {
  assert.equal(parseArgs(['--limit=2']).limit, 2);
  assert.equal(parseArgs(['--confirm-rights']).confirmRights, true);
  assert.throws(() => parseArgs(['--limit=0']), /positive integer/);
});

test('dry-run prints every phrase', () => {
  const output = execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'generate-fliki-swahili.cjs'), '--dry-run', '--json'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const parsed = JSON.parse(output);
  assert.equal(parsed.length, 15);
});

test('lesson player uses natural Swahili before device speech', () => {
  const player = read(path.join(ROOT, 'components', 'GamifiedCodePlayer.tsx'));
  assert.match(player, /playNaturalSwahili/);
  assert.match(player, /stopNaturalSwahili/);
  assert.match(player, /language\.base === 'sw'[\s\S]{0,120}playNaturalSwahili/);
});

test('natural audio module falls back instead of throwing', () => {
  const source = read(path.join(ROOT, 'lib', 'naturalLessonAudio.ts'));
  assert.match(source, /if \(!clip\) return false/);
  assert.match(source, /SWAHILI_CLIPS\[key\]/);
});

test('env example documents a server-only Fliki key', () => {
  const example = read(path.join(ROOT, '.env.example'));
  assert.match(example, /FLIKI_API_KEY=/);
  assert.doesNotMatch(example, /EXPO_PUBLIC_FLIKI/i);
});

test('operator documentation exists', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'fliki-swahili.md')));
});

test('generated clips match the lesson inventory and manifest', () => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('     no Fliki clips generated yet — MP3 checks skipped');
    const clips = read(CLIPS_PATH);
    assert.match(clips, /SWAHILI_CLIPS: Record<string, SwahiliClip>/);
    assert.doesNotMatch(clips, /require\('\.\//, 'clips.ts references audio with no manifest');
    return;
  }

  const manifest = JSON.parse(read(MANIFEST_PATH));
  const phrases = getSwahiliPhrases();
  const expected = new Map(phrases.map((p) => [p.key, p]));

  assert.equal(manifest.kind, 'fliki-swahili-lesson-clips');
  assert.equal(manifest.provider, 'fliki');
  assert.ok(manifest.voice?.id, 'manifest is missing the voice id');
  assert.ok(Array.isArray(manifest.clips) && manifest.clips.length > 0);

  for (const clip of manifest.clips) {
    assert.ok(expected.has(clip.key), `stale clip not in lessons: ${clip.key}`);
    const phrase = expected.get(clip.key);
    assert.equal(clip.phrase, phrase.phrase);
    assert.equal(clip.file, `${phrase.slug}.mp3`);
    assert.ok(clip.duration > 0, `missing duration for ${clip.key}`);
    const file = path.join(OUT_DIR, clip.file);
    assert.ok(fs.existsSync(file), `missing audio file: ${clip.file}`);
    assert.ok(fs.statSync(file).size > 256, `tiny audio file: ${clip.file}`);
    assertMp3(fs.readFileSync(file), clip.key);
  }

  const clipsSource = read(CLIPS_PATH);
  for (const clip of manifest.clips) {
    assert.ok(clipsSource.includes(JSON.stringify(clip.key)), `typed map missing ${clip.key}`);
    assert.ok(clipsSource.includes(`require('./${clip.file}')`), `typed map missing ${clip.file}`);
  }

  const secretLeak = /(FLIKI_API_KEY|Bearer\s+[A-Za-z0-9_-]{12,})/.test(
    `${clipsSource}\n${read(MANIFEST_PATH)}`
  );
  assert.equal(secretLeak, false, 'generated assets contain a credential');

  if (manifest.clips.length < phrases.length || manifest.complete !== true) {
    if (process.env.FLIKI_ALLOW_PARTIAL === '1') {
      console.log(
        `     partial set allowed: ${manifest.clips.length}/${phrases.length} clips — rerun without --limit before shipping`
      );
    } else {
      assert.fail(
        `partial Fliki set: ${manifest.clips.length}/${phrases.length} clips have audio. ` +
          'Rerun the generator without --limit (or set FLIKI_ALLOW_PARTIAL=1 only while auditioning).'
      );
    }
  } else {
    assert.equal(manifest.clips.length, phrases.length);
  }
});

console.log('\nFliki Swahili narration checks passed.');
