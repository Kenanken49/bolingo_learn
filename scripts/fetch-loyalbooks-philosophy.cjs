#!/usr/bin/env node
/**
 * Seed the premium Philosophy classics library from LoyalBooks.
 *
 * LoyalBooks mirrors public-domain works: LibriVox narration (hosted on
 * archive.org) plus Project Gutenberg / LoyalBooks-hosted ebook text. Both
 * sources are public domain in the US, which is why this catalog can ship
 * inside the app — unlike learner uploads, which need the content-rights
 * checklist (docs/content-rights.md).
 *
 * What it does:
 *   1. Scrapes every Philosophy listing page (?type=all&results=100&page=N).
 *   2. Visits each /book/<slug> page for the audio + ebook links.
 *   3. Writes assets/audiobooks/philosophy-catalog.json (metadata only).
 *   4. Downloads every available .txt ebook into assets/audiobooks/texts/.
 *   5. Resolves archive.org chapter lists for the shortest complete works and
 *      downloads a small bundled-audio starter shelf.
 *
 * Usage:
 *   node scripts/fetch-loyalbooks-philosophy.cjs            # everything
 *   node scripts/fetch-loyalbooks-philosophy.cjs --catalog-only
 *   node scripts/fetch-loyalbooks-philosophy.cjs --max-books 20   # smoke test
 *
 * Be polite: concurrency is capped and requests carry a real UA. Re-runs
 * skip files that already exist on disk.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'audiobooks');
const TEXT_DIR = path.join(OUT_DIR, 'texts');
const AUDIO_DIR = path.join(OUT_DIR, 'audio');
const CATALOG = path.join(OUT_DIR, 'philosophy-catalog.json');
const SEED_TS = path.join(OUT_DIR, 'seed.ts');

const BASE = 'https://www.loyalbooks.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BolingoLearn-classics-seed/1.0';
/** Bundled-audio budget: the starter shelf must stay small enough for stores. */
const STARTER_AUDIO_BUDGET = 16 * 1024 * 1024;
/** Per-book bundled-audio cap so one giant work cannot eat the shelf. */
const STARTER_AUDIO_PER_BOOK = 12 * 1024 * 1024;
/** Bundled-text budget: everything else downloads on demand. */
const STARTER_TEXT_BUDGET = 8 * 1024 * 1024;

const args = new Set(process.argv.slice(2));
const CATALOG_ONLY = args.has('--catalog-only');
const maxBooksArg = process.argv.find((a) => a.startsWith('--max-books'));
const MAX_BOOKS = maxBooksArg ? Number(maxBooksArg.split('=')[1]) || 0 : 0;

async function fetchText(url, { timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchBytes(url, { timeoutMs = 120000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

function abs(href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) {
    return href.replace('http://', 'https://').replace('https://www.archive.org/', 'https://archive.org/');
  }
  if (href.startsWith('/')) return BASE + href;
  return null;
}

// Curated out of the Philosophy Classics shelf: a Kids fairy-tale misfit
// whose card never sat right in the philosophy sections. Kept here (not
// deleted) so re-scrapes never silently re-add it.
const EXCLUDED_SLUGS = new Set(['Deer-Godchild']);

function parseListing(html) {
  const books = [];
  const cells = html.match(/<td class="layout2-blue"[^>]*>[\s\S]*?<\/td>/g) || [];
  for (const cell of cells) {
    const slugM = cell.match(/<a href="\/book\/([^"]+)">/);
    const titleM = cell.match(/<b>([^<]+)<\/b>/);
    const authorM = cell.match(/<\/b><\/a><br>\s*([^<]+)/);
    const coverM = cell.match(/<img class="layout" src="([^"]+)"[^>]*alt="([^"]*)"/);
    if (!slugM || !titleM) continue;
    if (EXCLUDED_SLUGS.has(slugM[1])) continue;
    books.push({
      slug: slugM[1],
      title: titleM[1].trim(),
      author: (authorM ? authorM[1] : '').trim(),
      url: `${BASE}/book/${slugM[1]}`,
      cover: coverM ? abs(coverM[1]) : null,
    });
  }
  return books;
}

function parseBookPage(html) {
  const zipM = html.match(/href="(https?:\/\/[^"]*archive\.org\/download\/([^"/]+)\/[^"]*_64kb_mp3\.zip)"/i);
  const m4bM = html.match(/href="([^"]+\.m4b)"/i);
  const txtM = html.match(/href="(\/download\/text\/[^"]+\.txt)"/i);
  const epubM = html.match(/href="(\/download\/epub\/[^"]+\.epub)"/i);
  const gutenM = html.match(/href="([^"]*gutenberg\.org[^"]*)"/i);
  // LoyalBooks' own taxonomy: the "Genres for this book" table on every
  // book page. Stored in page order — the first genre is the primary shelf.
  const genres = [];
  const genreTableM = html.match(/<table class="link" summary="Genres for this book">([\s\S]*?)<\/table>/i);
  if (genreTableM) {
    const re = /<a href="\/genre\/([^"]+)">\s*([^<]+)</gi;
    let m;
    while ((m = re.exec(genreTableM[1])) !== null) {
      const name = m[2].trim();
      if (name && !genres.includes(name)) genres.push(name);
    }
  }
  return {
    genres,
    archiveId: zipM ? zipM[2] : null,
    audioZip: zipM ? abs(zipM[1]) : null,
    audioM4b: m4bM ? abs(m4bM[1]) : null,
    textUrl: txtM ? abs(txtM[1]) : null,
    epubUrl: epubM ? abs(epubM[1]) : null,
    gutenbergUrl: gutenM ? abs(gutenM[1]) : null,
  };
}

