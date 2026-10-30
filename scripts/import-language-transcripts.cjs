#!/usr/bin/env node
/**
 * Transcript → unpublished language-lesson drafts.
 *
 * A transcript is either a JSON file (source metadata plus translated dialogue
 * lines) or an `.srt`/`.vtt` subtitle file with a sidecar manifest
 * (`<name>.import.json`) carrying the source metadata and lesson boundaries.
 * This script validates that input, builds a lesson with theory and original
 * quiz questions, and writes:
 *
 *   content/drafts/<source-id>.drafts.json   reviewable draft lessons
 *   supabase/drafts_<course>_<short>.sql     idempotent unpublished seed
 *
 * The SQL is the only thing that touches Supabase. Drafts are inserted with
 * `published = false`, so they are invisible to learners until an editor
 * reviews and publishes a row in the dashboard. Re-running the import updates
 * unpublished drafts and deliberately leaves a published lesson alone.
 *
 * Usage:
 *   node scripts/import-language-transcripts.cjs content/transcripts/swahili/fsi-swahili-basic-course.json
 *   node scripts/import-language-transcripts.cjs content/transcripts/swahili/fsi-swahili-basic-course.json --apply
 *   node scripts/import-language-transcripts.cjs content/transcripts/swahili/video.srt
 *   node scripts/import-language-transcripts.cjs content/transcripts/swahili/video.vtt --manifest path/to/video.import.json
 *
 * `--apply` runs the generated SQL through psql using BOLINGO_DATABASE_URL
 * (or the same key in .env). It never prints the URL.
 *
 * Import rules:
 *   - Only public-domain or openly licensed sources. The transcript records
 *     the licence and attribution; generated theory carries the attribution.
 *   - The source supplies dialogue. Transcript summaries and the generated
 *     prompts, distractors and explanations are original Bolingo writing and
 *     must be reviewed before publishing.
 *   - An optional nameMap swaps only explicitly listed generic example names
 *     for Livia, Bingo or Zora. Source metadata and attribution are untouched.
 *   - Every generated lesson goes through the app's own `toCourseLesson()`
 *     validator, so a malformed draft can never reach the database.
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const DEFAULT_TRANSCRIPT = path.join(
  ROOT,
  'content',
  'transcripts',
  'swahili',
  'fsi-swahili-basic-course.json'
);

// Compile the app's catalog-row module on demand. The importer and its check
// must exercise the same validation the quiz loader uses, not a copy.
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

const { toCourseLesson } = require(path.join(ROOT, 'lib', 'languageCatalogRows.ts'));

const REQUIRED_SOURCE_FIELDS = [
  'id',
  'title',
  'url',
  'license',
  'attribution',
  'courseId',
  'language',
];

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Transcript ${label} must be a non-empty string.`);
  }
}

/** Strip punctuation for BUILD-token banks; keep the words themselves verbatim. */
function tokenizeSwahili(text) {
  return String(text)
    .replace(/[.,!?;:…"“”'‘’()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function pickDistractors(pool, answer, count) {
  const key = String(answer).trim().toLowerCase();
  return uniqueStrings(pool)
    .filter((value) => value.toLowerCase() !== key)
    .slice(0, count);
}

/** Explanations end in one period, never two. */
function withoutEnd(text) {
  return String(text).replace(/[.!?]+$/, '').trim();
}

const CHARACTER_NAMES = ['Livia', 'Bingo', 'Zora'];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate the editorial allowlist. A key is a generic example name; a value
 * is one of the three platform characters. Explicit keys only: nothing is
 * guessed from the source text, so a real name that is not listed is left
 * exactly as written.
 */
function normalizeNameMap(raw) {
  if (raw === undefined) return new Map();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('nameMap must be an object mapping generic example names to Livia, Bingo or Zora.');
  }
  const map = new Map();
  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const key = String(rawKey).trim();
    if (!key) throw new Error('nameMap keys must be non-empty names.');
    if (key.length > 80 || /[\r\n]/.test(key)) {
      throw new Error(`nameMap key "${key}" must be a single name of 80 characters or fewer.`);
    }
    if (typeof rawValue !== 'string') {
      throw new Error(`nameMap["${key}"] must be Livia, Bingo or Zora.`);
    }
    const target = CHARACTER_NAMES.find(
      (name) => name.toLowerCase() === rawValue.trim().toLowerCase()
    );
    if (!target) {
      throw new Error(
        `nameMap["${key}"] is "${rawValue}". Only Livia, Bingo or Zora may replace a generic example name.`
      );
    }
    const lower = key.toLowerCase();
    if (CHARACTER_NAMES.some((name) => name.toLowerCase() === lower)) {
      throw new Error(`nameMap cannot rename the platform character "${key}".`);
    }
    if (map.has(lower)) {
      throw new Error(`nameMap has more than one entry for "${key}".`);
    }
    map.set(lower, target);
  }
  return map;
}

