#!/usr/bin/env node
/**
 * Grow the premium classics shelf beyond Philosophy: crawl more public-domain
 * clusters, including a "Bestsellers of their day" shelf.
 *
 * Why LoyalBooks again: it mirrors public-domain works only — LibriVox
 * narration hosted on archive.org, plus Project Gutenberg / LoyalBooks ebook
 * text. If a title is in their catalog it carries no US copyright restriction,
 * which is what lets this app ship the catalog in the bundle and stream the
 * audio at all. In-copyright current bestsellers (an Atomic Habits, a Sapiens,
 * a Colleen Hoover) are deliberately NOT crawled: their recordings belong to a
 * publisher and a paid licence, not to us. What we can ship legally is the set
 * of books that *were* the enormous sellers of their day and have since fallen
 * into the public domain — Gatsby, Mrs Dalloway, The Sun Also Rises, Dickens,
 * Conan Doyle, Verne — so `bestsellers` is a curated title list resolved
 * against LoyalBooks' own index, and only titles they actually host are kept.
 *
 * How it works:
 *   1. Build a title index from the genre listing pages and /Top_100
 *      (?type=all&results=100&page=N). Cheap: one request per 100 books.
 *   2. Pick each cluster's books out of that index — a genre shelf takes its
 *      own listing, the curated shelf matches its title list.
 *   3. Visit only the selected /book/<slug> pages for audio + ebook links and
 *      LoyalBooks' own genre taxonomy.
 *   4. Write assets/audiobooks/<cluster>-catalog.json — metadata only. Nothing
 *      is downloaded here; audio and text still download on the device.
 *
 * A slug already present in another catalog is skipped, so each book lives on
 * exactly one shelf (the bestsellers cluster is picked first).
 *
 * Usage:
 *   node scripts/fetch-classics-clusters.cjs
 *   node scripts/fetch-classics-clusters.cjs --cluster=bestsellers
 *   node scripts/fetch-classics-clusters.cjs --max-books=10 --dry-run   # smoke run
 *   node scripts/fetch-classics-clusters.cjs --pages=4 --concurrency=5
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'audiobooks');
const BASE = 'https://www.loyalbooks.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BolingoLearn-classics-seed/1.0';

/**
 * Books that topped the charts in their year and are now public domain. This is
 * a search plan, not a claim: a title only joins the shelf when LoyalBooks
 * lists it, and the log prints every title we could not match.
 */
const BESTSELLERS = [
  'The Great Gatsby',
  'Tender Is the Night',
  'This Side of Paradise',
  'The Sun Also Rises',
  'A Farewell to Arms',
  'Mrs Dalloway',
  'To the Lighthouse',
  'The Waves',
  'Ulysses',
  'A Portrait of the Artist as a Young Man',
  'Dubliners',
  'The Magnificent Ambersons',
  'Main Street',
  'Babbitt',
  'Green Grow the Lilacs',
  'Winesburg, Ohio',
  'The Call of the Wild',
  'White Fang',
  'The Sea Wolf',
  'Martin Eden',
  'Treasure Island',
  'Kidnapped',
  'Dracula',
  'The Strange Case of Dr Jekyll and Mr Hyde',
  'Frankenstein',
  'The Time Machine',
  'The War of the Worlds',
  'The Invisible Man',
  'Twenty Thousand Leagues Under the Sea',
  'Around the World in Eighty Days',
  'A Tale of Two Cities',
  'Great Expectations',
  'Oliver Twist',
  'Nicholas Nickleby',
  'Bleak House',
  'David Copperfield',
  'The Count of Monte Cristo',
  'The Three Musketeers',
  'Twenty Years After',
  'Rebecca of Sunnybrook Farm',
  'Little Women',
  'Good Wives',
  "Jo's Boys",
  'Anne of Green Gables',
  'Anne of Avonlea',
  'The Secret Garden',
  'Ben-Hur',
  'Quo Vadis',
  "Uncle Tom's Cabin",
  'The Jungle Book',
  'The Second Jungle Book',
  'Kim',
  'Captains Courageous',
  'The Prisoner of Zenda',
  'Lorna Doone',
  'The Shepherd of the Hills',
  'When Knighthood Was in Flower',
  'The House of Mirth',
  'Ethan Frome',
  'The Age of Innocence',
  'Meditations',
  'The Art of War',
  'As a Man Thinketh',
  'The Prophet',
  'Self-Reliance',
  'Walden',
  'The Souls of Black Folk',
  'Up from Slavery',
  'The Autobiography of Benjamin Franklin',
  "Poor Richard's Almanack",
  'The Science of Getting Rich',
  'The Memoirs of Sherlock Holmes',
  'The Hound of the Baskervilles',
  'A Study in Scarlet',
  'The Return of Sherlock Holmes',
  'The Adventures of Sherlock Holmes',
  'The Murders in the Rue Morgue',
  'The Raven and Other Poems',
  "Alice's Adventures in Wonderland",
  'Through the Looking-Glass',
  'The Adventures of Tom Sawyer',
  'Adventures of Huckleberry Finn',
  'A Princess of Mars',
  'Peter Pan',
  'The Wind in the Willows',
  'The Wonderful Wizard of Oz',
  'St. Elmo',
  'In His Steps',
  'The Eternal City',
  "King Solomon's Mines",
  'She',
  'Vanity Fair',
  'Little Dorrit',
  'The Master of Ballantrae',
  'The Island of Doctor Moreau',
  'Anne of the Island',
  'Pollyanna',
  'Tarzan of the Apes',
  'The Red Badge of Courage',
  'Siddhartha',
  'Moby Dick',
  'The Picture of Dorian Gray',
  'Sense and Sensibility',
  'Pride and Prejudice',
  'Wuthering Heights',
  'Jane Eyre',
  'Northanger Abbey',
  'Persuasion',
  'Emma',
  'Middlemarch',
  'Silas Marner',
  'The Scarlet Letter',
  'Leaves of Grass',
  'The Whole Works of William Shakespeare',
  'Romeo and Juliet',
  'Hamlet',
  'A Midsummer Night’s Dream',
  'The Odyssey',
  'The Iliad',
  'Gulliver’s Travels',
  'Robinson Crusoe',
  'Don Quixote',
  'Grimms’ Fairy Tales',
];

