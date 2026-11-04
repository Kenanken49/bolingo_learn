#!/usr/bin/env node
/**
 * Extend the premium Philosophy classics library with archive.org audiobooks.
 *
 * archive.org hosts thousands of LibriVox recordings; this importer adds only
 * the most-downloaded English philosophy recordings that are NOT already in
 * the LoyalBooks-seeded catalog, one curated batch at a time:
 *
 *   1. Queries collection:librivoxaudio + subject:philosophy, top 200 by downloads.
 *   2. Drops everything already shelved (by archiveId) and curates out junk:
 *      single-poem recordings, omnibus collections, mistagged pulp, non-English.
 *   3. Verifies each candidate has _64kb.mp3 chapters, real title/creator,
 *      a usable cover (archive.org services/img) and an optional Gutenberg link.
 *   4. Appends up to MAX_NEW entries to philosophy-catalog.json with
 *      source 'archive.org' (stream + 1/day download, like everything else —
 *      nothing is bundled; full audio stays on demand).
 *
 * Usage:
 *   node scripts/fetch-archiveorg-philosophy.cjs            # up to 40 new
 *   node scripts/fetch-archiveorg-philosophy.cjs --max-new 10
 *   node scripts/fetch-archiveorg-philosophy.cjs --dry-run   # list only
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'assets', 'audiobooks', 'philosophy-catalog.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BolingoLearn-classics-seed/1.0';
const MAX_NEW = Number((process.argv.find((a) => a.startsWith('--max-new')) || '').split('=')[1]) || 40;
const DRY_RUN = process.argv.includes('--dry-run');

/** Identifiers that are mistagged, omnibus, or otherwise not shelf material. */
const SKIP_IDS = new Set([
  'thuviamaidofmars_1308_librivox', // pulp sci-fi mistagged philosophy
  'nonfiction001_librivox', // omnibus sampler, not a book
]);

/** archive.org subject keyword -> LoyalBooks taxonomy genre. */
const SUBJECT_GENRES = [
  [/philosoph/, 'Philosophy'],
  [/theolog|bible|buddh|christian|jesus|god\b|atheis|apolog/i, 'Religion'],
  [/psycholog|mind\b|brain/i, 'Psychology'],
  [/politic|democracy|government|libert/i, 'Politics'],
  [/econom/i, 'Economics/Political Economy'],
  [/science|physics|biolog|astronom/i, 'Science'],
  [/histor/i, 'History'],
  [/fiction|novel|crime|punishment/i, 'Fiction'],
  [/literature|classic/i, 'Literature'],
  [/poet|paradise|faerie/i, 'Poetry'],
  [/essay|meditation|aphoris|pensees/i, 'Essay/Short nonfiction'],
  [/biograph|autobiograph/i, 'Biography'],
  [/memoir/i, 'Memoirs'],
  [/drama|tragedy/i, 'Tragedy'],
  [/comed/i, 'Comedy'],
  [/play\b/i, 'Play'],
  [/satire|candide/i, 'Satire'],
  [/humor|humour|wit\b/i, 'Humor'],
  [/adventure|odyssey/i, 'Adventure'],
  [/animal|aesop|fable/i, 'Animals'],
  [/travel|voyage/i, 'Travel'],
  [/myth|legend|fairy|folk/i, 'Myths/Legends'],
  [/nature|wild/i, 'Nature'],
  [/art\b|aesthet/i, 'Art'],
  [/music/i, 'Music'],
  [/child|kids|youth/i, 'Kids'],
  [/roman|love\b/i, 'Romance'],
  [/epic|antiqu|greek|roman\b|stoic|plato|aristotle/i, 'Classics (antiquity)'],
  [/war\b|peace\b/i, 'War stories'],
  [/fantasy|utopia/i, 'Fantasy'],
  [/conduct|ethic|moral|virtue|stoic/i, 'Advice'],
  [/self|mindfulness|calm|meditat/i, 'Instruction'],
];

function genresFor(title, subjects) {
  const hay = `${title} ${(subjects || []).join(' ')}`;
  const out = [];
  for (const [re, genre] of SUBJECT_GENRES) {
    if (re.test(hay) && !out.includes(genre)) out.push(genre);
  }
  if (!out.includes('Philosophy')) out.unshift('Philosophy');
  return out.slice(0, 6);
}