function applyNameMap(value, nameMap) {
  if (typeof value !== 'string' || value.length === 0 || nameMap.size === 0) return value;
  const keys = [...nameMap.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(${keys.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`,
    'giu'
  );
  return value.replace(pattern, (match) => nameMap.get(match.toLowerCase()) ?? match);
}

/** Apply the allowlist to lesson content, never to source provenance. */
function applyNameMapToTranscript(transcript, nameMap) {
  if (nameMap.size === 0) return transcript;
  return {
    ...transcript,
    lessons: transcript.lessons.map((lesson) => ({
      ...lesson,
      title: applyNameMap(lesson.title, nameMap),
      ...(lesson.summary !== undefined ? { summary: applyNameMap(lesson.summary, nameMap) } : {}),
      dialogue: lesson.dialogue.map((line) => ({
        speaker: applyNameMap(line.speaker, nameMap),
        sw: applyNameMap(line.sw, nameMap),
        en: applyNameMap(line.en, nameMap),
      })),
    })),
  };
}

function validateSource(source) {
  assertString(source?.id, 'source.id');
  assertString(source?.courseId, 'source.courseId');
  assertString(source?.language, 'source.language');
  for (const field of REQUIRED_SOURCE_FIELDS) {
    assertString(source?.[field], `source.${field}`);
  }
  // These values become file names and SQL literals; keep them to a safe slug.
  for (const field of ['id', 'courseId']) {
    if (!/^[a-z0-9-]+$/.test(source[field])) {
      throw new Error(`source.${field} may contain only lowercase letters, digits and hyphens.`);
    }
  }
  if (!/public domain|cc0|cc by|creative commons/i.test(source.license)) {
    throw new Error(
      `source.license is "${source.license}". Only public-domain or open-licence sources may be imported.`
    );
  }
  if (source.mediaType !== undefined) assertString(source.mediaType, 'source.mediaType');
}

function validateTranscript(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Transcript root must be a JSON object.');
  }
  validateSource(raw.source);
  if (raw.nameMap !== undefined) normalizeNameMap(raw.nameMap);
  if (!Array.isArray(raw.lessons) || raw.lessons.length === 0) {
    throw new Error('Transcript needs at least one lesson.');
  }

  const seen = new Set();
  for (const [index, lesson] of raw.lessons.entries()) {
    const label = lesson?.id ?? `lesson ${index + 1}`;
    assertString(lesson?.id, `${label}.id`);
    assertString(lesson?.title, `${label}.title`);
    if (!/^[a-z0-9-]+$/.test(lesson.id) || !lesson.id.startsWith(`${raw.source.courseId}-`)) {
      throw new Error(
        `${label}: id must be lowercase letters/digits/hyphens and start with "${raw.source.courseId}-".`
      );
    }
    if (seen.has(lesson.id)) throw new Error(`${label}: duplicate lesson id.`);
    seen.add(lesson.id);
    if (lesson.summary !== undefined) assertString(lesson.summary, `${label}.summary`);
    if (!Array.isArray(lesson.dialogue) || lesson.dialogue.length < 2) {
      throw new Error(`${label}: dialogue needs at least two lines.`);
    }
    lesson.dialogue.forEach((line, lineIndex) => {
      const at = `${label} dialogue ${lineIndex + 1}`;
      assertString(line?.speaker, `${at}.speaker`);
      assertString(line?.sw, `${at}.sw`);
      assertString(line?.en, `${at}.en`);
    });
  }
  return raw;
}

/* ------------------------------ subtitles ------------------------------ */

const NAMED_SUBTITLE_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeSubtitleEntities(value) {
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    const key = String(code).toLowerCase();
    if (NAMED_SUBTITLE_ENTITIES[key]) return NAMED_SUBTITLE_ENTITIES[key];
    if (key.startsWith('#')) {
      const digits = key.startsWith('#x')
        ? Number.parseInt(key.slice(2), 16)
        : Number.parseInt(key.slice(1), 10);
      if (Number.isInteger(digits) && digits >= 0 && digits <= 0x10ffff) {
        return String.fromCodePoint(digits);
      }
    }
    return match;
  });
}

/** Remove SRT/VTT markup while keeping a VTT voice tag as the speaker. */
function stripSubtitleMarkup(raw) {
  const voice = String(raw).match(/<v(?:\.[^ >]+)?\s+([^>]+)>/i);
  const text = decodeSubtitleEntities(
    String(raw)
      .replace(/<v(?:\.[^ >]+)?\s+[^>]+>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\\N/g, '\n')
      .replace(/\{[^}]*\}/g, '')
  ).replace(/\u00a0/g, ' ');
  return {
    voice: voice ? decodeSubtitleEntities(voice[1]).trim() : undefined,
    text,
  };
}

function extractSpeaker(text, fallbackSpeaker) {
  const lines = text
    .split('\n')
    .map((line) => line.trim().replace(/^-\s+/, ''))
    .filter(Boolean);
  const first = lines[0] ?? '';
  const match = first.match(/^([^:]{1,40}):\s*(.+)$/);
  if (
    match &&
    !/^(sw|en|swahili|english)$/i.test(match[1].trim()) &&
    !match[1].includes('//')
  ) {
    lines[0] = match[2].trim();
    return { speaker: match[1].trim(), text: lines.join('\n') };
  }
  return { speaker: fallbackSpeaker, text: lines.join('\n') };
}

function splitSubtitleDialogue(text, cueIndex, translations) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error(`Cue ${cueIndex} has no dialogue text.`);
  }

  const labelled = { sw: [], en: [] };
  let sawLabel = false;
  for (const line of lines) {
    const match = line.match(/^(sw|swahili|en|english)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    sawLabel = true;
    const side = /^(sw|swahili)$/i.test(match[1]) ? 'sw' : 'en';
    labelled[side].push(match[2].trim());
  }
  if (sawLabel) {
    if (labelled.sw.length > 0 && labelled.en.length > 0) {
      return { sw: labelled.sw.join(' '), en: labelled.en.join(' ') };
    }
    throw new Error(`Cue ${cueIndex}: SW:/EN: labels need both a Swahili and an English line.`);
  }

  // An explicit translation means the cue is monolingual; treat the whole cue
  // as Swahili so wrapped subtitle lines are not mistaken for a translation.
  const translated = translations[String(cueIndex)];
  if (translated) return { sw: lines.join(' '), en: translated };

  const joined = lines.join(' ').trim();
  for (const separator of [/\s*\|\s*/, /\s+[—–]\s+/, /\s+\/\/\s+/, /\t+/]) {
    const parts = joined.split(separator);
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      return { sw: parts[0].trim(), en: parts[1].trim() };
    }
  }
  if (lines.length === 2) return { sw: lines[0], en: lines[1] };

  throw new Error(
    `Cue ${cueIndex} has no English translation. Format it as "Swahili | English", two lines, or SW:/EN: labels, or add translations["${cueIndex}"] to the sidecar manifest.`
  );
}

function cueToDialogue(cue, fallbackSpeaker, translations) {
  const { voice, text } = stripSubtitleMarkup(cue.text);
  const extracted = extractSpeaker(text, voice || fallbackSpeaker);
  const speaker = voice || extracted.speaker || fallbackSpeaker || 'Narrator';
  const { sw, en } = splitSubtitleDialogue(extracted.text, cue.index, translations);
  return { speaker, sw, en };
}

function parseTimestamp(value, label = 'timestamp') {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${label} must be a non-negative number of seconds.`);
    }
    return value;
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a timestamp or a number of seconds.`);
  }
  const match = value
    .trim()
    .match(/^(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!match) {
    throw new Error(`${label} must be HH:MM:SS.mmm, MM:SS.mmm or seconds.`);
  }
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = match[4] ? Number(match[4].padEnd(3, '0')) : 0;
  if (minutes > 59 || seconds > 59) {
    throw new Error(`${label} has an invalid minute or second.`);
  }
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

const SUBTITLE_TIMESTAMP =
  /^((?:\d{1,3}:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d{1,3}:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?)/;

function parseSubtitleCues(raw, filePath = 'subtitle') {
  const normalized = String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const cues = [];

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split('\n').map((line) => line.trimEnd());
    const first = lines[0]?.trim() ?? '';
    if (!first) continue;
    // VTT header, metadata and comment blocks are not cues.
    if (/^WEBVTT(?:[ \t]|$)/i.test(first)) continue;
    if (/^(NOTE|STYLE|REGION)(?:[ \t]|$)/i.test(first)) continue;

    const timestampIndex = lines.findIndex((line) => SUBTITLE_TIMESTAMP.test(line.trim()));
    if (timestampIndex < 0) continue;
    const match = lines[timestampIndex].trim().match(SUBTITLE_TIMESTAMP);
    const text = lines
      .slice(timestampIndex + 1)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
      .trim();
    if (!text) continue;

    const index = cues.length + 1;
    const start = parseTimestamp(match[1], `cue ${index} start`);
    const end = parseTimestamp(match[2], `cue ${index} end`);
    if (end < start) throw new Error(`Cue ${index} ends before it starts.`);
    cues.push({ index, start, end, text });
  }

  if (cues.length === 0) {
    throw new Error(`No subtitle cues found in ${path.relative(ROOT, filePath)}.`);
  }
  return cues;
}

function readSubtitleManifest(filePath) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Cannot read subtitle manifest ${path.relative(ROOT, filePath)}: ${error.message}`
    );
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Subtitle manifest root must be a JSON object.');
  }
  if (!raw.source || typeof raw.source !== 'object' || Array.isArray(raw.source)) {
    throw new Error('Subtitle manifest needs a source object.');
  }
  if (!Array.isArray(raw.lessons) || raw.lessons.length === 0) {
    throw new Error('Subtitle manifest needs at least one lesson.');
  }
  if (raw.defaultSpeaker !== undefined) assertString(raw.defaultSpeaker, 'defaultSpeaker');
  if (raw.nameMap !== undefined) normalizeNameMap(raw.nameMap);
  if (raw.translations !== undefined) {
    if (
      !raw.translations ||
      typeof raw.translations !== 'object' ||
      Array.isArray(raw.translations)
    ) {
      throw new Error('Subtitle manifest translations must be an object keyed by cue number.');
    }
    const normalized = {};
    for (const [key, value] of Object.entries(raw.translations)) {
      if (!/^\d+$/.test(key) || Number(key) < 1) {
        throw new Error(`translations key "${key}" must be a positive cue number.`);
      }
      assertString(value, `translations.${key}`);
      normalized[String(Number(key))] = value;
    }
    raw.translations = normalized;
  }
  return raw;
}

