#!/usr/bin/env node

/**

 * Gate for the offline classics shelves (lib/classicsAudiobooks.ts).

 *

 * The app ships metadata for ~1,100 public-domain audiobooks across eight

 * shelves. A few books carry bundled audio and text for the offline demo; the

 * rest stream from archive.org / gutenberg.org when the user presses download.

 * That mix is what is easy to break:

 *

 *  1. One shelf per book. A slug on two shelves downloads and counts the same

 *     book twice, so the shelf tiles disagree with the library badge.

 *  2. Every link must be https and must point at the archive it claims. A raw

 *     LoyalBooks listing that slipped through unnormalised hands out cleartext

 *     links (the app stores reject those) and a mistyped host 404s the download

 *     after the user already paid for premium.

 *  3. Public domain only. The crawl source, LoyalBooks, hosts LibriVox reads of

 *     out-of-copyright works. An in-copyright bestseller on a shelf means the

 *     crawler invented an entry, and shipping it would be infringement.

 *  4. Shelf floors and a narration ratio: an empty shelf or a wall of text-only

 *     rows makes the feature read as broken.

 *  5. seed.ts must not require files that are not bundled, and the bundle must

 *     not carry files no catalog claims.

 *  6. The screen must window its offline probe. Probing every catalogued book at

 *     once is thousands of storage reads on mount, which is how this screen used

 *     to hang on a cold start.

 *

 * So: parse the shelf catalogs, prove the data is well formed, https,

 * public-domain-only, big enough, mostly narrated and consistent with the seed

 * manifest, then prove the app wires it up and gates it behind premium.

 */

const fs = require('fs');

const path = require('path');



const ROOT = path.resolve(__dirname, '..');

const BS = String.fromCharCode(92);



/** Smallest shelf we will ship. Below this the tile reads as broken. */

const SHELF_FLOORS = {

  philosophy: 100,

  bestsellers: 50,

  fiction: 150,

  adventure: 100,

  mystery: 80,

  science_fiction: 60,

  poetry: 100,

  history: 100,

};



/** Shelf -> the LoyalBooks genre tag its books must carry. */

const SHELF_GENRES = {

  philosophy: 'Philosophy',

  adventure: 'Adventure',

  fiction: 'Fiction',

  mystery: 'Mystery',

  science_fiction: 'Science fiction',

  poetry: 'Poetry',

  history: 'History',

};



const MIN_AUDIO_SHARE = 0.6;

const MIN_NARRATED_TOTAL = 500;

const ARCHIVE_HOSTS = ['archive.org', 'gutenberg.org', 'loyalbooks.com'];



/**

 * Titles still in copyright. None of them may appear on a shelf: if one shows

 * up, the crawl hallucinated a row (LoyalBooks cannot serve these), and

 * shipping it would be infringement, not a content bug.

 */

const IN_COPYRIGHT = [

  'Atomic Habits', 'Sapiens', 'It Ends with Us', 'Verity', 'Where the Crawdads Sing',

  'Educated', 'Thinking, Fast and Slow', 'The 48 Laws of Power', 'Rich Dad Poor Dad',

  'How to Win Friends and Influence People', 'The 5 AM Club', 'Cant Hurt Me',

  'Shoe Dog', 'Becoming', 'The Hunger Games', 'Catching Fire', 'Mockingjay',

  'Divergent', 'Insurgent', 'Allegiant', 'The Fault in Our Stars', 'Gone Girl',

  'The Girl on the Train', 'Normal People', 'The Nightingale', 'Circe',

  'The Song of Achilles', 'The Goldfinch', 'The Secret History', 'The Road',

  'No Country for Old Men', 'Project Hail Mary', 'The Martian', 'Hamnet',

  'The Overstory', 'Lessons in Chemistry', 'The Midnight Library',

  'A Court of Thorns and Roses', 'Fourth Wing', 'Iron Flame', 'The Women',

  'Intermezzo', 'Martyr!', 'The Silent Patient', 'The Very Hungry Caterpillar',

  'Harry Potter and the Philosophers Stone', 'Diary of a Wimpy Kid',

];