/**
 * Shelves to add. `genre` takes its own LoyalBooks listing; `curated` matches
 * the BESTSELLERS title list against the index. `maxBooks` caps the shelf so a
 * single crawl cannot grow the bundle unbounded. `indexPages` is how deep we
 * read that genre's listing (100 books per page).
 */
const CLUSTERS = [
  {
    id: 'bestsellers',
    label: 'Bestsellers of their day',
    curated: true,
    probe: true,
    maxBooks: 140,
  },
  { id: 'fiction', label: 'Fiction & Literature', genre: 'Fiction', maxBooks: 260, indexPages: 3 },
  { id: 'adventure', label: 'Adventure & Sea Stories', genre: 'Adventure', maxBooks: 200, indexPages: 2 },
  { id: 'mystery', label: 'Mystery & Detective', genre: 'Mystery', maxBooks: 200, indexPages: 2 },
  { id: 'science_fiction', label: 'Science Fiction & Fantasy', genre: 'Science_fiction', maxBooks: 180, indexPages: 2 },
  { id: 'poetry', label: 'Poetry & Plays', genre: 'Poetry', maxBooks: 180, indexPages: 2 },
  { id: 'history', label: 'History & Biography', genre: 'History', maxBooks: 200, indexPages: 2 },
];

/** Genres read into the index so the curated shelf can be matched locally. */
const INDEX_GENRES = [
  'Fiction',
  'Literature',
  'Adventure',
  'Mystery',
  'Science_fiction',
  'Fantasy',
  'Poetry',
  'History',
  'Religion',
  'Romance',
  'Historical_Fiction',
  'Short_stories',
  'Humor',
  'Comedy',
  'Children',
  'Teen_Young_adult',
  'Philosophy',
  'Non-fiction',
];

// Curated out of the Philosophy shelf long ago: a Kids fairy-tale misfit. Kept
// as a guard so re-scrapes never silently re-add it to a new shelf.
const EXCLUDED_SLUGS = new Set(['Deer-Godchild']);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
function argValue(name) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : null;
}
const ONLY = argValue('cluster');
const MAX_BOOKS = Number(argValue('max-books') || 0);
const PAGES_OVERRIDE = Number(argValue('pages') || 0);
const CONCURRENCY = Number(argValue('concurrency') || 4);

function log(line) {
  console.log(line);
}

/**
 * Slugs already catalogued anywhere in assets/audiobooks, so each book lives
 * on one shelf. When a single cluster is re-crawled its own file is left out of
 * the set: a rerun refreshes that shelf instead of emptying it.
 */
