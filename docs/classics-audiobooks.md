# Classics Library (premium offline audiobooks and ebooks)

The Classics Library (`src/app/audiobooks.tsx`, route `/audiobooks`) is the
premium section's seeded shelf: public-domain books from
https://www.loyalbooks.com/ — each with LibriVox narration and a Gutenberg /
LoyalBooks ebook — browsable with no network and readable or playable offline
after download.

## Shelves

One catalog file per genre cluster under `assets/audiobooks/`, named
`<cluster>-catalog.json`, loaded together by `lib/classicsAudiobooks.ts`:

| Cluster | File | Books | Narrated |
| --- | --- | --- | --- |
| Philosophy | `philosophy-catalog.json` | 186 | 184 |
| Bestsellers | `bestsellers-catalog.json` | 65 | 64 |
| Fiction | `fiction-catalog.json` | 228 | 228 |
| Adventure | `adventure-catalog.json` | 148 | 148 |
| Mystery | `mystery-catalog.json` | 136 | 136 |
| Science fiction | `science_fiction-catalog.json` | 88 | 88 |
| Poetry | `poetry-catalog.json` | 160 | 159 |
| History | `history-catalog.json` | 142 | 137 |

1,153 books, 1,144 of them narrated. A slug lives on exactly one shelf: the
crawl skips anything an earlier shelf already published, so the **Bestsellers**
shelf holds curated titles the genre crawls did not already claim (a book that
is also good Mystery sits on Mystery, and the app counts it once).

## Sources — and what is never added

- Catalog and taxonomy: `loyalbooks.com` genre and author pages. LibriVox does
  not allow site scraping, so LoyalBooks (a LibriVox mirror) is the source.
- Audio: LibriVox recordings hosted on archive.org (`_64kb.mp3` chapters).
- Text: Project Gutenberg / LoyalBooks-hosted `.txt` ebooks.

Everything here is **public domain** in the US, which is why the shelf can ship
inside the app with no per-file rights paperwork. That is different from learner
uploads: audio or video a learner uploads still needs the content-rights
checklist (`docs/content-rights.md`), because a private recording can carry a
speaker's voice and a publisher's rights. The reader screen labels every text
"public domain", and every row keeps its source URL.

In-copyright bestsellers are never crawled, downloaded or bundled. `BESTSELLERS`
in `scripts/fetch-classics-clusters.cjs` is a curated list of 123 *public-domain
bestsellers of their day* (Austen, Dumas, Shelley, Wells, Twain …). Modern
titles — `Atomic Habits`, `Sapiens`, `Where the Crawdads Sing`, Harry Potter —
are deliberately absent and are treated as bugs if they ever appear. A learner
who wants those is pointed at a library or a store: Bolingo Learn links, never
hosts.

A curated title is only accepted when **both** its name and its author match:
`curatedMatch(title, author)` requires the credit to be in `CURATED_AUTHORS`
and to agree, after middle names, initials, and trailing `Jr.` / `MD` /
`DD` / `PhD` are dropped. That is what keeps Byron's poem *The Island* off the
shelf for *The Island of Doctor Moreau*, a Godolphin schoolbook off the shelf
for Defoe's *Robinson Crusoe*, and Balzac's *Farewell* off the shelf for
Hemingway's *A Farewell to Arms*.

## Taxonomy mirrors LoyalBooks

Each book page carries a **"Genres for this book"** table and the catalog stores
it verbatim in page order (`genres: string[]`, e.g. Anthem → Fiction,
Philosophy, Science fiction, Literature, …). The app:

- filters with one chip per LoyalBooks genre (`genreCounts()`),
- groups the "All" view under each book's **primary genre** (first listed,
  `primaryGenre()`),
- searches title, author and genre together.

## Browsing the shelf

The screen is two stacked sections sharing one search / genre / offline filter:

- **Listen to Audiobook Mode** (top, audio-first): every narrated book, Listen
  button first; streaming stays unlimited.
- **Books Library** (below, text-first): every ebook, Read button first.

With over a thousand rows, the list is paged: `SHELF_PAGE` (40 rows) renders
first, `SHOW n MORE OF …` extends it, and changing any filter folds the window
back to the top of the shelf. `ALL SHELVES` plus a `MORE OF <genre>` strip keep cross-genre browsing
possible from any shelf. `clusterCounts()` drives the shelf chips and the
`/library` tile, which reads its number from `CLASSICS.length` rather than a
hard-coded count.

## Offline model

