# Uploaded material: detection, audiobooks, revision packs

Every upload is read, classified, and turned into the artefact that helps most:
a **book** becomes a full audiobook, **notes** (and articles/transcripts) become
a **revision pack** covering the seven memorization techniques.

```
file ──► extract text ──► classify ─┬─► book      → narrate first page → last page
                                    ├─► notes     → revision pack (7 techniques)
                                    ├─► transcript→ revision pack
                                    └─► article   → revision pack
                                              │
                                              └─► quiz nodes (as configured)
```

## Detection

`supabase/functions/_shared/materialKind.ts` is pure and gate-tested. It reads
signals, not filenames:

| Signal | What it means |
|---|---|
| word count | 25k+ words is a book regardless of anything else |
| chapters | numbered/marked headings, or a title line above bullets |
| list density | 30%+ bullet lines means notes |
| sentence length | terse lines with sections means notes; long prose means a book/article |
| speaker turns | `Name: …` lines repeated → a transcript |

The verdict carries `confidence`, the `signals` that produced it, `chapters`
(with character offsets) and `primaryOutput` (`audiobook` or `revision`). The
app shows the evidence — "Notes · 412 words · 6 sections · 43% list lines" — so
a wrong guess is visible instead of silently changing the result. Both the kind
and the analysis are stored on `user_uploads.material_kind` /
`user_uploads.material_analysis`.

## Books → audiobook, start to end

| Behaviour | Detail |
|---|---|
| Coverage | The whole extracted text (up to 400k chars ≈ 60k words) is narrated, not a sample. |
| Chunking | Split on sentence boundaries into provider-sized parts (`MAX_TTS_CHARS`), ordered by part index. |
| Chapters | Headings become chapters with character offsets, stored in `lessons.content.material_analysis`. |
| Resume | A re-run lists the audio directory and skips parts that already exist, so a long book never pays twice. |
| Partial failure | A failed part is recorded in `audio_error` and left out of `audio_chunks` — never spliced in silently. |
| Quiz nodes | Still generated, but from `MAX_CURATION_CHARS` (60k) because a 4-question session never needs the whole book. |

Cost note: narration length is bounded by the extract window, not by a hidden
part cap. The old 24-part ceiling silently truncated anything past ~96k
characters; it now scales with the text.

## Notes → revision pack

`supabase/functions/_shared/revisionPack.ts` builds the pack **extractively**:
every card front/back, recall answer, mind-map leaf and palace fact is quoted
from the learner's own text. When a model is available (Premium + `LLM_API_KEY`)
it rewrites the wording and the result is merged over the deterministic pack and
validated — a model can improve the phrasing but can never remove a technique or
leave a hole.

| Technique | Field | What the learner does |
|---|---|---|
| 1. Active recall | `recall` | Reads the prompt, writes/says the answer, then reveals it. |
| 2. Spaced repetition | `reviewPlan` + `srsSeeds` | Follows day 1/4/7/14/30, or enrols the cards in the app's existing SRS queue. |
| 3. Flashcards | `flashcards` | Front = term; back = the sentence/bullets that define it; `source` is shown. |
| 4. Chunking | `chunks` | 4–5 items per group, drilled one group at a time. |
| 5. Mind map | `mindMap` | Centre = title, branches = sections, leaves = that section's key terms. |
| 6. Memory palace | `palace` | A fixed six-stop route; each stop holds one real fact. |
| 7. Teach it | `teachBack` | Explain out loud, tick off the must-mention checklist. |

Enrolment deliberately reuses `lib/srs.ts` (`gradeCard`) instead of adding a
second scheduler: two schedulers would give two different answers to "what is
due today". Cards are enrolled as not-yet-known, so they resurface tomorrow and
then follow SM-2 like every lesson card.

## Storage

`supabase/migrations_materials.sql`:

- `user_uploads.material_kind`, `user_uploads.material_analysis` — the verdict.
- `revision_packs(id, user_id, upload_id, lesson_id, kind, title, pack jsonb,
  generated_at)` — one pack per upload (unique index), RLS read/delete for the
  owner, **no client insert/update**: packs only come from the pipeline.

## Failure behaviour

| Situation | Result |
|---|---|
| Classifier unsure | Confidence is stored; the pack is built anyway and the app shows the evidence. |
| No LLM key / model down | Deterministic pack ships (`generated: false`, labelled "quoted from your text"). |
| `revision_packs` table missing | Upload still succeeds; the warning names the migration. |
| TTS part fails | Lesson is `ready`, `audio_error` explains, other parts still play. |
| Book rereun | Existing parts skipped; only missing parts are synthesized. |

## Verifying

`npm run check:materials` (also in `npm test` and `npm run gate`) covers
detection fixtures, all seven techniques, sourcing, chunk sizes, chapter
coverage, narration resume, schema and app wiring — offline, no model needed.

On a device: upload a chaptered PDF → upload row shows "Book · audiobook
ready" and the lesson player walks the parts; upload a notes file → "Notes ·
revision pack ready" and **Revision** opens the seven-tab screen.