function takenSlugs(selfFile) {
  const taken = new Set();
  if (!fs.existsSync(OUT_DIR)) return taken;
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (!file.endsWith('-catalog.json')) continue;
    if (selfFile && file === selfFile) continue;
    try {
      const payload = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), 'utf8'));
      for (const book of payload.books || []) taken.add(book.slug);
    } catch {
      /* a broken file is skipped here; the classics gate reports it */
    }
  }
  return taken;
}

async function fetchText(url, { timeoutMs = 40000, tries = 3 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (e) {
      if (attempt === tries) throw e;
      await new Promise((r) => setTimeout(r, 900 * attempt));
    } finally {
      clearTimeout(t);
    }
  }
  return '';
}

function abs(href) {
  if (!href) return null;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `${BASE}${href}`;
  // The archives answer on https everywhere, but LoyalBooks markup still hands
  // out http links. Upgrading them keeps the catalogs https-only, so the app
  // never needs a cleartext exception on Android.
  return href.replace(/^http:\/\//, 'https://');
}

function decodeEntities(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** The /book/ cells of a listing, genre page or Top_100 alike. */
function parseListing(html) {
  const books = [];
  const cells = html.match(/<td class="layout2-blue"[^>]*>[\s\S]*?<\/td>/g) || [];
  for (const cell of cells) {
    const slugM = cell.match(/<a href="\/book\/([^"]+)">/);
    const titleM = cell.match(/<b>([^<]+)<\/b>/);
    const authorM = cell.match(/<\/b><\/a><br>\s*([^<]+)/);
    const coverM = cell.match(/<img class="layout" src="([^"]+)"[^>]*alt="([^"]*)"/);
    if (!slugM || !titleM) continue;
    const slug = slugM[1];
    if (EXCLUDED_SLUGS.has(slug)) continue;
    books.push({
      slug,
      title: decodeEntities(titleM[1]),
      author: decodeEntities(authorM ? authorM[1] : ''),
      url: `${BASE}/book/${slug}`,
      cover: coverM ? abs(coverM[1]) : null,
    });
  }
  return books;
}

/** Audio + ebook links and LoyalBooks' own taxonomy from one book page. */
function parseBookPage(html) {
  const zipM = html.match(/href="(https?:\/\/[^"]*archive\.org\/download\/([^"/]+)\/[^"]*_64kb_mp3\.zip)"/i);
  const m4bM = html.match(/href="([^"]+\.m4b)"/i);
  const txtM = html.match(/href="(\/download\/text\/[^"]+\.txt)"/i);
  const epubM = html.match(/href="(\/download\/epub\/[^"]+\.epub)"/i);
  const gutenM = html.match(/href="([^"]*gutenberg\.org[^"]*)"/i);
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

/** Worker pool with a stagger between launches, so the crawl stays polite. */
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
        results[i] = { __error: String((e && e.message) || e) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

async function listGenre(genre, pages) {
  const seen = new Map();
  for (let page = 1; page <= pages; page += 1) {
    const url = `${BASE}/genre/${genre}?type=all&results=100${page > 1 ? `&page=${page}` : ''}`;
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      log(`  ${genre} page ${page} failed: ${e.message}`);
      break;
    }
    const books = parseListing(html);
    log(`  index ${genre} page ${page}: ${books.length} books`);
    if (books === 0) break;
    for (const b of books) if (!seen.has(b.slug)) seen.set(b.slug, b);
    if (books.length < 100) break;
    const totalM = html.match(/Page \d+ of (\d+)/);
    if (totalM && page >= Number(totalM[1])) break;
  }
  return [...seen.values()];
}

async function listTop100() {
  try {
    const books = parseListing(await fetchText(`${BASE}/Top_100`));
    log(`  index Top_100: ${books.length} books`);
    return books;
  } catch (e) {
    log(`  Top_100 failed: ${e.message}`);
    return [];
  }
}

