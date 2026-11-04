#!/usr/bin/env node
/**
 * Guard the premium Philosophy classics shelf.
 *
 * LoyalBooks mirrors public-domain works (LibriVox audio + Gutenberg text),
 * so the catalog ships in the bundle — unlike learner uploads, which need
 * the content-rights attestation. This gate keeps the seed honest:
 *
 *   1. Catalog — 100+ books, unique slugs, LoyalBooks genre taxonomy on
 *      every book, https audio/text links only.
 *   2. Seed — every Metro require() in seed.ts resolves to a file on disk,
 *      and every bundled file is claimed by the catalog.
 *   3. Library — the expected offline API surface exists and streams /
 *      downloads over https only (expo-file-system/legacy, like uploads).
 *   4. Wiring — the route is registered, the home path links it, premium
 *      gates every action, and the doc + gate registration exist.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'assets', 'audiobooks', 'philosophy-catalog.json');
const SEED = path.join(ROOT, 'assets', 'audiobooks', 'seed.ts');
const LIB = path.join(ROOT, 'lib', 'classicsAudiobooks.ts');
const DAILY = path.join(ROOT, 'lib', 'classicsDailyLimit.ts');
const SCREEN = path.join(ROOT, 'src', 'app', 'audiobooks.tsx');
const LAYOUT = path.join(ROOT, 'src', 'app', '_layout.tsx');
// The shelf entry lives in the Library hub, not the dashboard home.
const HOME = path.join(ROOT, 'src', 'app', 'library.tsx');
const DOCS = path.join(ROOT, 'docs', 'classics-audiobooks.md');
const GATES = path.join(ROOT, 'content', 'quality', 'gates.json');
const PACKAGE = path.join(ROOT, 'package.json');
const APPICON = path.join(ROOT, 'components', 'AppIcon.tsx');

let failures = 0;
const queue = [];

function check(name, fn) {
  queue.push({ name, fn });
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const payload = JSON.parse(read(CATALOG));
const books = payload.books;

// --- 1. Catalog ----------------------------------------------------------

check('The catalog ships 100+ philosophy books with unique slugs', () => {
  assert(payload.version === 1, 'catalog version must be 1');
  assert(Array.isArray(books) && books.length >= 100, `expected 100+ books, got ${books.length}`);
  assert(!books.some((b) => b.slug === 'Deer-Godchild'), 'curated-out misfits must stay out of the catalog');
  const slugs = books.map((b) => b.slug);
  assert(new Set(slugs).size === slugs.length, 'slugs must be unique');
  for (const b of books) {
    if (b.source === 'archive.org') {
      assert(
        b.url === `https://archive.org/details/${b.archiveId}`,
        `archive.org books must link their details page: ${b.slug}`
      );
      assert(
        b.cover == null || /^https:\/\/archive\.org\/services\/img\//.test(b.cover),
        `archive.org covers must come from services/img: ${b.slug}`
      );
    } else {
      assert(/^https:\/\/www\.loyalbooks\.com\/image\//.test(b.cover || ''), `cover must be the LoyalBooks image: ${b.slug}`);
    }
    assert(typeof b.title === 'string' && b.title.length > 0, `missing title: ${b.slug}`);
    assert(typeof b.author === 'string', `missing author: ${b.slug}`);
    if (b.source !== 'archive.org') {
      assert(b.url === `https://www.loyalbooks.com/book/${b.slug}`, `source URL must be the LoyalBooks page: ${b.slug}`);
    }
  }
});

check('Every book carries the LoyalBooks genre taxonomy', () => {
  const withGenres = books.filter((b) => Array.isArray(b.genres) && b.genres.length > 0);
  assert(withGenres.length === books.length, `${books.length - withGenres.length} books lack LoyalBooks genres`);
  for (const b of withGenres) {
    assert(b.genres.every((g) => typeof g === 'string' && g.length > 0), `bad genre entry: ${b.slug}`);
  }
  const names = new Set(withGenres.flatMap((b) => b.genres));
  assert(names.has('Philosophy'), 'Philosophy must be a taxonomy genre');
  assert(names.size >= 5, 'the taxonomy must span several LoyalBooks genres');
});

check('Audio and text links are https and point at the archives', () => {
  const audio = books.filter((b) => b.archiveId);
  assert(audio.length >= 100, `expected 100+ narrated books, got ${audio.length}`);
  for (const b of audio) {
    assert(/^https:\/\/archive\.org\//.test(b.audioZip || ''), `audio zip must be archive.org https: ${b.slug}`);
  }
  for (const b of books.filter((b) => b.textUrl)) {
    assert(/^https:\/\//.test(b.textUrl), `text must be https: ${b.slug}`);
  }
  assert(books.some((b) => /gutenberg\.org/.test(b.gutenbergUrl || '')), 'Gutenberg provenance must survive on some books');
});

// --- 2. Seed manifest -----------------------------------------------------

check('Every bundled require() resolves, and every file is claimed', () => {
  const seed = read(SEED);
  assert(seed.includes('AUTO-GENERATED'), 'seed.ts must stay generated');
  const required = [...seed.matchAll(/require\('(\.[^']+)'\)/g)].map((m) => m[1]);
  assert(required.length > 0, 'the starter shelf must bundle files');
  for (const rel of required) {
    const abs = path.resolve(path.dirname(SEED), rel);
    assert(fs.existsSync(abs), `seed requires missing file: ${rel}`);
  }
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  for (const rel of required) {
    const m = rel.match(/^\.\/(texts|audio)\/([^/]+)/);
    assert(m, `unexpected seed path: ${rel}`);
    assert(bySlug.has(m[2].replace(/\.txt$/, '')), `bundled file claims no catalog book: ${rel}`);
  }
  const dir = path.join(ROOT, 'assets', 'audiobooks');
  const onDisk = [];
  for (const sub of ['texts', 'audio']) {
    const base = path.join(dir, sub);
    if (!fs.existsSync(base)) continue;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else onDisk.push(`./${path.relative(dir, p).replace(/\\/g, '/')}`);
      }
    };
    walk(base);
  }
  const claimed = new Set(required);
  for (const f of onDisk) assert(claimed.has(f), `on-disk shelf file not in seed.ts: ${f}`);
});

// --- 3. Library surface ----------------------------------------------------

check('The offline library exposes the full download/play API', () => {
  const lib = read(LIB);
  for (const fn of [
    'CLASSICS', 'getClassic', 'primaryGenre', 'genreCounts', 'fetchChapters',
    'downloadBook', 'removeOfflineBook', 'localCoverUri', 'localTextUri', 'playableChapters',
    'getOfflineStatus', 'formatBytes', 'readTextFile',
  ]) {
    assert(new RegExp(`export (async function|const|function|interface|type) ${fn}\\b`).test(lib), `lib must export ${fn}`);
  }
  assert(lib.includes('expo-file-system/legacy'), 'downloads must use the legacy FileSystem module like uploads');
  assert(lib.includes('https://archive.org/metadata/'), 'chapter lists must come from archive.org metadata');
  assert(!/http:\/\/archive\.org/.test(lib), 'no plain-http archive traffic');
});

check('The in-app media player plays every part in order', () => {
  const player = read(path.join(ROOT, 'components', 'AudiobookPlayer.tsx'));
  for (const needle of ['setPlaybackRate', 'seekTo', 'Sleep', 'didJustFinish', 'max-h-64']) {
    assert(player.includes(needle), `AudiobookPlayer.tsx must contain ${needle}`);
  }
  assert(player.includes('sort((a, b) => a.index - b.index)'), 'the chapter queue must follow the downloaded sequence');
  const screen = read(SCREEN);
  assert(screen.includes('visible={player !== null}'), 'Listen must open the full-screen media player');
  assert(screen.includes('Previous page') && screen.includes('Next page'), 'reading mode must turn pages with two arrows');
});

check('Web text reads route through the CORS-safe fetch-text function', () => {
  const fn = read(path.join(ROOT, 'supabase', 'functions', 'fetch-text', 'index.ts'));
  for (const host of ['loyalbooks.com', 'gutenberg.org', 'archive.org']) {
    assert(fn.includes(host), `fetch-text must allowlist ${host}`);
  }
  assert(fn.includes('Access-Control-Allow-Origin'), 'fetch-text must answer CORS');
  assert(fn.includes('text/plain'), 'fetch-text must proxy plain text only');
  const lib = read(LIB);
  assert(lib.includes('fetch-text?url='), 'readTextFile must route cross-origin reads through fetch-text');
  assert(lib.includes("Platform.OS === 'web'"), 'the proxy route must be web-only (native has no CORS)');
});

check('Premium downloads are capped at one book per day', () => {
  assert(fs.existsSync(DAILY), 'lib/classicsDailyLimit.ts is missing');
  const day = read(DAILY);
  for (const fn of ['todayKey', 'getDailyDownload', 'canDownloadToday', 'recordDailyDownload']) {
    assert(new RegExp(`export (async function|function|const) ${fn}\\b`).test(day), `daily-limit lib must export ${fn}`);
  }
  assert(day.includes('AsyncStorage'), 'the daily stamp must persist on-device');
  const screen = read(SCREEN);
  assert(screen.includes('recordDailyDownload'), 'downloads must stamp the daily pick');
  assert(screen.includes('canDownloadToday'), 'downloads must enforce the daily cap');
});

check('The screen renders LoyalBooks categories and gates premium', () => {
  const screen = read(SCREEN);
  for (const needle of ['genreCounts', 'Listen to Audiobook Mode', 'Books Library', '1 book per day', 'OFFLINE ONLY', 'Go Premium', '/paywall', 'is_premium', 'AudiobookPlayer', 'public domain', 'classicsDailyLimit']) {
    assert(screen.includes(needle), `audiobooks.tsx must contain ${needle}`);
  }
  assert(screen.includes("router.push('/auth')"), 'signed-out learners must reach sign-in');
});

// --- 4. Wiring ---------------------------------------------------------------

check('The route, home entry, icons and registrations exist', () => {
  assert(read(LAYOUT).includes('name="audiobooks"'), 'the route must be registered in _layout.tsx');
  assert(read(HOME).includes("router.push('/audiobooks')"), 'the Library hub must link the classics shelf');
  assert(read(HOME).includes('Audiobooks'), 'the Library entry must name the shelf');
  assert(/download:\s*\{[^}]*cloud-download/.test(read(APPICON)), 'AppIcon must ship a download glyph');
  assert(fs.existsSync(DOCS), 'docs/classics-audiobooks.md is missing');
  const docs = read(DOCS);
  for (const needle of ['LibriVox', 'Gutenberg', 'public domain', 'Genres for this book']) {
    assert(docs.includes(needle), `docs must explain ${needle}`);
  }
  const gates = JSON.parse(read(GATES));
  assert((gates.gates || []).some((g) => g.id === 'classics-audiobooks' && g.required === true), 'gates.json must require the classics-audiobooks gate');
  const pkg = JSON.parse(read(PACKAGE));
  assert(pkg.scripts['check:audiobooks'] === 'node scripts/check-classics-audiobooks.cjs', 'package.json must expose check:audiobooks');
  assert(String(pkg.scripts.test).includes('check-classics-audiobooks.cjs'), 'npm test must run the classics gate');
});

(async () => {
  for (const { name, fn } of queue) {
    try {
      await fn();
      console.log(`[ok] ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
    }
  }
  if (failures > 0) {
    console.error(`\nClassics checks failed: ${failures}`);
    process.exit(1);
  }
  console.log('\nClassics audiobook checks passed.');
})();
