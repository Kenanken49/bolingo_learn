# Language catalog in Supabase

The language courses used to live only in TypeScript, so every typo fix, theory
rewrite or question replacement needed an app release. The catalog now has a
database home: Supabase is read first, and the bundled banks are the seed and
the offline fallback.

## What lives where

| Piece | Location | Role |
| --- | --- | --- |
| Lesson banks | `lib/languages.ts`, `lib/*-plus.ts` | Source of truth at build time, offline fallback at runtime |
| Migration + seed | [`supabase/migrations_language_catalog.sql`](../supabase/migrations_language_catalog.sql) | Creates the tables and inserts the 86 built-in lessons (generated) |
| Published transcript snapshot | [`content/published/language-lessons.offline.json`](../content/published/language-lessons.offline.json), [`lib/publishedTranscriptLessons.ts`](../lib/publishedTranscriptLessons.ts) | Reviewed release content for remote-only lessons, bundled so path nodes open offline |
| Loader | [`lib/languageCatalog.ts`](../lib/languageCatalog.ts) | Reads Supabase, validates rows, merges over the bundle, caches |
| Path | `lib/curriculum.ts` | Which lessons appear in which unit, and their order (still code) |
| Consumer | `src/app/quiz/[lessonId].tsx` | Loads the lesson through the catalog, so edits apply without a release |

Two tables:

- `public.language_courses` — `id`, `title`, `icon`, `blurb`, `position`,
  `published`, `updated_at`. Course metadata and lesson ownership.
- `public.language_lessons` — `id`, `course_id` (FK), `title`, `theory`
  (JSONB string array), `questions` (JSONB `CourseQuestion[]`), `position`,
  `published`, `updated_at`.

## One-time setup

The hosted Bolingo project already has this migration applied (6 courses, 86
built-in lessons, plus the published FSI transcript lesson `swahili-fsi-01`).
These steps are for a fresh environment or after rebuilding the database.

1. Run [`supabase/schema.sql`](../supabase/schema.sql) as usual.
2. Run [`supabase/migrations_language_catalog.sql`](../supabase/migrations_language_catalog.sql)
   in the Supabase dashboard → SQL editor. It is idempotent and safe to re-run.
3. Verify:

   ```sql
   select count(*) from public.language_lessons where published;  -- 86 built-in; 87 with swahili-fsi-01
   select course_id, count(*) from public.language_lessons where published group by 1 order by 1;
   ```

   Unpublished transcript drafts (if any) are excluded from these counts; see
   [docs/transcript-import.md](transcript-import.md). The hosted project has one
   published transcript lesson, so its Swahili published count is 21.

4. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` must already be
   set (the app uses them for everything else). No new secret is needed: reads
   go through the anon key and a public-read policy.

The app works before step 2 too. A missing table produces one console warning
and the bundled catalog is used, which is how the first-run/offline path is
tested.

## Editing a lesson without a release

Dashboard → Table editor → `language_lessons`, or SQL:

```sql
update public.language_lessons
set theory = jsonb_set(theory, '{0}', '"Samahani opens a request. Tafadhali softens it."')
where id = 'swahili-politeness';
```

- `theory` is a JSON array of strings (one string per paragraph).
- `questions` is a JSON array of objects:
  `{"prompt": "...", "correctChain": ["..."], "scrambledTokens": ["..."], "explain": "..."}`.
  Every `correctChain` token must exist in `scrambledTokens`, and `explain` is
  required — the same rules the build-time validator enforces.
- `title` is what the quiz header and results screen show; the lecture screen's
  path label still comes from `lib/curriculum.ts`.
- `position` orders the row for future catalog screens; the quiz route itself is
  addressed by lesson id.

The loader caches for **five minutes**, so an edit appears on the next quiz open
after that window (or after an app reload). Reopening a quiz inside the window
serves the cached copy.

**Rolling back.** `published = false` hides the row from the app. A built-in
lesson falls back to its bundled bank; a transcript lesson has no bank, so it
is hidden online while the released offline snapshot remains the fallback for a
device that cannot read the catalog. To restore edited content, set
`published = true` again. To go back to a shipped version of a lesson, copy it
from the bank; the seed itself never overwrites existing rows.

## Adding a brand-new lesson

Adding a row is not enough to make it appear in the path: `lib/curriculum.ts`
decides which lessons exist on the learning path and in what order. Create the
lesson in Supabase if you like, but point a path block at it in a release. That
is deliberate — path shape (locking, XP, review placement) is product logic,
while lesson content is editorial.

A **remote-only** lesson (a reviewed transcript draft) is not copied into the
generated seed. Register it in
[`content/published/language-lessons.json`](../content/published/language-lessons.json)
with `published: true` and `onPath: true`, then point the curriculum block at
its id. Also copy the reviewed content into
[`content/published/language-lessons.offline.json`](../content/published/language-lessons.offline.json);
that snapshot ships with the app and is what resolves the path node when the
catalog cannot be read. `check:catalog` validates that the id exists in a
committed draft, is not shadowing a built-in lesson, is present in the path,
and has a valid offline snapshot. This keeps `swahili-fsi-01` out of the
86-lesson generated migration while still making the path auditable and
openable offline.

If an id is already on the path, editing its published row is all that is
needed while online. When the content changes, update the offline snapshot in
the same release. Supabase stays authoritative whenever it answers: a
successful remote read that omits an unpublished transcript lesson keeps it
hidden online, while the released snapshot remains the offline fallback.

## Security model

- RLS is enabled on both tables. `select` is allowed only for `published` rows;
  there are no insert/update/delete policies for `anon` or `authenticated`.
- `anon` and `authenticated` get `select`; `service_role` gets writes. Editing
  happens in the dashboard (which runs as an admin) or with a server-side key.
- Never put a service-role key in `EXPO_PUBLIC_*` variables — anything with that
  prefix is shipped to the browser.

## Failure behavior

| Situation | Result |
| --- | --- |
| Supabase not configured | Bundled catalog, no network call |
| Table missing / RLS error / 404 | Bundled catalog + one console warning; retried after 30s |
| Network hangs | Same, after a 2s timeout |
| Table empty (migration not run) | Bundled catalog, re-checked after 5 minutes |
| One malformed row | That lesson falls back to the bundle; the rest load from the DB |
| Published transcript lesson while offline | Its reviewed snapshot in the bundled catalog opens the path node without a catalog read |
| Published transcript lesson unpublished online | Hidden by the successful remote read; released offline snapshot is not merged |

Multiple-choice questions store one token in `correctChain`; build questions
store the ordered token chain. Both are validated before use, so a half-finished
row cannot break a learner's quiz.

## Regenerating and checking

The SQL is generated — do not hand-edit it:

```bash
npm run catalog:sql     # rewrites supabase/migrations_language_catalog.sql
npm run check:catalog   # seed parity, solvable questions, path coverage, RLS
npm test                # includes check:catalog
```

`check:catalog` fails when a lesson was added to a bank but the migration was
not regenerated, when a question's answer token is missing from its bank, when
a path block points at an unseeded lesson, or when the public-read policies and
grants disappear.

## Draft lessons from transcripts

Not every new lesson starts as a TypeScript bank. Open-licensed transcripts can
be turned into unpublished rows with
[`scripts/import-language-transcripts.cjs`](../scripts/import-language-transcripts.cjs);
the first set is five FSI Swahili dialogues. Drafts are inserted with
`published = false`, carry their source attribution in the theory, and stay off
the learning path until reviewed. See
[docs/transcript-import.md](transcript-import.md) for the format, the review
workflow and the `check:transcripts` guard.