function subtitleLessonRange(lesson, index, singleLesson) {
  const label = lesson?.id ?? `lesson ${index + 1}`;
  const hasStart = lesson?.start !== undefined && lesson?.start !== null;
  const hasEnd = lesson?.end !== undefined && lesson?.end !== null;
  if (!hasStart && !hasEnd) {
    if (!singleLesson) {
      throw new Error(`${label}: a manifest with multiple lessons needs start and end timestamps.`);
    }
    return { start: 0, end: Number.POSITIVE_INFINITY };
  }
  if (!hasStart || !hasEnd) {
    throw new Error(`${label}: provide both start and end timestamps.`);
  }
  const start = parseTimestamp(lesson.start, `${label}.start`);
  const end = parseTimestamp(lesson.end, `${label}.end`);
  if (start >= end) throw new Error(`${label}: start must be before end.`);
  return { start, end };
}

function readSubtitleTranscript(filePath, options = {}) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read subtitle ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
  const cues = parseSubtitleCues(raw, filePath);
  const manifestPath = options.manifestPath
    ? path.resolve(options.manifestPath)
    : filePath.replace(/\.(srt|vtt)$/i, '.import.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Subtitle import needs a sidecar manifest at ${path.relative(
        ROOT,
        manifestPath
      )} (or pass --manifest). It supplies the source licence, attribution, courseId and lesson boundaries.`
    );
  }

  const manifest = readSubtitleManifest(manifestPath);
  const source = { mediaType: 'video', ...manifest.source };
  // Check provenance before parsing cue text so a closed licence fails with the
  // licence error, not an unrelated translation error.
  validateSource(source);
  const singleLesson = manifest.lessons.length === 1;
  const ranges = manifest.lessons.map((lesson, index) =>
    subtitleLessonRange(lesson, index, singleLesson)
  );

  for (let left = 0; left < ranges.length; left += 1) {
    for (let right = left + 1; right < ranges.length; right += 1) {
      const a = ranges[left];
      const b = ranges[right];
      if (a.start < b.end && b.start < a.end) {
        const aLabel = manifest.lessons[left]?.id ?? `lesson ${left + 1}`;
        const bLabel = manifest.lessons[right]?.id ?? `lesson ${right + 1}`;
        throw new Error(`${aLabel} and ${bLabel}: lesson ranges overlap.`);
      }
    }
  }

  const translations = manifest.translations ?? {};
  const lessons = manifest.lessons.map((lesson, index) => {
    const label = lesson?.id ?? `lesson ${index + 1}`;
    if (lesson?.defaultSpeaker !== undefined) {
      assertString(lesson.defaultSpeaker, `${label}.defaultSpeaker`);
    }
    const range = ranges[index];
    const selected = cues.filter((cue) => cue.start >= range.start && cue.start < range.end);
    if (selected.length < 2) {
      throw new Error(
        `${label}: only ${selected.length} subtitle cue(s) fall inside the lesson range; need at least two.`
      );
    }
    const defaultSpeaker = lesson?.defaultSpeaker ?? manifest.defaultSpeaker ?? 'Narrator';
    const dialogue = selected.map((cue) => cueToDialogue(cue, defaultSpeaker, translations));
    return {
      id: lesson?.id,
      title: lesson?.title,
      ...(lesson?.summary !== undefined ? { summary: lesson.summary } : {}),
      dialogue,
    };
  });

  const transcript = validateTranscript({ source, lessons, nameMap: manifest.nameMap });
  return applyNameMapToTranscript(transcript, normalizeNameMap(transcript.nameMap));
}

function readTranscript(filePath, options = {}) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.srt' || extension === '.vtt') {
    return readSubtitleTranscript(filePath, options);
  }
  if (extension !== '.json') {
    throw new Error(
      `Unsupported transcript format "${extension || '(none)'}". Use a .json, .srt or .vtt file.`
    );
  }
  if (options.manifestPath) {
    throw new Error('--manifest is only supported for .srt and .vtt transcripts.');
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read transcript ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
  const transcript = validateTranscript(raw);
  return applyNameMapToTranscript(transcript, normalizeNameMap(transcript.nameMap));
}

function preferDistractors(localPool, globalPool, answer, count) {
  const local = pickDistractors(localPool, answer, count);
  if (local.length >= count) return local;
  const fallback = pickDistractors([...localPool, ...globalPool], answer, count);
  return uniqueStrings([...local, ...fallback]).slice(0, count);
}

function translationQuestion(line, englishPool, localEnglish) {
  const distractors = preferDistractors(localEnglish, englishPool, line.en, 3);
  if (distractors.length < 2) return null;
  return {
    prompt: `What does “${line.sw}” mean?`,
    correctChain: [line.en],
    scrambledTokens: [line.en, ...distractors],
    explain: `“${line.sw}” means “${withoutEnd(line.en)}”.`,
  };
}

function buildQuestion(line, localLines, allLines) {
  const chain = tokenizeSwahili(line.sw);
  if (chain.length === 0) return null;
  const used = new Set(chain.map((token) => token.toLowerCase()));
  const distractors = [];
  // Prefer words from this dialogue, then borrow from the rest of the course.
  for (const other of [...localLines, ...allLines]) {
    for (const token of tokenizeSwahili(other.sw)) {
      const key = token.toLowerCase();
      if (used.has(key)) continue;
      used.add(key);
      distractors.push(token);
      if (distractors.length >= 3) break;
    }
    if (distractors.length >= 3) break;
  }
  if (distractors.length === 0) return null;
  return {
    prompt: `Say “${line.en}” in Swahili:`,
    correctChain: chain,
    scrambledTokens: [...chain, ...distractors],
    explain: `“${line.sw}” — ${withoutEnd(line.en)}.`,
  };
}

function responseQuestion(first, second, swahiliPool, localSwahili) {
  if (first.sw.trim().toLowerCase() === second.sw.trim().toLowerCase()) return null;
  const distractors = preferDistractors(localSwahili, swahiliPool, second.sw, 3);
  if (distractors.length < 2) return null;
  return {
    prompt: `Which line answers “${first.sw}” in this dialogue?`,
    correctChain: [second.sw],
    scrambledTokens: [second.sw, ...distractors],
    explain: `In the dialogue, “${first.sw}” is answered by “${second.sw}” — ${withoutEnd(second.en)}.`,
  };
}

function buildQuestions(lesson, allLines) {
  const questions = [];
  const lines = lesson.dialogue;
  const englishPool = allLines.map((line) => line.en);
  const swahiliPool = allLines.map((line) => line.sw);
  const localEnglish = lines.map((line) => line.en);
  const localSwahili = lines.map((line) => line.sw);

  const add = (question) => {
    if (!question || questions.length >= 5) return;
    const signature = `${question.prompt}|${question.correctChain.join(' ')}`;
    if (
      questions.some(
        (existing) => `${existing.prompt}|${existing.correctChain.join(' ')}` === signature
      )
    ) {
      return;
    }
    questions.push(question);
  };

  add(translationQuestion(lines[0], englishPool, localEnglish));
  if (lines[1]) add(buildQuestion(lines[1], lines, allLines));

  // Ask for the reply to a real question. Only a line ending in "?" has a
  // meaningful answer; greeting-to-greeting adjacency (FSI's two
  // "Jambo, bwana" lines) would make an empty question.
  const pairIndex = lines.findIndex(
    (line, index) =>
      index + 1 < lines.length &&
      /\?$/.test(line.sw.trim()) &&
      line.sw.trim().toLowerCase() !== lines[index + 1].sw.trim().toLowerCase()
  );
  if (pairIndex >= 0) {
    add(responseQuestion(lines[pairIndex], lines[pairIndex + 1], swahiliPool, localSwahili));
  }

  const later = lines[2] ?? lines[1];
  if (later) add(translationQuestion(later, englishPool, localEnglish));
  const last = lines[lines.length - 1];
  if (last) add(buildQuestion(last, lines, allLines));

  // Short dialogues can miss the five-question target; fill with the remaining
  // lines in the other exercise type, never duplicating a prompt.
  for (const line of lines) {
    if (questions.length >= 5) break;
    add(buildQuestion(line, lines, allLines));
    if (questions.length < 5) add(translationQuestion(line, englishPool, localEnglish));
  }

  if (questions.length < 3) {
    throw new Error(
      `${lesson.id}: only ${questions.length} questions could be generated; add more dialogue lines.`
    );
  }
  return questions;
}

function buildTheory(source, lesson) {
  const theory = [];
  if (lesson.summary) theory.push(lesson.summary.trim());
  for (const line of lesson.dialogue) {
    theory.push(`${line.speaker}: “${line.sw}” — ${line.en}`);
  }
  const provenance =
    source.mediaType === 'video'
      ? 'The dialogue is reproduced from the licensed video transcript; summaries and quiz questions are original Bolingo writing.'
      : 'The dialogue is reproduced from the public-domain course transcript; summaries and quiz questions are original Bolingo writing.';
  theory.push(`Source: ${source.attribution} — ${source.license}. ${provenance}`);
  return theory;
}

function buildDrafts(transcript) {
  const { source } = transcript;
  const allLines = transcript.lessons.flatMap((lesson) => lesson.dialogue);
  const lessons = transcript.lessons.map((lesson, index) => {
    const draft = {
      id: lesson.id,
      course_id: source.courseId,
      title: lesson.title,
      theory: buildTheory(source, lesson),
      questions: buildQuestions(lesson, allLines),
      position: Number.isInteger(source.positionBase) ? source.positionBase + index + 1 : 101 + index,
      published: false,
    };
    const accepted = toCourseLesson({
      id: draft.id,
      title: draft.title,
      theory: draft.theory,
      questions: draft.questions,
    });
    if (!accepted) {
      throw new Error(`${draft.id}: generated draft is rejected by the app validator.`);
    }
    return draft;
  });

  // A draft must never shadow a bundled lesson. The catalog migration lists the
  // ids the app already knows; a draft id must be new to it.
  const catalogSql = path.join(ROOT, 'supabase', 'migrations_language_catalog.sql');
  if (fs.existsSync(catalogSql)) {
    const catalogIds = new Set(
      [...fs.readFileSync(catalogSql, 'utf8').matchAll(/"id":"([^"]+)"/g)].map((match) => match[1])
    );
    for (const lesson of lessons) {
      if (catalogIds.has(lesson.id)) {
        throw new Error(`${lesson.id}: draft id already exists in the bundled catalog.`);
      }
    }
  }

  return {
    source,
    draft: true,
    published: false,
    lessons,
  };
}

function jsonLines(rows) {
  return rows.map((row) => `  ${JSON.stringify(row)}`).join(',\n');
}

function buildSql(drafts, transcriptPath = DEFAULT_TRANSCRIPT) {
  const { source } = drafts;
  const rows = drafts.lessons.map(({ published: _published, ...row }) => row);
  const payload = `[\n${jsonLines(rows)}\n]`;
  const transcriptLabel = path.relative(ROOT, transcriptPath).split(path.sep).join('/');
  // Fail during generation, not in psql, if a row produced invalid JSON.
  JSON.parse(payload);
  return `-- ============================================================================