function cleanAuthor(creator) {
  const raw = Array.isArray(creator) ? creator[0] : creator;
  if (!raw) return 'Unknown';
  // "Friedrich Nietzsche (transl. Helen Zimmern)" -> "Friedrich Nietzsche"
  // "Epictetus, tr. Elizabeth Carter" -> "Epictetus"
  return String(raw)
    .split('(')[0]
    .replace(/,\s*(tr|transl)\..*$/i, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Unknown';
}

function cleanTitle(title) {
  const raw = Array.isArray(title) ? title[0] : title;
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function gutenbergFrom(description) {
  const m = String(description || '').match(/https?:\/\/www\.gutenberg\.org\/(?:ebooks\/\d+|[^"' <]*)/i);
  return m ? m[0].replace(/[).,;]+$/, '') : null;
}

async function fetchJson(url, { timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function headIsImage(url, { timeoutMs = 20000 } = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
      return res.ok && (res.headers.get('content-type') || '').startsWith('image/');
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const haveIds = new Set(catalog.books.map((b) => b.archiveId).filter(Boolean));
  const haveSlugs = new Set(catalog.books.map((b) => b.slug));

  const search = await fetchJson(
    'https://archive.org/advancedsearch.php?q=' +
      encodeURIComponent('collection:librivoxaudio AND subject:philosophy') +
      '&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=downloads&rows=200&page=1&output=json&sort[]=downloads+desc'
  );
  const docs = (search.response && search.response.docs) || [];
  const candidates = docs
    .filter((d) => d.identifier && !haveIds.has(d.identifier) && !SKIP_IDS.has(d.identifier))
    .filter((d) => !/\.poem_/i.test(d.identifier)) // single-poem recordings
    .slice(0, MAX_NEW + 20); // headroom: verification may drop some

  console.log(`archive.org: ${docs.length} top philosophy recordings, ${candidates.length} new candidates after dedupe.`);

  const added = [];
  const skipped = [];
  // Small concurrency: metadata calls are cheap, stay polite.
  const queue = [...candidates];
  async function worker() {
    while (queue.length > 0 && added.length < MAX_NEW) {
      const doc = queue.shift();
      try {
        const meta = await fetchJson(`https://archive.org/metadata/${doc.identifier}`);
        const md = meta.metadata || {};
        const lang = Array.isArray(md.language) ? md.language[0] : md.language;
        if (lang && !/^eng/i.test(String(lang))) {
          skipped.push(`${doc.identifier} (non-English: ${lang})`);
          continue;
        }
        const parts = (meta.files || []).filter((f) => /_64kb\.mp3$/i.test(f.name || ''));
        if (parts.length === 0) {
          skipped.push(`${doc.identifier} (no mp3 chapters)`);
          continue;
        }
        const title = cleanTitle(md.title || doc.title);
        if (!title) {
          skipped.push(`${doc.identifier} (no title)`);
          continue;
        }
        const subjects = Array.isArray(md.subject) ? md.subject.map(String) : md.subject ? [String(md.subject)] : [];
        const coverUrl = `https://archive.org/services/img/${doc.identifier}`;
        const cover = (await headIsImage(coverUrl)) ? coverUrl : null;
        added.push({
          slug: doc.identifier,
          title,
          author: cleanAuthor(md.creator || doc.creator),
          url: `https://archive.org/details/${doc.identifier}`,
          cover,
          genres: genresFor(title, subjects),
          archiveId: doc.identifier,
          audioZip: `https://archive.org/download/${doc.identifier}/${doc.identifier}_64kb_mp3.zip`,
          audioM4b: null,
          textUrl: null,
          epubUrl: null,
          gutenbergUrl: gutenbergFrom(md.description),
          source: 'archive.org',
        });
        console.log(`  + ${title} — ${cleanAuthor(md.creator || doc.creator)} (${parts.length} parts)`);
      } catch (e) {
        skipped.push(`${doc.identifier} (${String(e.message || e).slice(0, 80)})`);
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  // Same work recorded twice (e.g. two Apologies): keep the most-downloaded.
  // Titles differ ("Apology" vs "The Apology of Socrates"), so containment wins.
  const normTitle = (t) => t.toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, '');
  const normAuthor = (a) => a.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const seen = [];
  const deduped = added.filter((b) => {
    const key = `${normTitle(b.title)}|${normAuthor(b.author)}`;
    const dupe = seen.some(
      (s) => s.author === key.split('|')[1] && (s.title.includes(key.split('|')[0]) || key.split('|')[0].includes(s.title))
    );
    if (dupe) return false;
    seen.push({ title: key.split('|')[0], author: key.split('|')[1] });
    return true;
  });
  const dupes = added.length - deduped.length;
  if (dupes > 0) console.log(`Dropped ${dupes} duplicate recording(s) of an already-shelved work.`);
  const fresh = deduped.filter((b) => !haveSlugs.has(b.slug));
  console.log(`\nVerified ${fresh.length} new books ready to shelve. Skipped: ${skipped.length}`);
  for (const s of skipped.slice(0, 15)) console.log(`  - ${s}`);
  if (DRY_RUN || fresh.length === 0) return;

  catalog.books.push(...fresh);
  catalog.fetchedAt = new Date().toISOString();
  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Catalog now holds ${catalog.books.length} books.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