function normTitle(s) {
  return String(s)
    .toLowerCase()
    .replace(/['`’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(the|a|an) /, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the index entry for a curated title. LoyalBooks titles carry suffixes
 * ("| Volume 1", "(Classic Reprint)", " and other poems"), so exact match
 * first, then prefix, then containment — and among containment hits the
 * shortest title wins, which is almost always the main work.
 */
/** Compare two author credits generously: "Arthur Conan Doyle" == "Sir Arthur Conan Doyle". */
function sameAuthor(a, b) {
  const clean = (v) =>
    String(v)
      .toLowerCase()
      .replace(/(sir|lady|dame|dr|rev|prof|mr|mrs) /g, ' ')
      .replace(/[^a-z ]/g, ' ')
      .split(' ')
      .filter((t) => t.length > 1);
  const x = clean(a);
  const y = clean(b);
  if (!x.length || !y.length) return false;
  if (x[x.length - 1] !== y[y.length - 1]) return false;
  const shared = x.filter((t) => y.includes(t)).length;
  return shared >= Math.min(2, Math.min(x.length, y.length));
}

/**
 * Find the LoyalBooks index entry for one curated title.
 *
 * Title similarity alone is not enough: matching on a shared prefix put Lord
 * Byron's poem "The Island" on the bestsellers shelf for "The Island of Doctor
 * Moreau", and a one-syllable children's retelling for Defoe's "Robinson
 * Crusoe". A curated entry therefore only matches an index book credited to one
 * of its authors, which still lets subtitle variants ("Frankenstein; or, The
 * Modern Prometheus") through while a different book cannot ride in.
 */
function matchCurated(want, index) {
  const w = normTitle(want);
  if (w.length < 4) return null;
  const wanted = CURATED_AUTHORS[want] || [];
  if (!wanted.length) return null; // never guess a bestseller without an author to check
  const by = (b) => wanted.some((a) => sameAuthor(b.author, a));
  const exact = index.find((b) => normTitle(b.title) === w && by(b));
  if (exact) return exact;
  const variants = index
    .filter((b) => (normTitle(b.title).startsWith(w + ' ') || w.startsWith(normTitle(b.title))) && by(b))
    .sort((a, b) => Math.abs(normTitle(a.title).length - w.length) - Math.abs(normTitle(b.title).length - w.length));
  return variants.length ? variants[0] : null;
}

/** True when a (title, author) pair is one of the curated public-domain bestsellers. */
function curatedMatch(title, author) {
  for (const want of BESTSELLERS) {
    if (!sameTitle(title, want)) continue;
    const b = normTitle(title);
    const w = normTitle(want);
    const related = b === w || b.startsWith(w + ' ') || w.startsWith(b + ' ');
    if (related && (CURATED_AUTHORS[want] || []).some((a) => sameAuthor(author, a))) return want;
  }
  return null;
}

/**
 * Authors for curated titles that the genre listings did not surface. LoyalBooks
 * has no working search (its /search endpoint ignores the query), but every
 * book page lives at a deterministic slug, so a title we know the author of can
 * be looked up directly. This is a lookup plan only: the page must answer 200
 * and carry the same title, or the book is not added.
 */
const CURATED_AUTHORS = {
  'Poor Richard\'s Almanack': ['Benjamin Franklin'],
  'The Island of Doctor Moreau': ['Herbert George Wells', 'H. G. Wells'],
  'Pollyanna': ['Eleanor H. Porter', 'Eleanor Hodgman Porter'],
  'A Farewell to Arms': ['Ernest Hemingway'],
  'A Little Princess': ['Frances Hodgson Burnett'],
  'A Midsummer Night\'s Dream': ['William Shakespeare'],
  'A Midsummer Night\u2019s Dream': ['William Shakespeare'],
  'A Portrait of the Artist as a Young Man': ['James Joyce'],
  'A Princess of Mars': ['Edgar Rice Burroughs'],
  'A Study in Scarlet': ['Arthur Conan Doyle'],
  'A Tale of Two Cities': ['Charles Dickens'],
  'Adventures of Huckleberry Finn': ['Mark Twain'],
  'Alice\'s Adventures in Wonderland': ['Lewis Carroll'],
  'Anne of Avonlea': ['L. M. Montgomery', 'Lucy Maud Montgomery'],
  'Anne of Green Gables': ['Lucy Maud Montgomery', 'L. M. Montgomery'],
  'Anne of the Island': ['Lucy Maud Montgomery', 'L. M. Montgomery'],
  'Around the World in 80 Days': ['Jules Verne'],
  'Around the World in Eighty Days': ['Jules Verne'],
  'As a Man Thinketh': ['James Allen'],
  'Babbitt': ['Sinclair Lewis'],
  'Ben Hur': ['Lew Wallace'],
  'Ben-Hur': ['Lew Wallace'],
  'Bleak House': ['Charles Dickens'],
  'Captains Courageous': ['Rudyard Kipling'],
  'David Copperfield': ['Charles Dickens'],
  'Don Quixote': ['Miguel de Cervantes Saavedra', 'Miguel de Cervantes'],
  'Dracula': ['Bram Stoker'],
  'Dubliners': ['James Joyce'],
  'Emma': ['Jane Austen'],
  'Ethan Frome': ['Edith Wharton'],
  'Frankenstein': ['Mary Wollstonecraft Shelley', 'Mary Shelley'],
  'Good Wives': ['Louisa May Alcott'],
  'Great Expectations': ['Charles Dickens'],
  'Green Grow the Lilacs': ['Lynn Riggs'],
  'Grimms\u2019 Fairy Tales': ['Jacob Grimm', 'Wilhelm Grimm', 'Brothers Grimm'],
  'Gulliver\'s Travels': ['Jonathan Swift'],
  'Gulliver\u2019s Travels': ['Jonathan Swift'],
  'Hamlet': ['William Shakespeare'],
  'In His Steps': ['Sheldon', 'Charles M. Sheldon'],
  'Jane Eyre': ['Charlotte Bronte'],
  'Jo\'s Boys': ['Louisa May Alcott'],
  'Kidnapped': ['Robert Louis Stevenson'],
  'Kim': ['Rudyard Kipling'],
  'King Solomon\'s Mines': ['H. Rider Haggard', 'Rider Haggard'],
  'Leaves of Grass': ['Walt Whitman'],
  'Little Dorrit': ['Charles Dickens'],
  'Little Men': ['Louisa May Alcott'],
  'Little Women': ['Louisa May Alcott'],
  'Lorna Doone': ['R. D. Blackmore', 'Richard Doddridge Blackmore'],
  'Lorna Doone: A Romance of Exmoor': ['R. D. Blackmore', 'Richard Doddridge Blackmore'],
  'Macbeth': ['William Shakespeare'],
  'Main Street': ['Sinclair Lewis'],
  'Martin Eden': ['Jack London'],
  'Meditations': ['Marcus Aurelius'],
  'Middlemarch': ['George Eliot', 'Mary Ann Evans'],
  'Moby Dick': ['Herman Melville'],
  'Moby-Dick': ['Herman Melville'],
  'Mrs Dalloway': ['Virginia Woolf'],
  'Nicholas Nickleby': ['Charles Dickens'],
  'Northanger Abbey': ['Jane Austen'],
  'Oliver Twist': ['Charles Dickens'],
  'Persuasion': ['Jane Austen'],
  'Peter Pan': ['J. M. Barrie', 'James Matthew Barrie', 'J. M. Barrie Peter Pan'],
  'Peter and Wendy': ['J. M. Barrie', 'James Matthew Barrie'],
  'Pride and Prejudice': ['Jane Austen'],
  'Quo Vadis': ['Henryk Sienkiewicz'],
  'Rebecca': ['Daphne Du Maurier', 'du Maurier'],
  'Rebecca of Sunnybrook Farm': ['Kate Douglas Wiggin'],
  'Robinson Crusoe': ['Daniel Defoe'],
  'Romeo and Juliet': ['William Shakespeare'],
  'Self-Reliance': ['Ralph Waldo Emerson'],
  'Sense and Sensibility': ['Jane Austen'],
  'She': ['H. Rider Haggard', 'Rider Haggard'],
  'Siddhartha': ['Hermann Hesse'],
  'Silas Marner': ['George Eliot'],
  'St. Elmo': ['Augusta Jane Evans'],
  'Tarzan of the Apes': ['Edgar Rice Burroughs'],
  'Tender Is the Night': ['F. Scott Fitzgerald'],
  'The Adventures of Huckleberry Finn': ['Mark Twain'],
  'The Adventures of Sherlock Holmes': ['Arthur Conan Doyle'],
  'The Adventures of Tom Sawyer': ['Mark Twain'],
  'The Age of Innocence': ['Edith Wharton'],
  'The Art of War': ['Sun Tzu'],
  'The Autobiography of Benjamin Franklin': ['Benjamin Franklin'],
  'The Call of the Wild': ['Jack London'],
  'The Count of Monte Cristo': ['Alexandre Dumas'],
  'The Eternal City': ['Hall Caine'],
  'The Great Gatsby': ['F. Scott Fitzgerald'],
  'The Hound of the Baskervilles': ['Arthur Conan Doyle', 'Conan Doyle'],
  'The House of Mirth': ['Edith Wharton'],
  'The Iliad': ['Homer'],
  'The Invisible Man': ['Herbert George Wells', 'H. G. Wells'],
  'The Jungle': ['Upton Sinclair'],
  'The Jungle Book': ['Rudyard Kipling'],
  'The Little Princess': ['Frances Hodgson Burnett'],
  'The Magnificent Ambersons': ['Booth Tarkington'],
  'The Man in the Iron Mask': ['Alexandre Dumas'],
  'The Master of Ballantrae': ['Robert Louis Stevenson', 'R. L. Stevenson'],
  'The Memoirs of Sherlock Holmes': ['Arthur Conan Doyle', 'Conan Doyle'],
  'The Murders in the Rue Morgue': ['Edgar Allan Poe'],
  'The Odyssey': ['Homer'],
  'The Picture of Dorian Gray': ['Oscar Wilde'],
  'The Prisoner of Zenda': ['Anthony Hope'],
  'The Prophet': ['Kahlil Gibran'],
  'The Raven': ['Edgar Allan Poe'],
  'The Raven and Other Poems': ['Edgar Allan Poe'],
  'The Red Badge of Courage': ['Stephen Crane'],
  'The Return of Sherlock Holmes': ['Arthur Conan Doyle', 'Conan Doyle'],
  'The Scarlet Letter': ['Nathaniel Hawthorne'],
  'The Science of Getting Rich': ['Wallace D. Wattles'],
  'The Sea Wolf': ['Jack London'],
  'The Second Jungle Book': ['Rudyard Kipling'],
  'The Secret Garden': ['Frances Hodgson Burnett'],
  'The Shepherd of the Hills': ['Harold Bell Wright'],
  'The Souls of Black Folk': ['W. E. B. Du Bois'],
  'The Strange Case of Dr Jekyll and Mr Hyde': ['Robert Louis Stevenson', 'R. L. Stevenson'],
  'The Sun Also Rises': ['Ernest Hemingway'],
  'The Three Musketeers': ['Alexandre Dumas'],
  'The Time Machine': ['H. G. Wells'],
  'The War of the Worlds': ['Herbert George Wells', 'H. G. Wells'],
  'The Waves': ['Virginia Woolf'],
  'The Whole Works of William Shakespeare': ['William Shakespeare'],
  'The Wind in the Willows': ['Kenneth Grahame'],
  'The Wonderful Wizard of Oz': ['L. Frank Baum', 'Lyman Frank Baum'],
  'This Side of Paradise': ['F. Scott Fitzgerald'],
  'Through the Looking-Glass': ['Lewis Carroll'],
  'To the Lighthouse': ['Virginia Woolf'],
  'Treasure Island': ['Robert Louis Stevenson'],
  'Twenty Thousand Leagues Under the Sea': ['Jules Verne'],
  'Twenty Years After': ['Alexandre Dumas'],
  'Ulysses': ['James Joyce'],
  'Uncle Tom\'s Cabin': ['Harriet Beecher Stowe'],
  'Up from Slavery': ['Booker T. Washington'],
  'Vanity Fair': ['William Makepeace Thackeray'],
  'Walden': ['Henry David Thoreau'],
  'Walden; or, Life in the Woods': ['Henry David Thoreau'],
  'When Knighthood Was in Flower': ['Charles Major'],
  'White Fang': ['Jack London'],
  'Winesburg, Ohio': ['Sherwood Anderson'],
  'Wuthering Heights': ['Emily Bronte', 'Currer Bell'],
};

/** LoyalBooks slug form: lowercase, accents folded, non-alphanumerics hyphenated. */
function slugPart(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u0308]/g, '')
    .toLowerCase()
    .replace(/['`\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slugs worth trying for one curated title, most likely first. */
function slugCandidates(title) {
  const authors = CURATED_AUTHORS[title] || [];
  if (!authors.length) return [];
  const titles = [slugPart(title)];
  const noArticle = slugPart(title).replace(/^(the|a|an)-/, '');
  if (noArticle && noArticle !== titles[0]) titles.push(noArticle);
  const out = [];
  for (const t of titles) {
    for (const a of authors) {
      const slug = `${t}-by-${slugPart(a)}`;
      if (!out.includes(slug)) out.push(slug);
    }
  }
  return out.filter((slug) => !EXCLUDED_SLUGS.has(slug));
}

/**
 * LoyalBooks indexes titles under genres, so a famous work can be absent from
 * every listing while its own page still exists. Two lookups close that gap: the
 * author page, which lists the works LoyalBooks actually carries, and a direct
 * guess at the slug. Both check the page title before using the page.
 */
function stripArticle(s) {
  return s.replace(/^(the|a|an) /, '');
}

/** True when two titles name the same work, allowing a missing leading article. */
function sameTitle(a, b) {
  const x = stripArticle(normTitle(a));
  const y = stripArticle(normTitle(b));
  return x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ');
}

const authorListingCache = new Map();

/** Slugs and titles from an author page. Cached: prolific authors are asked once. */
async function authorListing(author) {
  const key = normTitle(author);
  if (authorListingCache.has(key)) return authorListingCache.get(key);
  const entries = [];
  for (let page = 1; page <= 4; page++) {
    const suffix = page > 1 ? '&page=' + page : '';
    let html = '';
    try {
      html = await fetchText(BASE + '/author?author=' + encodeURIComponent(author) + suffix, { tries: 1 });
    } catch {
      break;
    }
    const before = entries.length;
    for (const m of html.matchAll(/<a[^>]*href="@\/book@\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const slug = m[1];
      if (EXCLUDED_SLUGS.has(slug)) continue;
      const title = decodeEntities(m[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
      if (title.length > 1 && !entries.some((e) => e.slug === slug)) entries.push({ slug, title });
    }
    const total = Number((html.match(/Page \d+ of (\d+)/) || [])[1] || 1);
    if (page >= total || entries.length === before) break;
  }
  authorListingCache.set(key, entries);
  return entries;
}

/** True when a page gave us a title worth trusting: real text, not art or whitespace. */
function isNamed(s) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > 1 && /[a-z0-9]/i.test(t);
}

async function probeCurated(missed) {
  const todo = missed.filter((t) => (CURATED_AUTHORS[t] || []).length);
  log('  probing ' + todo.length + ' curated titles through author pages');
  const found = await pool(todo, CONCURRENCY, async (title) => {
    for (const author of CURATED_AUTHORS[title] || []) {
      for (const entry of await authorListing(author)) {
        if (!isNamed(entry.title)) continue; // anchors whose text is art or whitespace
        if (sameTitle(entry.title, title)) {
          return { slug: entry.slug, title: entry.title, author, url: BASE + '/book/' + entry.slug };
        }
      }
    }
    for (const slug of slugCandidates(title)) {
      if (EXCLUDED_SLUGS.has(slug)) continue;
      let html = '';
      try {
        html = await fetchText(BASE + '/book/' + slug, { tries: 1 });
      } catch {
        continue; // 404: LoyalBooks has no page under this spelling
      }
      const m = html.match(/itemprop="name"[^>]*>\s*([^<]+)</);
      if (!m) continue;
      const got = decodeEntities(m[1]);
      if (!isNamed(got)) continue; // the page advertised a title we cannot read
      if (!sameTitle(got, title)) continue;
      return { slug, title: got, author, url: BASE + '/book/' + slug };
    }
    return null;
  });
  const hits = found.filter(Boolean);
  log('  probe found ' + hits.length + ' of ' + todo.length + ' titles');
  log('  probe hits: ' + hits.map((h) => h.title).join(' | '));
  log('  probe missed: ' + todo.filter((x) => !hits.some((h) => sameTitle(h.title, x))).join(', '));
  return hits;
}


async function buildIndex(pagesDefault) {
  const index = new Map();
  const byGenre = new Map();
  for (const genre of INDEX_GENRES) {
    const cluster = CLUSTERS.find((c) => c.genre === genre);
    // Read deep enough to hold the whole site: the curated bestseller list is
    // matched locally against this index, and a miss is only ever "not
    // indexed at this depth", which deeper pages fix.
    const pages = PAGES_OVERRIDE || Math.max(3, cluster && cluster.indexPages ? cluster.indexPages : pagesDefault);
    const books = await listGenre(genre, pages);
    byGenre.set(genre, books);
    for (const b of books) if (!index.has(b.slug)) index.set(b.slug, b);
  }
  for (const b of await listTop100()) if (!index.has(b.slug)) index.set(b.slug, b);
  log(`index: ${index.size} books`);
  return { index: [...index.values()], byGenre };
}

async function selectClusters(index, byGenre) {
  const wanted = ONLY ? CLUSTERS.filter((c) => c.id === ONLY) : CLUSTERS;
  if (ONLY && wanted.length === 0) {
    throw new Error(`Unknown cluster "${ONLY}". Known: ${CLUSTERS.map((c) => c.id).join(', ')}`);
  }
  const picks = [];
  for (const cluster of wanted) {
    let listed = [];
    if (cluster.curated) {
      const missed = [];
      for (const title of BESTSELLERS) {
        const hit = matchCurated(title, index);
        if (!hit) {
          missed.push(title);
          continue;
        }
        listed.push(hit);
      }
      log(`${cluster.id}: matched ${listed.length}/${BESTSELLERS.length} curated titles`);
      if (missed.length) log(`  not indexed at this depth: ${missed.join(', ')}`);
      if (cluster.probe) {
        for (const book of await probeCurated(missed)) {
          if (!listed.some((b) => b.slug === book.slug)) listed.push(book);
        }
      }
    } else {
      listed = byGenre.get(cluster.genre) || [];
      log(`${cluster.id}: ${listed.length} books from /genre/${cluster.genre}`);
    }
    let cap = cluster.maxBooks;
    if (MAX_BOOKS > 0) cap = Math.min(cap, MAX_BOOKS);
    picks.push({ cluster, books: listed.slice(0, cap) });
  }
  return picks;
}

function catalogPayload(cluster, books) {
  return {
    version: 1,
    cluster: cluster.id,
    label: cluster.label,
    source: cluster.genre ? `${BASE}/genre/${cluster.genre}?type=all` : `${BASE}/ index + Top_100, curated public-domain bestseller titles`,
    fetchedAt: new Date().toISOString(),
    rights:
      'Public domain (US): LibriVox narration via archive.org, ebook text via Project Gutenberg / LoyalBooks. Every title here is listed by LoyalBooks, whose catalog is public-domain only, so nothing in copyright is crawled or shipped. See docs/classics-audiobooks.md.',
    books,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const taken = takenSlugs(ONLY ? `${ONLY}-catalog.json` : null);
  log(`catalogued slugs on other shelves: ${taken.size}`);

  const { index, byGenre } = await buildIndex(2);
  const picks = await selectClusters(index, byGenre);

  // One shelf per book: walk the picks in order and drop anything already
  // claimed by an earlier pick or an existing catalog file.
  const selected = new Set();
  const bySlug = new Map();
  for (const pick of picks) {
    const keep = [];
    for (const book of pick.books) {
      if (taken.has(book.slug) || selected.has(book.slug)) continue;
      selected.add(book.slug);
      bySlug.set(book.slug, book);
      keep.push(book);
    }
    pick.selected = keep;
    log(`${pick.cluster.id}: ${keep.length} new books to resolve`);
  }

  const todo = [...bySlug.values()];
  log(`resolving ${todo.length} book pages (concurrency ${CONCURRENCY})`);
  const details = await pool(todo, CONCURRENCY, async (book) => parseBookPage(book.html || (await fetchText(book.url))));
  const detailed = new Map();
  let failed = 0;
  todo.forEach((book, i) => {
    const d = details[i] || {};
    if (d.__error) {
      failed += 1;
      log(`  ! ${book.slug}: ${d.__error}`);
      return;
    }
    // A card with neither narration nor text is a dead end for a learner.
    if (!d.archiveId && !d.textUrl && !d.gutenbergUrl) {
      failed += 1;
      log(`  ! ${book.slug}: no audio or text link on the page`);
      return;
    }
    // Drop the fetched page and the probe flag: the catalog ships metadata only.
    const { html, probed, ...rest } = book;
    detailed.set(book.slug, { ...rest, ...d });
  });

  const summary = [];
  for (const pick of picks) {
    const books = pick.selected
      .map((b) => detailed.get(b.slug))
      .filter(Boolean)
      .map((b) => ({ ...b, cluster: pick.cluster.id }));
    const dest = path.join(OUT_DIR, `${pick.cluster.id}-catalog.json`);
    if (DRY_RUN) {
      log(`dry run: ${pick.cluster.id} would write ${books.length} books to ${path.relative(ROOT, dest)}`);
    } else {
      fs.writeFileSync(dest, `${JSON.stringify(catalogPayload(pick.cluster, books), null, 1)}\n`);
      log(`wrote ${path.relative(ROOT, dest)} (${books.length} books)`);
    }
    summary.push({
      id: pick.cluster.id,
      books: books.length,
      audio: books.filter((b) => b.archiveId).length,
      text: books.filter((b) => b.textUrl || b.gutenbergUrl).length,
    });
  }

  log(`\nunresolved pages: ${failed}`);
  log('cluster          books  audio   text');
  for (const s of summary) {
    log(`${s.id.padEnd(16)} ${String(s.books).padStart(5)} ${String(s.audio).padStart(6)} ${String(s.text).padStart(6)}`);
  }
  log('\nDone. Wire the new files into lib/classicsAudiobooks.ts and run:');
  log('  node scripts/check-classics-audiobooks.cjs');
}

module.exports = { normTitle, sameTitle, sameAuthor, sameWork: curatedMatch, curatedMatch, BESTSELLERS, CURATED_AUTHORS };

if (require.main === module) {
main().catch((e) => {
  console.error(`Classics cluster crawl failed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
}