-- DRAFT language lessons — ${source.title}
--
-- GENERATED FILE — edit ${transcriptLabel} and run
-- \`node scripts/import-language-transcripts.cjs ...\`.
--
-- Source: ${source.url}
-- Licence: ${source.license}
-- Attribution: ${source.attribution}
--
-- These rows are inserted with published = false. Learners do not see them.
-- Review a row in the Supabase table editor, then set published = true to make
-- it available by lesson id. Adding it to the learning path still needs a
-- curriculum release (see docs/language-catalog.md).
--
-- Safe to re-run. It updates only unpublished drafts; a lesson an editor has
-- published is left untouched. ${rows.length} drafts.
-- ============================================================================

do $$
begin
  if not exists (select 1 from public.language_courses where id = '${source.courseId}') then
    raise exception 'Run supabase/migrations_language_catalog.sql before importing drafts.';
  end if;
end
$$;

insert into public.language_lessons (id, course_id, title, theory, questions, position, published)
select x.id, x.course_id, x.title, x.theory, x.questions, x.position, false
from jsonb_to_recordset($drafts$${payload}$drafts$::jsonb)
  as x(id text, course_id text, title text, theory jsonb, questions jsonb, position integer)
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  theory = excluded.theory,
  questions = excluded.questions,
  position = excluded.position
where public.language_lessons.published = false;
`;
}

