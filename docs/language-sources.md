# Language content sources

The Spanish, French and German expansion adds original lessons on questions,
negation and health/emergencies. The material was written for Bolingo; the
sources below informed topic order and vocabulary only.

## Public-domain course outlines

The **FSI Basic Courses** for Spanish, French and German are US government
material in the public domain, hosted by the Live Lingua Project:

- https://www.livelingua.com/fsi/
- https://www.fsi-language-courses.org/

They were used to confirm the order of beginner topics — greetings and
politeness, numbers and time, food, travel, family, present verbs, past
stories, then questions and practical health language. No FSI lesson text is
reproduced in the app.

## YouTube and channel listings

Beginner playlists and channel descriptions were checked for sequencing only:

- 3 Minute Languages: https://www.youtube.com/@3MinuteLanguages
- “FREE Spanish Course for Beginners — All 200 Lessons!”:
  https://www.youtube.com/playlist?list=PLGt9uY8s2l54n7MbzPyEfjUpRlPdbytzL
- Easy German beginner playlist:
  https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ
- French channel recommendations:
  https://www.mosalingua.com/en/the-5-best-youtube-channels-to-learn-french/

No video or audio was downloaded, transcribed, captioned or copied. The search
was used to answer “what do beginners meet first?”, not “what should the lesson
say?”.

## Licensed Swahili phrase video

The project owner confirmed on 29 October 2026 that permission has been obtained
to use **“Learn Swahili While You Sleep — Most Important Swahili Phrases and
Words”** by Eko Languages (YouTube, 2018;
<https://www.youtube.com/watch?v=kUcbme3qSIg>) as source material for Swahili
course development.

What was used:

- The eight-hour upload is a one-hour loop. The unique hour was read from the
  video's own on-screen phrase cards (one frame every ten seconds, OCR), and the
  first three minutes were transcribed with a local `faster-whisper` model to
  cross-check the audio against the cards.
- Only short Swahili/English phrase pairs informed vocabulary and topic choice.
  The lessons, theory, prompts, distractors and explanations are original
  Bolingo writing. No video, audio or transcript file is committed or shipped.
- Spellings were normalised to standard Swahili where the cards or OCR were
  inconsistent: `Kunradhi` → `Kumradhi`, `Asanti` → `Asante`, `Uhisipania` →
  `Hispania`, `ljumaa` → `Ijumaa`. Colloquial forms (`Niko na…`, `Uko na pesa?`,
  `Unaongea…`) are named as colloquial in the theory rather than taught as the
  default.
- Four lessons were added from the gaps the video covered: Politeness &
  Sympathy, Introductions & Origins, Languages & Understanding, and Money &
  Bargaining (`lib/swahili-plus.ts`), plus their path nodes in
  `lib/curriculum.ts`.

## Provenance rules

1. Prefer public-domain, CC-licensed or openly licensed material, and record
   the URL and license next to the source.
2. Never ingest a commercial audiobook or a third-party teaching video without
   written permission from the rights holder. A YouTube upload is not a
   license.
3. Write the prompts, theory and distractors ourselves. A source can suggest a
   topic; it cannot supply the quiz text verbatim.
4. Keep every lesson solvable: run the language-bank validator after editing
   (`validateBank` runs at import, and the checks in the repository compile the
   banks and execute them).
5. Voice work uses the platform's installed voices and the shared
   `lib/pronunciation.ts` presets. There is no model training or voice cloning
   in this project; a licensed external voice can be configured through the
   audiobook TTS secrets instead.

## Pronunciation coverage

`lib/pronunciation.ts` now recognises the new Spanish, French and German
vocabulary (`médico`, `farmacia`, `duele`, `médecin`, `pharmacie`, `mal`,
`Arzt`, `Apotheke`, `Kopfschmerzen`, `nicht`, `kein`…) in quoted target spans.
Question intonation already covers `dónde/cuándo/por qué`, `où/pourquoi/quand`
and `wo/wann/warum/wer/was`.