- The catalog JSON ships in the bundle: browsable with no network.
- A starter shelf ships too: 12 ebook texts (`texts/`) + 2 complete short
  audiobooks (`audio/`), mapped by `assets/audiobooks/seed.ts` (Metro needs
  literal `require()` calls — generated, never hand-edited).
- Everything else downloads on demand into
  `documentDirectory/classics/<slug>/` (text + `_64kb.mp3` chapters, chapter
  list via `https://archive.org/metadata/<archiveId>`, cached as
  `manifest.json`) and then reads/plays fully offline.
- `listOfflineSlugs()` (in `lib/classicsAudiobooks.ts`) lists the local folder
  and is the only way the app knows what is on disk, so a download that was
  interrupted still shows up as "partly here" and `removeOfflineBook` can clean
  it up. Bundled starter books report `bundled`.
- Bundled assets resolve to `file://` via `expo-asset` + copy, so playback and
  reading never depend on the Metro server in production builds.
- `metro.config.js` pins `txt`/`mp3` as asset extensions so the shelf bundles.

## Premium gate: one book per day

Read / Listen / Download require `profiles.is_premium`. Free and signed-out
learners get the shelf preview plus an upsell (`/paywall`, `/auth`). The home
path links the shelf under "Classics Library" and the route is registered in
`src/app/_layout.tsx`.

Premium includes **one book per day** of downloads
(`lib/classicsDailyLimit.ts`, an AsyncStorage stamp `{ date, slug, title }` on
the local calendar day). The screen checks `canDownloadToday()` before it
starts, refuses with "your next book unlocks tomorrow" when the day is spent,
and only then calls `downloadBook()` and records the stamp with
`recordDailyDownload()`. Re-downloading or resuming the same book stays free,
books already offline never count, and the header names today's pick. The cap
lives in the screen: `downloadBook` itself stays a plain storage primitive so
the "Offline downloads need the mobile app" refusal on web keeps working.

## Covers, player, reading mode

- **Covers** are the LoyalBooks artwork (`https://www.loyalbooks.com/image/…`,
  or `archive.org/services/img/…` for archive.org rows). Downloading also
  caches it beside the text and audio (`cover.jpg`, `localCoverUri`).
- **Player** (`components/AudiobookPlayer.tsx`) plays the book in full, in
  order: an index-sorted chapter queue that auto-advances to the last part,
  with prev/next, −15s / +30s, tap-to-seek, 0.75×–2× speed, a sleep timer, the
  chapter list, and volume ± (`lib/preferences.ts` stores
  `bolingo.mediaVolume`, separate from the reward cue).
- **Reading mode** paginates the `.txt` word-safely, one page at a time, with
  ◀ / ▶ buttons and a page x / y indicator.

## Refreshing the shelves

```bash
node scripts/fetch-classics-clusters.cjs                       # all genre shelves
node scripts/fetch-classics-clusters.cjs --cluster=bestsellers # curated shelf only
node scripts/fetch-classics-clusters.cjs --pages=4 --max-books=40
node scripts/fetch-classics-clusters.cjs --dry-run             # counts, no writes
node scripts/fetch-loyalbooks-philosophy.cjs --catalog-only    # philosophy seed
```

`fetch-classics-clusters.cjs` walks the genre index first (`/genre/<slug>?Page=N`,
one page per second — the site is rate-limiting), then resolves only the books
that will actually be published. Starter audio stays under ~16 MB total so the
app binary remains store-friendly.

## Checks

```bash
node scripts/check-classics-audiobooks.cjs
```

Thirteen checks cover the shelf shape and id uniqueness, https-only links to the
allowed archives, per-shelf and narrated-share floors, the curated bestseller
rule in both directions, the public-domain list never containing a modern
author, one shelf per book, the app surface, route/icon/asset registration, the
premium copy, the one-book-per-day cap, the web text proxy and this doc.
Registered as `classics-audiobooks` in `content/quality/gates.json` (required),
it runs inside `npm test`.

## Web text proxy (`supabase/functions/fetch-text`)

LoyalBooks / Gutenberg / archive.org send no CORS headers, so a browser `fetch`
of a `.txt` dies with "Failed to fetch" while native (expo-file-system, no CORS)
works. On web only, `readTextFile` routes cross-origin text reads through the
`fetch-text` edge function (deployed with `--no-verify-jwt`, like the other
public webhooks): it allowlists those three hosts, accepts plain text only
(2 MB cap) and answers CORS. Native keeps the direct path.