function outputPaths(source) {
  const coursePrefix = `${source.courseId}-`;
  // Source ids that start with the course name (for example a video import)
  // need their own suffix; using just the first segment would make every
  // "swahili-video-*" source overwrite `drafts_swahili_swahili.sql`.
  const suffix = source.id.startsWith(coursePrefix)
    ? source.id.slice(coursePrefix.length)
    : source.id.split('-')[0];
  const shortId = suffix || source.id;
  return {
    json: path.join(ROOT, 'content', 'drafts', `${source.id}.drafts.json`),
    sql: path.join(ROOT, 'supabase', `drafts_${source.courseId}_${shortId}.sql`),
  };
}

function readDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const at = trimmed.indexOf('=');
    out[trimmed.slice(0, at).trim()] = trimmed
      .slice(at + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function applyDraftSql(sqlPath) {
  const url = process.env.BOLINGO_DATABASE_URL || readDotEnv().BOLINGO_DATABASE_URL;
  if (!url) {
    throw new Error(
      'BOLINGO_DATABASE_URL is not set. Add it to .env or run the generated SQL in the Supabase SQL editor.'
    );
  }
  const result = spawnSync('psql', [url, '-X', '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], {
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`psql could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`psql exited with status ${result.status}; drafts were not applied cleanly.`);
  }
}

function parseArgs(args) {
  let file;
  let manifest;
  let apply = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--manifest') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--manifest needs a file path.');
      }
      manifest = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}.`);
    if (file) throw new Error('Pass one transcript file at a time.');
    file = arg;
  }
  return { file, manifest, apply };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const transcriptPath = args.file ? path.resolve(ROOT, args.file) : DEFAULT_TRANSCRIPT;
  const manifestPath = args.manifest ? path.resolve(ROOT, args.manifest) : undefined;

  const transcript = readTranscript(transcriptPath, { manifestPath });
  const drafts = buildDrafts(transcript);
  const paths = outputPaths(transcript.source);
  const questions = drafts.lessons.reduce((total, lesson) => total + lesson.questions.length, 0);

  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, `${JSON.stringify(drafts, null, 2)}\n`, 'utf8');
  fs.writeFileSync(paths.sql, buildSql(drafts, transcriptPath), 'utf8');

  console.log(
    `Drafted ${drafts.lessons.length} lessons / ${questions} questions from ${transcript.source.title}.`
  );
  console.log(`  ${path.relative(ROOT, paths.json)}`);
  console.log(`  ${path.relative(ROOT, paths.sql)} (all rows published = false)`);

  if (args.apply) {
    applyDraftSql(paths.sql);
    console.log(`Applied ${drafts.lessons.length} draft lessons to Supabase (unpublished).`);
  } else {
    console.log('Run again with --apply, or run the SQL in the Supabase SQL editor.');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Transcript import failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_TRANSCRIPT,
  ROOT,
  readTranscript,
  readSubtitleTranscript,
  parseSubtitleCues,
  parseTimestamp,
  parseArgs,
  buildDrafts,
  buildSql,
  outputPaths,
  tokenizeSwahili,
};
