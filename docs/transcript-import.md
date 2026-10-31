# Transcript import → draft lessons

The transcript importer turns a short, translated dialogue transcript into
reviewable language-lesson drafts. It accepts the JSON format below as well as
`.srt` and `.vtt` subtitle files. It exists so course material can be drafted
from an **open-licensed** source without hand-building a lesson bank, while
keeping a human review step between the source and the learning path.

The first transcript is the 1963 **FSI Swahili Basic Course**, a US government
work in the public domain. Its dialogues are reproduced from the Internet
Archive OCR and normalized; summaries, quiz prompts, distractors and
explanations are original Bolingo Learn writing.

## Pipeline at a glance

| Piece | Location |
| --- | --- |
| JSON transcript | [`content/transcripts/swahili/fsi-swahili-basic-course.json`](../content/transcripts/swahili/fsi-swahili-basic-course.json) |
| Subtitle input | `.srt`/`.vtt` plus a `<name>.import.json` sidecar |
| Parser + generator | [`scripts/import-language-transcripts.cjs`](../scripts/import-language-transcripts.cjs) |
| JSON guard | [`scripts/check-transcript-import.cjs`](../scripts/check-transcript-import.cjs) |
| Subtitle guard | [`scripts/check-subtitle-import.cjs`](../scripts/check-subtitle-import.cjs) |
| Reviewable drafts | [`content/drafts/fsi-swahili-basic-course.drafts.json`](../content/drafts/fsi-swahili-basic-course.drafts.json) |
| Unpublished seed | [`supabase/drafts_swahili_fsi.sql`](../supabase/drafts_swahili_fsi.sql) |

The SQL inserts every row with `published = false`. Nothing generated here is
visible to learners. Re-running the import updates unpublished drafts only, so
a lesson an editor has published is never overwritten by a later source change.

## JSON transcript format

A JSON transcript is one file containing source metadata and lessons made of
translated dialogue lines:

```json
{
  "source": {
    "id": "fsi-swahili-basic-course",
    "title": "FSI Swahili Basic Course",
    "publisher": "Foreign Service Institute (U.S.)",
    "year": 1963,
    "url": "https://archive.org/details/swahilibasiccour00fore",
    "license": "Public domain (U.S. Government work)",
    "attribution": "Foreign Service Institute (U.S.), Swahili Basic Course, 1963.",
    "courseId": "swahili",
    "language": "sw"
  },
  "lessons": [
    {
      "id": "swahili-fsi-01",
      "title": "FSI 1 · Morning greetings",
      "summary": "Two men greet each other in the morning...",
      "dialogue": [
        { "speaker": "Mutisya", "sw": "Jambo, bwana.", "en": "Hello, sir." },
        { "speaker": "Sangai", "sw": "Jambo.", "en": "Hello." }
      ]
    }
  ]
}
```

Rules the importer enforces:

- `source.license` must name a public-domain or Creative Commons licence.
- `source.url`, `source.attribution` and `source.courseId` are required; the
  generated theory carries the attribution into every draft.
- Lesson ids must be unique and start with `<courseId>-`, so the quiz loader
  recognises them as that course's lessons.
- Each lesson needs at least two dialogue lines, each with `speaker`, `sw` and
  `en`. The Swahili line is the source text; the English line is the
  translation used to generate questions and theory.
- Summaries are optional but recommended; they become the first theory
  paragraph.

### Generic example names

Both JSON transcripts and subtitle sidecars accept an optional top-level
`nameMap`. It is an explicit allowlist of generic example names to replace
with the platform cast:

```json
"nameMap": {
  "Juma": "Bingo",
  "Maria": "Livia",
  "Amina": "Zora"
}
```

The map is applied to the lesson title and summary, speaker labels, and the
Swahili and English dialogue before theory and questions are generated. Source
metadata, including attribution and real names in it, is never changed. The
match is whole-word and case-insensitive, so a map for `Juma` does not touch
`Jumamosi`, and an unmapped name such as `Neema` stays exactly as written.

Values must be `Livia`, `Bingo` or `Zora`; those character names cannot be used
as keys. Only list invented or generic example names. Never list a real author,
historical figure, public person, or a person named in the source — leave the
name out of the map so it is preserved.

## SRT and VTT video transcripts

Point the importer at a `.srt` or `.vtt` file. It looks for a sidecar manifest
at `<subtitle-name>.import.json`, or at the path passed with `--manifest`:

```json
{
  "source": {
    "id": "swahili-video-greetings",
    "title": "Licensed Swahili video — greetings",
    "url": "https://example.com/licensed-video",
    "license": "CC BY 4.0",
    "attribution": "Example Language School, Swahili greetings video, 2026.",
    "courseId": "swahili",
    "language": "sw"
  },
  "defaultSpeaker": "Livia",
  "nameMap": {
    "Juma": "Bingo",
    "Maria": "Livia"
  },
  "translations": {
    "1": "Hello, how are you?",
    "2": "I am fine, thank you."
  },
  "lessons": [
    {
      "id": "swahili-video-greetings-01",
      "title": "Greetings",
      "summary": "Livia and Bingo greet each other.",
      "start": "00:00:00",
      "end": "00:02:30"
    }
  ]
}
```

The sidecar is required: a subtitle file does not carry a licence, attribution,
course id or editorial lesson boundaries. `source` follows the same required
fields and open-licence rule as a JSON transcript. The importer adds
`mediaType: "video"` when it is absent, so the generated theory identifies the
licensed video transcript rather than a public-domain course text.

A bilingual SRT cue can be as small as:

```srt
1
00:00:00,000 --> 00:00:03,000
Livia: Habari yako! | Hello!
```

Rules for the sidecar and subtitle:

- Each lesson needs `id`, `title` and, when there is more than one lesson,
  `start` and `end`. A single lesson may omit both and use the whole file.
  Ranges are inclusive of the start and exclusive of the end, and they may not
  overlap. A lesson needs at least two cues.
- `translations` is optional and keyed by the cue's 1-based order in the file.
  It is for monolingual captions: the whole cue is treated as Swahili and the
  map supplies the English line. For bilingual cues, omit the map entry.
- `nameMap` is optional and follows the same generic-example allowlist as the
  JSON format. It applies to speakers and dialogue before draft generation.
- Each cue can be written as `Swahili | English`, as two lines (Swahili first,
  English second), or with `SW:` and `EN:` labels. A cue may start with a
  speaker (`Livia: ...`), or a VTT cue may use `<v Livia>`. Otherwise the
  lesson's `defaultSpeaker`, the sidecar's `defaultSpeaker`, or `Narrator` is
  used.
- SRT comma timestamps and VTT dot timestamps are both accepted, along with
  VTT cue settings, `NOTE`/`STYLE`/`REGION` blocks, inline tags and common HTML
  entities. A cue without English text and without a `translations` entry is
  rejected rather than guessed.

### What the generator writes

For every lesson:

- **Theory** — the summary, every dialogue line as
  `Speaker: “Swahili” — English`, and a source/licence paragraph.
- **Questions** — up to five, all answerable from the dialogue:
  1. an English-meaning multiple choice for the opening line;
  2. a BUILD question for another line;
  3. a response question for the first real `?` exchange;
  4. a second meaning question;
  5. a second BUILD question.
  Distractors come from other lines in the transcript, and BUILD tokens include
  the exact answer tokens plus distractor words. Every question has an
  explanation.

The generated JSON is validated with the app's own `toCourseLesson()` before it
is written, so a draft that the quiz loader would reject never reaches SQL.

## Commands

```bash
# Generate (or refresh) the draft JSON and SQL. Does not touch Supabase.
node scripts/import-language-transcripts.cjs

# Generate, then apply the SQL through psql using BOLINGO_DATABASE_URL
# (or the same key in .env). Applies drafts only; never publishes them.
node scripts/import-language-transcripts.cjs --apply

# Import a licensed video transcript. The sidecar is <file>.import.json unless
# --manifest points somewhere else.
node scripts/import-language-transcripts.cjs content/transcripts/swahili/video.srt
node scripts/import-language-transcripts.cjs content/transcripts/swahili/video.vtt --manifest content/transcripts/swahili/video.import.json

# Validate committed JSON drafts, generated SQL, licences and publication flags.
node scripts/check-transcript-import.cjs

# Validate SRT/VTT parsing, sidecar boundaries, translations and draft output.
node scripts/check-subtitle-import.cjs
```

`npm run check:transcripts` and `npm run check:subtitles` are the same guards,
and both run inside `npm test`. `npm run transcripts:import` and
`npm run transcripts:apply` wrap the generate and generate-plus-apply commands
for the first JSON transcript.