/** Living or recently living authors: never a public-domain LibriVox read. */

const MODERN_AUTHORS = [

  'James Clear', 'Mark Mansker', 'Ryan Greaves', 'Haruki Murakami', 'J.K. Rowling',

  'George R.R. Martin', 'J.R.R. Tolkien', 'Lee Child', 'James Patterson', 'Stephen King',

  'Dan Brown', 'Taylor Coalson', 'David Rosenfelt', 'Jeff Kinney', 'Suzanne Collins',

  'Veronica Roth', 'John Green', 'Gillian Flynn', 'Colleen Hoover', 'Delia Owens',

  'Tara Westover', 'Malcolm Gladwell', 'Robert Greene', 'Marie Kondo', 'Yuval Noah Harari',

  'Andy Weir', 'Sally Rooney', 'Hanya Yanagihara', 'Kristin Hannah', 'Madeline Miller',

  'Donna Tartt', 'Cormac McCarthy', 'Colson Whitehead', 'Rebecca Yarros', 'Sarah J. Maas',

  'R.J. Palacio', 'Dav Pilkey', 'Freida McFadden', 'Lisa Taddeo', 'Celeste Ng',

];





const FILES = {

  lib: 'lib/classicsAudiobooks.ts',

  seed: 'assets/audiobooks/seed.ts',

  screen: 'src/app/audiobooks.tsx',

  home: 'src/app/library.tsx',

  player: 'components/AudiobookPlayer.tsx',

  prefs: 'lib/preferences.ts',

  daily: 'lib/classicsDailyLimit.ts',

  icons: 'components/AppIcon.tsx',

  gates: 'content/quality/gates.json',

  pkg: 'package.json',

  doc: 'docs/classics-audiobooks.md',

  rights: 'docs/content-rights.md',

  crawler: 'scripts/fetch-classics-clusters.cjs',

};



function read(rel) {

  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error('missing file: ' + rel);

  return fs.readFileSync(path.join(ROOT, rel), 'utf8');

}



function readCatalog(id) {

  const rel = 'assets/audiobooks/' + id + '-catalog.json';

  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error('missing shelf catalog: ' + rel);

  let payload;

  try {

    payload = JSON.parse(read(rel));

  } catch (e) {

    throw new Error(rel + ' is not valid JSON: ' + e.message);

  }

  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.books)) {

    throw new Error(rel + ' must be an object with a books[] array');

  }

  return { rel, payload };

}



function stringsOf(node, out) {

  if (typeof node === 'string') out.push(node);

  else if (Array.isArray(node)) for (const v of node) stringsOf(v, out);

  else if (node && typeof node === 'object') for (const v of Object.values(node)) stringsOf(v, out);

  return out;

}



function stripArticle(s) {

  return String(s).toLowerCase().replace(/^(the|a|an) /, '').trim();

}