/** Simple worker pool with a small delay between launches (be polite). */
async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      await new Promise((r) => setTimeout(r, 120));
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        results[i] = { __error: String(e && e.message ? e.message : e) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TEXT_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  // --- 1. listing pages -------------------------------------------------
  const seen = new Map();
  for (let page = 1; page <= 20; page += 1) {
    const url = `${BASE}/genre/Philosophy?type=all&results=100${page > 1 ? `&page=${page}` : ''}`;
    console.log(`listing page ${page}: ${url}`);
    const html = await fetchText(url);
    const books = parseListing(html);
    console.log(`  -> ${books.length} books`);
    if (books.length === 0) break;
    for (const b of books) if (!seen.has(b.slug)) seen.set(b.slug, b);
    if (books.length < 100) break;
    const totalM = html.match(/Page \d+ of (\d+)/);
    if (totalM && page >= Number(totalM[1])) break;
  }
  let catalog = [...seen.values()];
  if (MAX_BOOKS > 0) catalog = catalog.slice(0, MAX_BOOKS);
  console.log(`catalog: ${catalog.length} unique books`);

  // --- 2. book pages ----------------------------------------------------
  const details = await pool(catalog, 4, async (book) => {
    const html = await fetchText(book.url);
    return parseBookPage(html);
  });
  catalog = catalog.map((book, i) => {
    const d = details[i] || {};
    if (d.__error) return { ...book, error: d.__error };
    return { ...book, ...d };
  });
  const withAudio = catalog.filter((b) => b.archiveId).length;
  const withText = catalog.filter((b) => b.textUrl).length;
  console.log(`audio: ${withAudio}, text: ${withText}`);

  const payload = {
    version: 1,
    source: `${BASE}/genre/Philosophy?type=all`,
    fetchedAt: new Date().toISOString(),
    rights: 'Public domain (US): LibriVox narration via archive.org, ebook text via Project Gutenberg / LoyalBooks. See docs/classics-audiobooks.md.',
    books: catalog,
  };
  fs.writeFileSync(CATALOG, `${JSON.stringify(payload, null, 1)}\n`);
  console.log(`wrote ${path.relative(ROOT, CATALOG)}`);
  if (CATALOG_ONLY) return;

  // --- 3. ebook texts (popular first, budget-capped) --------------------
  let textBytes = 0;
  let textCount = 0;
  for (const book of catalog) {
    if (!book.textUrl) continue;
    const dest = path.join(TEXT_DIR, `${book.slug}.txt`);
    if (fs.existsSync(dest)) {
      const st = fs.statSync(dest);
      book.bundledText = `./texts/${book.slug}.txt`;
      textBytes += st.size;
      textCount += 1;
      continue;
    }
    if (textBytes >= STARTER_TEXT_BUDGET) continue;
    try {
      const buf = await fetchBytes(book.textUrl);
      fs.writeFileSync(dest, buf);
      book.bundledText = `./texts/${book.slug}.txt`;
      textBytes += buf.length;
      textCount += 1;
      if (textCount % 25 === 0) console.log(`  texts: ${textCount} (${(textBytes / 1048576).toFixed(1)} MB)`);
    } catch (e) {
      console.warn(`  text failed ${book.slug}: ${e.message}`);
    }
  }
  console.log(`texts bundled: ${textCount} (${(textBytes / 1048576).toFixed(1)} MB)`);
  fs.writeFileSync(CATALOG, `${JSON.stringify(payload, null, 1)}\n`);

  // --- 4. starter audio shelf: shortest complete works ------------------
  const candidates = catalog.filter((b) => b.archiveId && !b.error);
  const metas = await pool(candidates, 4, async (book) => {
    try {
      const meta = JSON.parse(await fetchText(`https://archive.org/metadata/${book.archiveId}`));
      // LibriVox chapter encodes are the *_64kb.mp3 files (plain .mp3 is the
      // same audio at a higher bitrate; skip it to keep the shelf small).
      const mp3s = (meta.files || [])
        .filter((f) => /_64kb\.mp3$/i.test(f.name || ''))
        .map((f) => ({ name: f.name, size: Number(f.size || 0), title: f.title || f.name }));
      if (mp3s.length === 0) return null;
      const total = mp3s.reduce((n, f) => n + f.size, 0);
      return { book, mp3s, total };
    } catch (e) {
      console.warn(`  meta failed ${book.slug}: ${e.message}`);
      return null;
    }
  });
  const viable = metas
    .filter((m) => m && m.total > 0 && m.total <= STARTER_AUDIO_PER_BOOK)
    .sort((a, b) => a.total - b.total);
  console.log(`starter candidates: ${viable.length}`);
  let audioBytes = 0;
  const shelf = [];
  for (const v of viable) {
    if (audioBytes + v.total > STARTER_AUDIO_BUDGET) continue;
    const dir = path.join(AUDIO_DIR, v.book.slug);
    fs.mkdirSync(dir, { recursive: true });
    const chapters = [];
    let ok = true;
    // Shortest chapters first so a partial shelf still plays from the start.
    const ordered = [...v.mp3s].sort((a, b) => a.size - b.size);
    for (let i = 0; i < ordered.length; i += 1) {
      const f = ordered[i];
      const dest = path.join(dir, `${String(i).padStart(2, '0')}.mp3`);
      if (!fs.existsSync(dest)) {
        try {
          const buf = await fetchBytes(`https://archive.org/download/${v.book.archiveId}/${encodeURIComponent(f.name)}`);
          fs.writeFileSync(dest, buf);
        } catch (e) {
          console.warn(`  audio failed ${v.book.slug}/${f.name}: ${e.message}`);
          ok = false;
          break;
        }
      }
      chapters.push({ file: `./audio/${v.book.slug}/${String(i).padStart(2, '0')}.mp3`, title: f.title, bytes: f.size });
    }
    if (!ok || chapters.length === 0) continue;
    v.book.bundledAudio = chapters.map((c) => c.file);
    audioBytes += v.total;
    shelf.push(v.book.slug);
    console.log(`  shelf: ${v.book.slug} (${(v.total / 1048576).toFixed(1)} MB, ${chapters.length} parts)`);
    if (shelf.length >= 4) break;
  }
  console.log(`audio shelf: ${shelf.length} books (${(audioBytes / 1048576).toFixed(1)} MB)`);
  fs.writeFileSync(CATALOG, `${JSON.stringify(payload, null, 1)}\n`);

  // --- 5. static seed manifest (Metro needs literal requires) -----------
  const lines = [
    '// AUTO-GENERATED by scripts/fetch-loyalbooks-philosophy.cjs — do not edit.',
    '// Maps bundled offline files to Metro requires (dynamic require() is banned).',
    '',
  ];
  const textEntries = catalog.filter((b) => b.bundledText).map((b) => `  '${b.slug}': require('${b.bundledText}'),`);
  lines.push('export const BUNDLED_TEXTS: Record<string, number> = {');
  lines.push(...textEntries, '};', '');
  lines.push('export const BUNDLED_AUDIO: Record<string, number[]> = {');
  for (const b of catalog.filter((x) => x.bundledAudio)) {
    lines.push(`  '${b.slug}': [`);
    for (const f of b.bundledAudio) lines.push(`    require('${f}'),`);
    lines.push('  ],');
  }
  lines.push('};', '');
  fs.writeFileSync(SEED_TS, `${lines.join('\n')}\n`);
  console.log(`wrote ${path.relative(ROOT, SEED_TS)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
