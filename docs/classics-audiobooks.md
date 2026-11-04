# Philosophy Classics (premium offline library)

The Classics Library (`src/app/audiobooks.tsx`, route `/audiobooks`) is the
premium section's seeded audiobook shelf: every public-domain philosophy book
LoyalBooks lists, with full narration and ebook text, readable and playable
offline after download.

## Sources (public domain, US)

- Catalog, taxonomy: https://www.loyalbooks.com/genre/Philosophy?type=all
- Audio: LibriVox narrations hosted on archive.org (`_64kb.mp3` chapters).
- Text: Project Gutenberg / LoyalBooks-hosted `.txt` ebooks.

LibriVox recordings and Gutenberg texts are public domain in the US, which is
why this shelf ships inside the app with no per-file rights paperwork. This is
different from learner uploads: audio/video a learner uploads still requires
the content-rights checklist (`docs/content-rights.md`) because a private
recording can carry a speaker's voice and a publisher's rights. The reader
screen labels every text "public domain" and every row keeps its LoyalBooks
source URL.

## Taxonomy mirrors LoyalBooks

Each book page carries a **"Genres for this book"** table and the catalog
stores it verbatim in page order (`genres: string[]`, e.g. Anthem →
Fiction, Philosophy, Science fiction, Literature, …). The app:

- filters with one chip per LoyalBooks genre (`genreCounts()`),
- groups the "All" view under each book's **primary genre** (first listed),
- searches title, author and genre together.

Re-scraping preserves this: `scripts/fetch-loyalbooks-philosophy.cjs`
extracts the genre table on every book page.

## Offline model

- `assets/audiobooks/philosophy-catalog.json` (145 books, each with its exact LoyalBooks cover image URL) ships in the bundle:
  browsable with no network.
- Starter shelf ships in the bundle: 12 ebook texts (`texts/`) + 2 complete
  short audiobooks (`audio/`), mapped by `assets/audiobooks/seed.ts`
  (Metro needs literal `require()` calls — generated, never hand-edited).
- Everything else downloads on demand into
  `documentDirectory/classics/<slug>/` (text + `_64kb.mp3` chapters, chapter
  list via `https://archive.org/metadata/<archiveId>`, cached as
  `manifest.json`) and then reads/plays fully offline.
- Bundled assets resolve to `file://` via `expo-asset` + copy, so playback
  and reading never depend on the Metro server in production builds.
- `metro.config.js` pins `txt`/`mp3` as asset extensions so the shelf bundles.

## Layout: Listen to Audiobook Mode + Books Library

The screen is two stacked sections sharing one search / genre / offline
filter:

- **Listen to Audiobook Mode** (top, audio-first): every narrated book with
  the Listen button first; streaming stays unlimited.
- **Books Library** (below, text-first): every ebook with the Read button
  first.

## Second collection: archive.org (deduped, curated)

`scripts/fetch-archiveorg-philosophy.cjs` extends the shelf with archive.org
LibriVox recordings the LoyalBooks seed missed (top downloads for
`collection:librivoxaudio + subject:philosophy`):

- **Filters out what we already have** (by archiveId), then curates: no
  single-poem recordings, no omnibus samplers, no mistagged pulp, English only.
- **Verifies** every candidate (real `_64kb.mp3` chapters, title/creator,
  cover art via `archive.org/services/img`, optional Gutenberg link) and
  drops duplicate recordings of the same work (keeps the most-downloaded).
- New entries carry `source: 'archive.org'`, link their archive.org details
  page, and stream/download on demand exactly like the seed — nothing new is
  bundled. Most are audio-only (LibriVox items rarely ship ebook text), so
  they shelve under Listen to Audiobook Mode with LoyalBooks-mapped genres.

## Covers are the LoyalBooks artwork

Every row, the player header and the reader header show the book's
`cover` image — the exact artwork from its LoyalBooks page
(`https://www.loyalbooks.com/image/…`). Online it streams from LoyalBooks;
downloading a book also caches its cover beside the text and audio
(`cover.jpg` via `localCoverUri`), so the shelf keeps its artwork offline.

## In-app media player (full sequential playback)

Tapping Listen opens a full-screen in-app media player (`AudiobookPlayer` in
a modal, `components/AudiobookPlayer.tsx`):

- **Plays the book in full, in order, no skipping**: the chapter queue is
  index-sorted (the downloaded sequence) and every part auto-advances into
  the next until the last part ends. No shuffle, no wrap-around, Next stops
  at the final chapter.
- Standard audiobook controls: play/pause, previous/next chapter (Prev
  restarts the chapter when a few seconds in), −15s / +30s jumps, and a
  tap-to-seek progress bar with elapsed / total time per chapter.
- Playback speed (0.75×–2× via `player.playbackRate`), a sleep timer
  (off / 15 / 30 / 45 / 60 min), and the full chapter list with the current
  part highlighted and each part marked offline/streaming.

## Reading mode (ebooks)

Tapping Read opens a full-screen reading mode for the ebook text (Project
Gutenberg / LoyalBooks `.txt`, public domain): word-safe pages that never
split a word, one page on screen at a time, and **two arrow buttons** — ◀
previous page, ▶ next page — with a page x / y indicator. Every page turn
starts at the top of the new page.

## Premium gate: 1 book download per day

Read / Listen / Download require `profiles.is_premium`. Free and signed-out
learners get the shelf preview + upsell (`/paywall`, `/auth`). The home path
links the shelf under "Classics Library"; the route is registered in
`src/app/_layout.tsx`.

Downloads are capped at **1 book per day** (`lib/classicsDailyLimit.ts`,
AsyncStorage stamp `{ date, slug, title }` on the local calendar day): the
first download stamps the day, re-downloading or resuming that same book
stays free, and books already offline never count — the next new book
unlocks tomorrow. The header names today's pick when the day is spent.

## Refreshing the seed

```bash
node scripts/fetch-loyalbooks-philosophy.cjs            # full re-scrape
node scripts/fetch-loyalbooks-philosophy.cjs --catalog-only
node scripts/fetch-loyalbooks-philosophy.cjs --max-books 6   # smoke test
```

Existing files on disk are skipped; `philosophy-catalog.json` and `seed.ts`
are rewritten at the end. Keep the starter audio shelf under ~16 MB total so
the app binary stays store-friendly.

## Checks

```bash
node scripts/check-classics-audiobooks.cjs
```

Validates the catalog shape + LoyalBooks taxonomy, the seed manifest against
the files on disk, the library API surface, route/home/paywall wiring, the
premium gate, the web text proxy, and this doc. Runs inside `npm test` as
`npm run check:audiobooks`.

## Web text proxy (`supabase/functions/fetch-text`)

LoyalBooks/Gutenberg/archive.org send no CORS headers, so a browser `fetch`
of a `.txt` dies with "Failed to fetch" while native (expo-file-system, no
CORS) works. On web only, `readTextFile` routes cross-origin text reads
through the `fetch-text` edge function (deployed with `--no-verify-jwt`, like
the other public webhooks): it allowlists those three hosts, accepts plain
text only (2 MB cap), and answers CORS. Native keeps the direct path.