A subtitle import writes the same two outputs as a JSON import, named from the
sidecar's `source.id`: `content/drafts/<source-id>.drafts.json` and
`supabase/drafts_<course>_<short>.sql`. Nothing is published.

`--apply` is optional: the generated SQL can also be pasted into the Supabase
dashboard → SQL editor. It is idempotent and starts with a check that the
`swahili` course exists.

## Reviewing and publishing a draft

1. Open Supabase → Table editor → `language_lessons` and filter
   `published = false` plus the source's id prefix (for example
   `swahili-fsi-%` or `swahili-video-%`).
2. Read the theory and questions. A draft is deliberately not on the learning
   path yet.
3. To preview it in the app, set `published = true` for one row and open
   `/quiz/<id>` (for example `/quiz/swahili-fsi-01`). The quiz loader prefers
   the published row over the bundle.
4. Record the publication in
   [`content/published/language-lessons.json`](../content/published/language-lessons.json)
   with its source, review date and `onPath` flag. Then copy the reviewed
   `title`, `theory`, `questions` and `position` into
   [`content/published/language-lessons.offline.json`](../content/published/language-lessons.offline.json).
   That snapshot is bundled with the app, so the path node still opens when the
   catalog cannot be read. `check:catalog` fails if a published transcript
   lesson is missing from the snapshot, if the snapshot is malformed, or if the
   two files disagree on title or position.
5. To put it on the path, add a path block in `lib/curriculum.ts` in a release;
   path shape (locking, XP, review placement) is product code, not editorial
   content.
6. If the source transcript or sidecar changes later, run the importer again.
   Unpublished drafts are refreshed; published lessons keep their content.

The publication SQL is a separate editorial step, not part of the generated
draft file. Keep it beside the draft seed so the change is reproducible, for
example [`supabase/publish_swahili_fsi_01.sql`](../supabase/publish_swahili_fsi_01.sql).
The generated JSON and SQL stay `published = false`; `check:transcripts` fails
if either starts publishing rows.

## Source and licence rules

- Prefer public-domain, CC0 or CC BY material. Record the URL, licence and
  attribution in the transcript.
- Do not import a commercial audiobook, a YouTube upload without a written
  licence, or any transcript whose terms you have not checked. The same rule
  applies to video subtitles: keep the licence and attribution in the sidecar
  next to the `.srt`/`.vtt` file.
- The transcript supplies the dialogue and may add an original summary. The
  importer writes the theory paragraphs and quiz questions; review them for
  accuracy and tone before publishing.
- Keep a short dialogue excerpt, not a whole book. The FSI source is a scanned
  public-domain course; the checked-in file is a normalized excerpt, not the
  archive's 700 KB OCR dump.

## Current draft set

Five FSI dialogues are checked in:

| Id | Topic | Source unit | Status |
| --- | --- | --- | --- |
| `swahili-fsi-01` | Morning greetings | Unit 1 | **Published** · path workshop |
| `swahili-fsi-02` | Daytime greetings | Unit 2 | Draft |
| `swahili-fsi-03` | Evening greetings | Unit 3 | Draft |
| `swahili-fsi-04` | Greeting a lady | Unit 4 | Draft |
| `swahili-fsi-05` | Breakfast at the hotel | Unit 8 | Draft |

Each generates five questions (25 total). Only `swahili-fsi-01` is published;
the other four remain invisible until an editor reviews them.

### Published: FSI 1 · Morning greetings

`swahili-fsi-01` was reviewed against the source dialogue and published on
30 October 2026. It appears on the Swahili path after **Greetings & replies** as
the **FSI morning greetings** workshop.

The generated Q2 asked “Say ‘Hello.’ in Swahili” and offered `Habari` as a
distractor. That is ambiguous because `Habari` is itself a greeting, so the
published question uses the dialogue line instead: “Mutisya says ‘_____,
bwana.’ Which word completes his greeting?” with `Jambo` as the answer. The
fix lives in the publication SQL, not the generated draft, so re-running the
importer still produces the same reviewable draft.

Published remote-only lessons are not in the generated seed, but the reviewed
snapshot ships in the bundled offline catalog. On a cold or offline start the
loader falls back to the bundle and the FSI path node still opens without a
catalog read. When Supabase answers, its published row is authoritative: if the
row is unpublished there, it stays hidden online.
