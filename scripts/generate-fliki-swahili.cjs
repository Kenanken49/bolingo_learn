#!/usr/bin/env node
'use strict';

/**
 * Generate natural Swahili narration for Livia with Fliki.
 *
 *   node scripts/generate-fliki-swahili.cjs --list-voices
 *   node scripts/generate-fliki-swahili.cjs --confirm-rights
 *
 * Fliki returns an MP3 URL per phrase; this script downloads those files into
 * `assets/audio/swahili/`, writes a reviewable manifest, and regenerates the
 * typed `clips.ts` map the lesson player imports. The API key stays in
 * `.env.local` — it is never read by the app and never written to a clip.
 *
 * Treat generated audio as licensed content: `--confirm-rights` is required so
 * an operator consciously accepts the Fliki plan's commercial-use terms.
 */

const fs = require('node:fs');
const path = require('node:path');
const { getSwahiliPhrases, ROOT } = require('./lib/swahili-phrases.cjs');

const API_BASE = 'https://api.fliki.ai/v1';
const OUT_DIR = path.join(ROOT, 'assets', 'audio', 'swahili');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const CLIPS_PATH = path.join(OUT_DIR, 'clips.ts');
const SAMPLE_RATE = 48000;
const MAX_CONTENT = 3000;

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    if (!value || value.startsWith('#')) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    listVoices: false,
    confirmRights: false,
    force: false,
    json: false,
    limit: null,
    voiceId: null,
    voiceStyleId: null,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--list-voices') options.listVoices = true;
    else if (arg === '--confirm-rights') options.confirmRights = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.slice(8));
    else if (arg.startsWith('--voice=')) options.voiceId = arg.slice(8);
    else if (arg.startsWith('--style=')) options.voiceStyleId = arg.slice(8);
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Generate natural Swahili lesson audio with Fliki.

  --list-voices      Print Swahili voices, dialects and style IDs, then exit
  --dry-run          Print the phrases that would be generated, no API call
  --confirm-rights   Confirm the Fliki plan allows this commercial distribution
  --force            Regenerate clips even when the audio file already exists
  --limit=N          Generate only the first N missing clips (partial test run)
  --voice=ID         Override FLIKI_VOICE_ID
  --style=ID         Override FLIKI_VOICE_STYLE_ID
  --json             Machine-readable summary

Environment (.env.local):
  FLIKI_API_KEY          Required for generation; never prefix with EXPO_PUBLIC_
  FLIKI_VOICE_ID         Optional chosen voice; --list-voices prints options
  FLIKI_VOICE_STYLE_ID   Optional style; omitted for the voice's neutral read
  FLIKI_VOICE_NAME       Optional human label for the manifest

Run with: node --env-file=.env.local scripts/generate-fliki-swahili.cjs --confirm-rights
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }
  return options;
}

function apiKeyFromEnv() {
  const key = (process.env.FLIKI_API_KEY || '').trim();
  if (!key) {
    throw new Error(
      'FLIKI_API_KEY is missing. Add it to .env.local (never commit it, never paste it in chat), then rerun with --confirm-rights.'
    );
  }
  return key;
}

async function flikiJson(apiKey, route, init = {}) {
  const response = await fetch(`${API_BASE}${route}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Fliki ${init.method || 'GET'} ${route} failed (${response.status}): ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Fliki returned non-JSON for ${route}: ${text.slice(0, 200)}`);
  }
}