function normTitle(s) {

  const lowered = String(s).toLowerCase();

  let out = '';

  for (const ch of lowered) out += (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') ? ch + ' ' : ' ';

  return out.split(' ').filter(Boolean).join(' ');

}



function creditsModern(author, name) {

  // Match the credited name as a whole phrase: 'John Greenleaf Whittier' (1807-1892,

  // public domain) must not be mistaken for the modern thriller writer 'John Green'.

  const a = String(author);

  const at = a.indexOf(name);

  if (at < 0) return false;

  const letters = /[A-Za-z]/;

  if (at > 0 && letters.test(a.charAt(at - 1))) return false;

  if (letters.test(a.charAt(at + name.length))) return false;

  return true;

}



function sameTitle(a, b) {

  return normTitle(stripArticle(a)) === normTitle(stripArticle(b));

}



function urlOk(value) {

  if (typeof value !== 'string' || value.indexOf('https://') !== 0) return null;

  let parsed;

  try {

    parsed = new URL(value);

  } catch (e) {

    return null;

  }

  return { host: parsed.host, pathname: parsed.pathname };

}



function onHost(url, host) {

  return url.host === host || url.host.endsWith('.' + host);

}



/** The titles the crawler is allowed to put on the bestsellers shelf. */

// The crawler owns the curated public-domain bestseller list and the rule that
// recognises a title there, so the gate cannot drift away from what the crawl
// actually accepts. Loading it also proves the module still parses.
const CRAWLER = require(path.join(__dirname, 'fetch-classics-clusters.cjs'));
const CURATED = CRAWLER.BESTSELLERS;
if (!Array.isArray(CURATED) || CURATED.length < 100) {
  throw new Error('the curated BESTSELLERS list looks truncated: ' + (CURATED || []).length + ' titles');
}
const CURATED_AUTHORS = CRAWLER.CURATED_AUTHORS;
const unowned = CURATED.filter((t) => !(CURATED_AUTHORS[t] || []).length);
if (unowned.length) {
  throw new Error('curated bestsellers with no author to verify against, so a lookalike title could impersonate them: ' + unowned.slice(0, 8).join(', '));
}

/** True when a (title, author) pair is one of the curated public-domain bestsellers. */
function onCurated(title, author) {
  return Boolean(CRAWLER.curatedMatch(title, author));
}



const IDS = Object.keys(SHELF_FLOORS);

const catalogs = {};

for (const id of IDS) catalogs[id] = readCatalog(id);



/** Every book, stamped with the shelf file it came from. */

const allBooks = [];

for (const id of IDS) for (const book of catalogs[id].payload.books) allBooks.push({ shelf: id, book });




const LIB = read(FILES.lib);

const SEED = read(FILES.seed);

const SCREEN = read(FILES.screen);

const HOME = read(FILES.home);

const PLAYER = read(FILES.player);

const PREFS = read(FILES.prefs);

const DAILY = read(FILES.daily);

const DOC = read(FILES.doc);

const RIGHTS = read(FILES.rights);



const hasAudio = (b) => !!(b.audioZip || b.audioM4b);

const totalAudio = allBooks.filter((x) => hasAudio(x.book)).length;



const checks = [];

function check(name, fn) {

  checks.push({ name, fn });

}



function assertDate(value, where) {

  const iso = String(value || '');

  if (iso.length < 12 || iso.charAt(4) !== '-' || iso.charAt(7) !== '-' || iso.charAt(10) !== 'T') {

    throw new Error(where + ' needs an ISO fetchedAt timestamp, got ' + JSON.stringify(value));

  }

}



function assertSlug(slug, where) {

  const s = String(slug || '');

  if (!s) throw new Error(where + ': a row has no slug: ' + JSON.stringify(where));

  for (const ch of s) {

    if (ch === '/' || ch === ' ' || ch === '<' || ch === '>' || ch === '"' || ch === '?') {

      throw new Error(where + ': slug ' + s + ' is not a single url path segment');

    }

  }

}



check('Each catalogued book lives on exactly one shelf', () => {

  const bySlug = new Map();

  for (const { shelf, book } of allBooks) {

    assertSlug(book.slug, shelf);

    const prev = bySlug.get(book.slug);

    if (prev) throw new Error('slug ' + book.slug + ' is on both ' + prev + ' and ' + shelf + ': one shelf per book, or the same download is counted twice');

    bySlug.set(book.slug, shelf);

  }

  for (const id of IDS) {

    const { rel, payload } = catalogs[id];

    if (payload.cluster !== undefined && payload.cluster !== id) {

      throw new Error(rel + ' declares cluster ' + payload.cluster + ', expected ' + id);

    }

    for (const book of payload.books) {

      if (book.cluster !== undefined && book.cluster !== id) {

        throw new Error(rel + ': ' + book.slug + ' says cluster ' + book.cluster + ' but sits in the ' + id + ' file');

      }

    }

  }

});



check('Shelves span the LoyalBooks genre taxonomy', () => {

  const tags = new Set();

  for (const { shelf, book } of allBooks) {

    if (!Array.isArray(book.genres) || !book.genres.length) throw new Error(shelf + ': ' + book.slug + ' has no genres[]');

    for (const g of book.genres) {

      if (typeof g !== 'string' || !g.trim()) throw new Error(shelf + ': ' + book.slug + ' has an empty genre tag');

      tags.add(g.trim());

    }

  }

  if (tags.size < 12) throw new Error('the crawl produced only ' + tags.size + ' distinct genre tags, expected a real spread across the taxonomy');

  for (const id of Object.keys(SHELF_GENRES)) {

    const tag = SHELF_GENRES[id].toLowerCase();

    const books = catalogs[id].payload.books;

    const onTag = books.filter((b) => (b.genres || []).some((g) => String(g).toLowerCase() === tag)).length;

    if (onTag / books.length < MIN_AUDIO_SHARE) {

      throw new Error('shelf ' + id + ': only ' + Math.round((onTag / books.length) * 100) + '% of its books carry the ' + SHELF_GENRES[id] + ' tag');

    }

  }

  for (const id of IDS) {

    if (LIB.indexOf("id: '" + id + "'") < 0) throw new Error('lib/classicsAudiobooks.ts never registers the ' + id + ' shelf');

    if (LIB.indexOf(id + '-catalog.json') < 0) throw new Error('lib/classicsAudiobooks.ts never imports ' + id + '-catalog.json');

  }

});



check('Every shelf is populated, labelled and mostly narrated', () => {

  for (const id of IDS) {

    const { rel, payload } = catalogs[id];

    const books = payload.books;

    if (payload.version !== 1) throw new Error(rel + ' has version ' + payload.version + ', expected 1');

    if (String(payload.source).indexOf('loyalbooks.com') < 0) {

      throw new Error(rel + ' must be crawled from LoyalBooks (public-domain audio), got ' + payload.source);

    }

    if (String(payload.rights || '').toLowerCase().indexOf('public domain') < 0) throw new Error(rel + ' must record its rights, e.g. Public domain (US)');

    assertDate(payload.fetchedAt, rel);

    if (payload.cluster !== undefined && !String(payload.label || '').trim()) throw new Error(rel + ' needs a label for its shelf tile');

    if (books.length < SHELF_FLOORS[id]) {

      throw new Error(rel + ' has ' + books.length + ' books, need ' + SHELF_FLOORS[id] + ' (run: node scripts/fetch-classics-clusters.cjs --cluster=' + id + ')');

    }

    for (const b of books) {

      for (const key of ['title', 'author', 'url']) {

        if (typeof b[key] !== 'string' || !b[key].trim()) throw new Error(rel + ': ' + b.slug + ' has no ' + key);

      }

      if (typeof b.hasAudio === 'boolean' && b.hasAudio !== hasAudio(b)) {

        throw new Error(rel + ': ' + b.slug + ' sets hasAudio ' + b.hasAudio + ' but carries no audio link');

      }

    }

    const audio = books.filter(hasAudio).length;

    if (audio / books.length < MIN_AUDIO_SHARE) {

      throw new Error(rel + ' is only ' + Math.round((audio / books.length) * 100) + '% narrated (' + audio + '/' + books.length + '), need ' + Math.round(MIN_AUDIO_SHARE * 100) + '%');

    }

  }

  if (totalAudio < MIN_NARRATED_TOTAL) throw new Error('the library has ' + totalAudio + ' narrated books, need ' + MIN_NARRATED_TOTAL);

});



check('Every row is named and credited', () => {
  for (const { shelf, book } of allBooks) {
    if (String(book.title).trim().length < 2) throw new Error(shelf + ': ' + book.slug + ' has no readable title');
    if (String(book.author).trim().length < 2) throw new Error(shelf + ': ' + book.slug + ' has no author credit');
    // a parse that came back empty tends to fall through to the url tail
    if (/[a-z0-9]{3,}-[a-z0-9]{3,}-[a-z0-9]{3,}-/.test(String(book.title))) {
      throw new Error(shelf + ': "' + book.title + '" reads like a url, not a title');
    }
  }
});

check('Audio and text links are https and point at the archives', () => {

  let provenance = 0;

  for (const { shelf, book } of allBooks) {

    for (const value of stringsOf(book, [])) {

      if (value.indexOf('http://') === 0) {

        throw new Error(shelf + ': ' + book.slug + ' still carries a cleartext link: ' + value.slice(0, 110) + ' (normalise http:// to https:// when the catalog is crawled)');

      }

    }

    const page = urlOk(book.url);

    if (!page) throw new Error(shelf + ': ' + book.slug + ' page url is not an https url: ' + book.url);

    const fromLoyalBooks = onHost(page, 'loyalbooks.com') && page.pathname.indexOf('/book/') === 0;

    const fromArchive = onHost(page, 'archive.org') && page.pathname.indexOf('/details/') === 0 && book.source === 'archive.org';

    if (!fromLoyalBooks && !fromArchive) {

      throw new Error(shelf + ': ' + book.slug + ' page url must be a LoyalBooks book page or a declared archive.org item: ' + book.url);

    }

    if (book.audioZip != null) {

      const z = urlOk(book.audioZip);

      if (!z || !onHost(z, 'archive.org') || z.pathname.indexOf('/download/') !== 0) {

        throw new Error(shelf + ': ' + book.slug + ' audioZip must be an archive.org /download/ url: ' + book.audioZip);

      }

      if (z.pathname.indexOf('64kb_mp3.zip') < 0) throw new Error(shelf + ': ' + book.slug + ' audioZip is not the narrated mp3 bundle: ' + book.audioZip);

    }

    if (book.audioM4b != null) {

      const m = urlOk(book.audioM4b);

      if (!m || !onHost(m, 'archive.org')) throw new Error(shelf + ': ' + book.slug + ' audioM4b must be an archive.org url: ' + book.audioM4b);

    }

    if (book.cover != null) {

      const c = urlOk(book.cover);

      const loyalCover = c && onHost(c, 'loyalbooks.com') && c.pathname.indexOf('/image/') === 0;

      const archiveCover = c && onHost(c, 'archive.org') && c.pathname.indexOf('/services/img/') === 0;

      if (!loyalCover && !archiveCover) throw new Error(shelf + ': ' + book.slug + ' cover must come from LoyalBooks or archive.org: ' + book.cover);

    }

    for (const key of ['textUrl', 'epubUrl', 'gutenbergUrl']) {

      const value = book[key];

      if (value == null) continue;

      const u = urlOk(value);

      if (!u) throw new Error(shelf + ': ' + book.slug + ' ' + key + ' must be an https url: ' + value);

      if (!ARCHIVE_HOSTS.some((h) => onHost(u, h))) {

        throw new Error(shelf + ': ' + book.slug + ' ' + key + ' points off the archives (' + u.host + '): ' + value);

      }

      if (key === 'gutenbergUrl') provenance++;

    }

  }

  if (!provenance) throw new Error('no shelf row records a gutenberg.org text source, so the rights trail is missing');

  if (LIB.indexOf('https://') < 0) throw new Error('lib/classicsAudiobooks.ts has no https archive url at all');

  if (LIB.indexOf('http://') >= 0) throw new Error('lib/classicsAudiobooks.ts builds a cleartext http archive url');

});



check('No in-copyright title entered a shelf', () => {

  const banned = new Set(IN_COPYRIGHT.map(normTitle));

  for (const { shelf, book } of allBooks) {

    if (banned.has(normTitle(book.title))) {

      throw new Error(shelf + ': ' + book.title + ' is still in copyright and must never be crawled or bundled');

    }

    for (const author of MODERN_AUTHORS) {

      if (creditsModern(book.author, author)) {

        throw new Error(shelf + ': ' + book.title + ' is credited to ' + book.author + ', a modern author with no public-domain LibriVox read');

      }

    }

  }

  const shelf = catalogs.bestsellers.payload.books;

  const offList = shelf.filter((b) => !onCurated(b.title, b.author));

  if (offList.length) {

    throw new Error('the bestsellers shelf holds ' + offList.length + ' titles outside the curated public-domain list, e.g. ' +

      offList.slice(0, 5).map((b) => b.title).join(', '));

  }

  const authors = new Set(shelf.map((b) => b.author));

  if (authors.size < 10) throw new Error('the bestsellers shelf has only ' + authors.size + ' distinct authors, so one writer is padding it');

  const matched = CURATED.filter((t) =>
    allBooks.some(
      (x) => sameTitle(x.book.title, t) && (CURATED_AUTHORS[t] || []).some((a) => CRAWLER.sameAuthor(x.book.author, a))
    )
  );

  if (matched.length < 40) throw new Error('the crawl matched only ' + matched.length + ' curated bestsellers, expected at least 40');

});



check('The bundle is complete: every require resolves and every file is claimed', () => {

  const opened = 'require(' + String.fromCharCode(39) + '.';

  const paths = [];

  let i = SEED.indexOf(opened);

  while (i >= 0) {

    const end = SEED.indexOf(String.fromCharCode(39) + ')', i + opened.length);

    if (end < 0) break;

    paths.push(SEED.slice(i + opened.length - 1, end));

    i = SEED.indexOf(opened, end);

  }

  if (paths.length < 10) throw new Error('seed.ts requires only ' + paths.length + ' bundled files, the offline demo would have nothing to play');

  const slugs = new Set(allBooks.map((x) => x.book.slug));

  const keys = [];

  for (const line of SEED.split(String.fromCharCode(10))) {

    const at = line.indexOf("':");

    if (at < 0) continue;

    const key = line.slice(0, at).trim().replace(/^'/, '');

    if (key && key.indexOf(' ') < 0 && key !== 'export const BUNDLED_TEXTS' && key !== 'export const BUNDLED_AUDIO') keys.push(key);

  }

  if (!keys.length) throw new Error('seed.ts maps no slugs, so the app cannot find its bundled books');

  for (const key of keys) {

    if (!slugs.has(key)) throw new Error('seed.ts bundles ' + key + ' but no shelf catalog lists that slug');

  }

  for (const rel of paths) {

    const parts = rel.split('/');

    if (parts[1] !== 'texts' && parts[1] !== 'audio') throw new Error('seed.ts requires ' + rel + ', outside texts/ or audio/');

    if (!fs.existsSync(path.join(ROOT, 'assets', 'audiobooks', rel))) throw new Error('seed.ts requires ' + rel + ', which is not in the repo');

    const owner = parts[1] === 'audio' ? parts[2] : parts[parts.length - 1].split('.')[0];

    if (!slugs.has(owner)) throw new Error('the bundle ships ' + rel + ' for a slug no shelf claims');

  }

  const bundledRows = allBooks.filter((x) => x.book.bundledText || x.book.bundledAudio);

  if (bundledRows.length < 5) throw new Error('only ' + bundledRows.length + ' catalog rows point at bundled media');

  for (const { shelf, book } of bundledRows) {

    for (const key of ['bundledText', 'bundledAudio']) {

      const value = book[key];

      if (typeof value !== 'string') continue;

      if (!fs.existsSync(path.join(ROOT, 'assets', 'audiobooks', value))) {

        throw new Error(shelf + ': ' + book.slug + ' sets ' + key + ' = ' + value + ', which is not bundled');

      }

    }

  }

});



check('The offline library exposes the full download/play API', () => {

  const names = ['CLASSICS', 'CLUSTERS', 'clusterCounts', 'booksInCluster', 'getClassic', 'primaryGenre', 'genreCounts',

    'fetchChapters', 'listOfflineSlugs', 'getOfflineStatus', 'downloadBook', 'removeOfflineBook', 'localCoverUri',

    'localTextUri', 'playableChapters', 'readTextFile', 'formatBytes', 'CatalogBook', 'ClassicBook', 'ClassicChapter',

    'OfflineStatus', 'ClassicsClusterSummary', 'OfflineState'];

  for (const name of names) {

    const re = new RegExp('export (async function|function|const|type|interface) ' + name + BS + 'b');

    if (!re.test(LIB)) throw new Error('lib/classicsAudiobooks.ts no longer exports ' + name + ', which the shelf screen and player depend on');

  }

  // downloadBook itself is policy-free: the shelf screen owns the premium and

  // daily-cap decisions before it calls this. What the lib must keep refusing is

  // a web download (expo-file-system has no writable store in a browser).

  if (LIB.indexOf('Offline downloads need the mobile app') < 0) {

    throw new Error('downloadBook no longer refuses to run on web, so the browser would fail mid-download');

  }

  if (LIB.indexOf('makeDirectoryAsync') < 0) throw new Error('downloadBook no longer creates its book directory');

});



check('The in-app media player plays every part in order and exposes a volume level', () => {

  for (const needle of ['a.index - b.index', 'clampMediaVolume', 'ordered', 'Part ']) {

    if (PLAYER.indexOf(needle) < 0) throw new Error('components/AudiobookPlayer.tsx lost ' + needle + ', so multi-part books no longer play in order');

  }

  if (PREFS.indexOf('Math.min(1, Math.max(0, volume))') < 0) throw new Error('lib/preferences.ts no longer clamps media volume to 0..1');

  if (LIB.indexOf('playableChapters') < 0) throw new Error('the lib does not filter parts down to the ones that resolve, so the player queues dead chapters');

});



check('Web text reads route through the CORS-safe fetch-text function', () => {

  if (LIB.indexOf('functions/v1/fetch-text') < 0) {

    throw new Error('readTextFile must proxy web text reads through the supabase fetch-text function: browsers cannot fetch gutenberg.org directly (CORS)');

  }

  if (LIB.indexOf('Platform.OS') < 0) throw new Error('readTextFile no longer branches on Platform.OS, so native and web take the same path');

  if (DOC.indexOf('fetch-text') < 0) throw new Error(FILES.doc + ' never explains the web fetch-text proxy');

});



check('Premium downloads are capped at one book per day', () => {

  for (const name of ['todayKey', 'getDailyDownload', 'canDownloadToday', 'recordDailyDownload', 'clearDailyDownload']) {

    if (DAILY.indexOf('export function ' + name) < 0 && DAILY.indexOf('export async function ' + name) < 0) {

      throw new Error('lib/classicsDailyLimit.ts no longer exports ' + name);

    }

  }

  if (DAILY.indexOf('bolingo.classics.dailyDownload') < 0) {

    throw new Error('the daily-cap storage key changed, which silently resets every existing counter');

  }

  if (SCREEN.indexOf('classicsDailyLimit') < 0) throw new Error('src/app/audiobooks.tsx does not import the daily cap');

  if (SCREEN.indexOf('per day') < 0) throw new Error('the screen never tells the user about the one-book-per-day limit');

});



check('The screen renders shelves and genres and pages its offline probe', () => {

  for (const needle of ['SHELF_PAGE', 'listOfflineSlugs', 'clusterCounts', 'isPremium', 'ALL SHELVES', 'MORE OF', 'canDownloadToday(', 'recordDailyDownload(', 'verdict.allowed']) {

    if (SCREEN.indexOf(needle) < 0) throw new Error('src/app/audiobooks.tsx lost ' + needle);

  }

  if (SCREEN.indexOf('premium') < 0 && SCREEN.indexOf('PREMIUM') < 0) throw new Error('the shelf screen does not gate downloads behind premium');

  // Probing offline status for the whole merged library is ~1,100 storage reads

  // on mount, which is how this screen used to hang on a cold start.

  if (SCREEN.indexOf('Promise.all(CLASSICS') >= 0) throw new Error('the screen probes offline status for the entire library at once');

  if (SCREEN.indexOf('refreshStatuses(CLASSICS)') >= 0) throw new Error('the screen re-probes every catalogued book on mount');

  if (SCREEN.indexOf('setShelfWindow') < 0 || SCREEN.indexOf('.slice(0, limit)') < 0) {

    throw new Error('the shelf list no longer windows its rows to SHELF_PAGE, so it mounts the whole library at once');

  }

});



check('The route, home entry, icons and registrations exist', () => {

  if (!fs.existsSync(path.join(ROOT, 'src/app/audiobooks.tsx'))) throw new Error('the audiobooks screen file is gone');

  if (HOME.indexOf('/audiobooks') < 0) throw new Error(FILES.home + ' no longer links to /audiobooks');

  if (HOME.indexOf('186 classics') >= 0) throw new Error(FILES.home + ' hardcodes 186 classics, stale now that the library spans several shelves');

  if (HOME.indexOf('CLASSICS.length') < 0) throw new Error(FILES.home + ' should count the merged library out of CLASSICS');

  const icons = read(FILES.icons);

  if (icons.indexOf('cloud-download') < 0) throw new Error('components/AppIcon.tsx lost the download glyph the shelf uses');

  if (icons.indexOf('headset') < 0) throw new Error('components/AppIcon.tsx lost the audiobook glyph');

  const gates = JSON.parse(read(FILES.gates));

  const list = Array.isArray(gates) ? gates : (gates.gates || []);

  const self = list.find((g) => g && (g.name === 'classics-audiobooks' || g.id === 'classics-audiobooks'));

  if (!self) throw new Error('content/quality/gates.json does not register the classics-audiobooks check');

  if (self.required !== true) throw new Error('the classics-audiobooks check must stay required: it is the only thing proving we ship no in-copyright audio');

  if (read(FILES.pkg).indexOf('check:audiobooks') < 0) throw new Error('package.json lost the check:audiobooks script');

  for (const needle of ['loyalbooks.com', 'public domain', 'Bestsellers', 'fetch-classics-clusters.cjs', 'listOfflineSlugs', 'SHELF_PAGE', 'one book per day']) {

    if (DOC.toLowerCase().indexOf(needle.toLowerCase()) < 0) throw new Error(FILES.doc + ' never documents ' + needle);

  }

  if (RIGHTS.toLowerCase().indexOf('public domain') < 0) throw new Error(FILES.rights + ' must state that shelf audio is public domain');

  if (RIGHTS.toLowerCase().indexOf('loyalbooks') < 0) throw new Error(FILES.rights + ' must name the shelf source (LoyalBooks) and say in-copyright bestsellers are never hosted');

});



const fails = [];

for (const { name, fn } of checks) {

  try {

    fn();

    console.log('[ok]   ' + name);

  } catch (e) {

    fails.push({ name, message: e && e.message ? e.message : String(e) });

    console.log('[FAIL] ' + name);

  }

}

console.log('');

console.log('shelves:  ' + IDS.map((id) => id + '=' + catalogs[id].payload.books.length).join(' '));

console.log('narrated: ' + totalAudio + ' of ' + allBooks.length + ' catalogued books');

if (fails.length) {

  for (const f of fails) console.log(String.fromCharCode(10) + 'FAIL: ' + f.name + String.fromCharCode(10) + '  ' + f.message);

  console.log(String.fromCharCode(10) + fails.length + ' of ' + checks.length + ' classics audiobook checks failed.');

  process.exit(1);

}

console.log('Classics audiobook checks passed.');

