# Offline Kamusi — open data sources

These files power the offline 📖 Kamusi screen (`/dictionary`) and the
`lib/dictionary.ts` lookup. No network, no AI — bundled with the app.

## sw.json — Kiswahili → English (2,273 headwords)

- Source: FreeDict Swahili-English dictionary (`swh-eng` v0.4.4,
  compiled by Beata Wójtowicz, corrected by Piotr Bański, via xFried/Morris
  Fried Ergane data). https://freedict.org
- License: **GNU General Public License v2 or later** (see the `COPYING`
  notice inside the upstream release; header preserved in build).
- Format here: `[headword, part-of-speech, "sense 1 | sense 2"]` per row.
  Multiple rows may share a headword (one per part of speech) — the app
  shows every match.

## en.json — English → English (12,000 words)

- Source: **English WordNet 2024 (EWN)**,
  https://github.com/globalwordnet/english-wordnet — synset glosses for the
  most learner-relevant headwords: every single-token word of length ≤ 5
  plus the most polysemous longer words (common words have more senses).
- Format here: `[word, "pos. gloss | pos. gloss …"]`, max 3 senses/word.
- License/attribution: WordNet-derived data, used with attribution to the
  English WordNet project (see their repo for the exact license text).

## Rebuilding

`C:/Users/ADMIN/AppData/Local/Temp/builddict.cjs` (kept out of the repo)
parses the upstream dumps from `/tmp/dict` and regenerates these files.
Re-run it if upstream releases a newer FreeDict or EWN snapshot.

## Lesson content

Swahili/English lesson banks (`lib/swahili-plus.ts`, `lib/english-plus.ts`)
are **original Bolingo lessons** — example sentences and explanations written
for this app. Only the topic sequencing is informed by open curricula
(including the US-public-domain FSI Swahili Basic Course). No third-party
course text is copied.