function asList(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

async function fetchLanguages(apiKey) {
  return asList(await flikiJson(apiKey, '/languages'), ['data', 'languages']);
}

async function fetchDialects(apiKey) {
  return asList(await flikiJson(apiKey, '/dialects'), ['data', 'dialects']);
}

async function fetchVoices(apiKey, languageId, dialectId) {
  const query = new URLSearchParams({ languageId, dialectId });
  return asList(await flikiJson(apiKey, `/voices?${query.toString()}`), ['data', 'voices']);
}

/** Pick the Swahili language row, preferring an exact `sw` slug. */
function chooseSwahiliLanguage(languages) {
  const exact = languages.find((l) => String(l.slug).toLowerCase() === 'sw');
  if (exact) return exact;
  return languages.find((l) => /swahili|kiswahili/i.test(`${l.name} ${l.slug}`)) ?? null;
}

/** Prefer Kenyan Swahili, then Tanzanian, then any Swahili dialect. */
function chooseSwahiliDialect(dialects) {
  // Match Swahili itself, not every dialect that happens to mention Kenya
  // ("Kenyan English" is also in Fliki's global dialect list).
  const swahili = dialects.filter((d) =>
    /swahili|kiswahili|(^|\s)sw([-\s]|$)|sw-ke|sw-tz|sw-ug/i.test(`${d.name} ${d.slug}`)
  );
  if (swahili.length === 0) return null;
  const score = (dialect) => {
    const text = `${dialect.name} ${dialect.slug}`.toLowerCase();
    if (/kenya|sw-ke/.test(text)) return 4;
    if (/tanzania|sw-tz/.test(text)) return 3;
    if (/uganda|sw-ug/.test(text)) return 2;
    return 1;
  };
  return [...swahili].sort((a, b) => score(b) - score(a) || String(a.name).localeCompare(String(b.name)))[0];
}

/** Prefer an Ultra realistic female voice; fall back deterministically. */
function chooseSwahiliVoice(voices) {
  if (voices.length === 0) return null;
  const score = (voice) => {
    const ultra = String(voice.isUltra).toLowerCase() === 'true' ? 4 : 0;
    const female = String(voice.gender).toLowerCase() === 'female' ? 2 : 0;
    const styles = Array.isArray(voice.styles) ? voice.styles.map((s) => s.style).join(' ').toLowerCase() : '';
    const friendly = /friendly|narration|storytelling/.test(styles) ? 1 : 0;
    return ultra + female + friendly;
  };
  return [...voices].sort(
    (a, b) => score(b) - score(a) || String(a.name).localeCompare(String(b.name))
  )[0];
}

function chooseVoiceStyle(voice, explicitStyleId) {
  // Neutral read by default. A style can change stress and vowel length, which
  // is exactly what a pronunciation model must not do; opt in explicitly.
  if (explicitStyleId) {
    const match = (voice.styles || []).find((s) => s._id === explicitStyleId);
    return { id: explicitStyleId, name: match?.style ?? explicitStyleId };
  }
  return { id: null, name: null };
}

async function resolveVoice(apiKey, options) {
  const languages = await fetchLanguages(apiKey);
  const language = chooseSwahiliLanguage(languages);
  if (!language) {
    const sample = languages.slice(0, 12).map((l) => `${l.name} (${l.slug})`).join(', ');
    throw new Error(`Fliki has no Swahili language row. Available languages include: ${sample}`);
  }

  const dialects = await fetchDialects(apiKey);
  const dialect = chooseSwahiliDialect(dialects);
  if (!dialect) {
    const sample = dialects.map((d) => `${d.name} (${d.slug})`).join(', ');
    throw new Error(`Fliki has no Swahili dialect. Available dialects: ${sample.slice(0, 600)}`);
  }

  const voices = await fetchVoices(apiKey, language._id, dialect._id);
  if (voices.length === 0) {
    throw new Error(`Fliki returned no voices for ${language.name} / ${dialect.name}.`);
  }

  const configuredId = options.voiceId || (process.env.FLIKI_VOICE_ID || '').trim();
  const voice = configuredId
    ? voices.find((v) => v._id === configuredId)
    : chooseSwahiliVoice(voices);
  if (!voice) {
    throw new Error(
      `The configured FLIKI_VOICE_ID is not available for ${language.name} / ${dialect.name}. ` +
        `Run --list-voices and choose one of: ${voices.map((v) => `${v.name}=${v._id}`).join(', ')}`
    );
  }

  const explicitStyle = options.voiceStyleId || (process.env.FLIKI_VOICE_STYLE_ID || '').trim() || null;
  const style = chooseVoiceStyle(voice, explicitStyle);
  return { language, dialect, voices, voice, style };
}

function printVoiceCatalog(resolved) {
  console.log(`Language: ${resolved.language.name} (${resolved.language._id})`);
  console.log(`Dialect:  ${resolved.dialect.name} (${resolved.dialect._id})`);
  console.log('Voices:');
  for (const voice of resolved.voices) {
    const styles = (voice.styles || []).map((s) => `${s.style}=${s._id}`).join(', ') || 'none';
    console.log(`  ${voice._id}  ${voice.name}  gender=${voice.gender}  ultra=${voice.isUltra}  styles: ${styles}`);
  }
  console.log(`Chosen:   ${resolved.voice.name} (${resolved.voice._id})`);
  console.log(`Style:    ${resolved.style.name ?? 'neutral'}`);
}

function buildTtsBody(phrase, voiceId, voiceStyleId) {
  if (phrase.length > MAX_CONTENT) throw new Error(`Phrase exceeds Fliki's ${MAX_CONTENT}-character limit: ${phrase.slice(0, 60)}…`);
  return {
    content: phrase,
    voiceId,
    sampleRate: SAMPLE_RATE,
    playbackRate: 1,
    format: 'mp3',
    ...(voiceStyleId ? { voiceStyleId } : {}),
  };
}

function extractAudio(payload) {
  const url = payload?.audio ?? payload?.data?.audio ?? payload?.audioUrl ?? payload?.data?.audioUrl;
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new Error(`Fliki response did not include an audio URL: ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return url;
}

function extractDuration(payload) {
  const duration = Number(payload?.duration ?? payload?.data?.duration);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) / 1000 : 0;
}

/** Reject HTML/JSON error pages saved under an .mp3 name. */
function assertMp3(buffer, label) {
  if (!buffer || buffer.length < 256) throw new Error(`Downloaded audio is too small for ${label}.`);
  const id3 = buffer.subarray(0, 3).toString('ascii') === 'ID3';
  const frame = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  if (!id3 && !frame) throw new Error(`Downloaded file is not an MP3 for ${label}.`);
}

async function downloadAudio(url, destination, label) {
  const response = await fetch(url, { headers: { Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.5' } });
  if (!response.ok) throw new Error(`Audio download failed for ${label} (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  assertMp3(buffer, label);
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.writeFile(destination, buffer);
  return buffer.length;
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function renderClipsModule(manifest) {
  const lines = [
    '/**',
    ' * AUTO-GENERATED by scripts/generate-fliki-swahili.cjs — do not edit by hand.',
    ' *',
    ' * Natural Swahili narration for the phone-free phrase lessons. The map is',
    ' * keyed by the same normalized phrase the lesson player asks for; a missing',
    ' * key falls back to the installed device voice instead of silence.',
    ' */',
    '',
    'export interface SwahiliClip {',
    '  source: number;',
    '  text: string;',
    '  duration: number;',
    '  voiceId: string;',
    '  voiceName: string;',
    '}',
    '',
    'export const SWAHILI_CLIPS: Record<string, SwahiliClip> = {',
  ];
  for (const clip of manifest.clips) {
    lines.push(`  ${JSON.stringify(clip.key)}: {`);
    lines.push(`    source: require('./${clip.file}'),`);
    lines.push(`    text: ${JSON.stringify(clip.phrase)},`);
    lines.push(`    duration: ${clip.duration},`);
    lines.push(`    voiceId: ${JSON.stringify(manifest.voice.id)},`);
    lines.push(`    voiceName: ${JSON.stringify(manifest.voice.name)},`);
    lines.push('  },');
  }
  lines.push('};', '');
  return lines.join('\n');
}

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

function ensureUniqueSlugs(phrases) {
  const used = new Set();
  return phrases.map((item, index) => {
    let slug = item.slug || `phrase-${index + 1}`;
    let suffix = 2;
    while (used.has(slug)) slug = `${item.slug}-${suffix++}`;
    used.add(slug);
    return { ...item, slug };
  });
}

async function main() {
  loadEnvFile(path.join(ROOT, '.env.local'));
  loadEnvFile(path.join(ROOT, '.env'));

  const options = parseArgs(process.argv.slice(2));
  let phrases = ensureUniqueSlugs(getSwahiliPhrases());

  if (options.dryRun) {
    if (options.json) console.log(JSON.stringify(phrases, null, 2));
    else {
      console.log(`${phrases.length} Swahili phrases:`);
      for (const phrase of phrases) console.log(`  ${phrase.key.padEnd(26)} ${phrase.phrase}  (${phrase.lessonId})`);
      console.log(`Output: ${path.relative(ROOT, OUT_DIR)}`);
    }
    return;
  }

  const apiKey = apiKeyFromEnv();
  const resolved = await resolveVoice(apiKey, options);

  if (options.listVoices) {
    printVoiceCatalog(resolved);
    return;
  }

  if (!options.confirmRights && process.env.FLIKI_RIGHTS_CONFIRMED !== '1') {
    throw new Error(
      'Confirm that your Fliki plan permits commercial distribution of the generated audio: rerun with --confirm-rights.'
    );
  }

  const existing = readManifest();
  if (
    existing?.voice?.id &&
    existing.voice.id !== resolved.voice._id &&
    !options.force
  ) {
    throw new Error(
      `Existing clips use ${existing.voice.name} (${existing.voice.id}), but the selected voice is ${resolved.voice.name} (${resolved.voice._id}). ` +
        'Rerun with --force to regenerate every clip in the new voice.'
    );
  }

  const existingByKey = new Map((existing?.clips || []).map((clip) => [clip.key, clip]));
  const voice = {
    id: resolved.voice._id,
    name: (process.env.FLIKI_VOICE_NAME || '').trim() || resolved.voice.name,
    gender: resolved.voice.gender ?? null,
    styleId: resolved.style.id,
    style: resolved.style.name,
    language: resolved.language.name,
    dialect: resolved.dialect.name,
  };

  if (options.limit) phrases = phrases.slice(0, options.limit);

  const clips = [];
  let generated = 0;
  let reused = 0;

  for (const phrase of phrases) {
    const file = `${phrase.slug}.mp3`;
    const destination = path.join(OUT_DIR, file);
    const previous = existingByKey.get(phrase.key);
    const canReuse =
      !options.force &&
      previous?.file === file &&
      fs.existsSync(destination) &&
      fs.statSync(destination).size > 256;

    if (canReuse) {
      clips.push({ ...previous, ...phrase, duration: previous.duration ?? 0 });
      reused++;
      console.log(`reuse  ${phrase.key}`);
      continue;
    }

    process.stdout.write(`generate ${phrase.key} … `);
    const body = buildTtsBody(phrase.phrase, resolved.voice._id, resolved.style.id);
    const response = await flikiJson(apiKey, '/generate/text-to-speech', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const audioUrl = extractAudio(response);
    const duration = extractDuration(response);
    await downloadAudio(audioUrl, destination, phrase.key);
    clips.push({
      key: phrase.key,
      slug: phrase.slug,
      phrase: phrase.phrase,
      file,
      duration,
      lessonId: phrase.lessonId,
      lessonTitle: phrase.lessonTitle,
      questionIndex: phrase.questionIndex,
    });
    generated++;
    console.log(`ok (${duration ? `${duration.toFixed(2)}s` : 'duration n/a'})`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // A --limit run is a test slice; keep earlier clips in the manifest so the
  // app does not lose narration it already has.
  const merged = new Map();
  for (const clip of existing?.clips || []) merged.set(clip.key, clip);
  for (const clip of clips) merged.set(clip.key, clip);
  const ordered = ensureUniqueSlugs(getSwahiliPhrases())
    .map((phrase) => merged.get(phrase.key))
    .filter(Boolean);

  const expectedCount = getSwahiliPhrases().length;
  const manifest = {
    kind: 'fliki-swahili-lesson-clips',
    provider: 'fliki',
    api: `${API_BASE}/generate/text-to-speech`,
    model: 'fliki-text-to-speech',
    generatedAt: new Date().toISOString(),
    sampleRate: SAMPLE_RATE,
    complete: ordered.length === expectedCount,
    voice,
    clips: ordered,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeIfChanged(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeIfChanged(CLIPS_PATH, renderClipsModule(manifest));

  const summary = {
    generated,
    reused,
    total: manifest.clips.length,
    expected: expectedCount,
    voice: voice.name,
    voiceId: voice.id,
    outDir: path.relative(ROOT, OUT_DIR),
  };
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(
      `\n${generated} generated, ${reused} reused — ${summary.total}/${summary.expected} clips in ${summary.outDir}.`
    );
    console.log(`Voice: ${voice.name} (${voice.id})${voice.style ? ` · ${voice.style}` : ''}`);
    if (summary.total < summary.expected) {
      console.log('Partial set: rerun without --limit to fill the remaining phrases.');
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  API_BASE,
  main,
  buildTtsBody,
  chooseSwahiliLanguage,
  chooseSwahiliDialect,
  chooseSwahiliVoice,
  chooseVoiceStyle,
  extractAudio,
  extractDuration,
  assertMp3,
  parseArgs,
};
