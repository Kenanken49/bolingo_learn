# Pronunciation engine — Livia & Bingo

Language lessons are the one place where a wrong voice teaches a wrong sound, so
`lib/pronunciation.ts` owns every spoken phrase in a language course. The goal is
Duolingo-grade delivery: each word is pronounced by a voice native to the
language being taught, and the character only changes *how* it is delivered, not
*what* is delivered.

Everything runs on-device through `expo-speech`: no API key, no per-play cost,
and it keeps working offline once a system voice is installed.

## Why pitch is fixed at 1.0

Earlier builds gave each character a pitch (Livia 0.97, Bingo 1.08). Pitch-shifting
a TTS voice moves its formants with it — the exact mechanism that makes a voice
sound foreign or robotic. Lily in Duolingo sounds like Lily because of her slow,
flat *delivery*, not because her vowels moved.

So:

| Character | Role | Pitch | Rate | Turtle |
| --- | --- | --- | --- | --- |
| Livia | language model | 1.0 | 0.86 | 0.62 |
| Bingo | narrator / questions | 1.0 | 0.98 | 0.80 |

Character distinction comes from pacing and from picking *different installed
voices*: every language has a `model` lane (Livia) and a `narrator` lane
(Bingo), so a phone with two acceptable Spanish voices hears two Spanish
speakers instead of one robot at two speeds. When only one voice exists, both
characters share it and pacing carries the difference.

## Voice selection

`resolveVoice()` builds a ranked list per language:

1. Voices whose base locale matches the target (`es`, `fr`, `de`, `sw`, `en`),
   ordered by the preset's regional preference (`es-MX` → `es-US` → `es-ES`).
2. `VoiceQuality.Enhanced`, names containing `enhanced|premium|neural|natural|wavenet|studio`,
   and Android/cloud voices (`-network`, `online`) score higher. Network voices
   are the neural ones on most Android phones; the compact `-local` fallback is
   penalised, as are the classic robotic engines (`eSpeak`, `Pico`, `SAPI`,
   `Eloquence`). Known good voices (Google, Microsoft, Siri, Samantha… ) get a
   small bonus.
3. Novelty voices (Whisper, Zarvox, Bells, Bad News…) are excluded — they are
   never acceptable for teaching pronunciation.
4. If no native voice exists, a **related** voice may stand in: Swahili uses the
   same five pure vowels as Italian and Spanish, so those voices land far closer
   than an English voice reading "Habari". The UI labels this as approximate.
5. If the platform exposes no voice list at all (common on web before
   `voiceschanged`), the engine still asks for the right locale and lets the OS
   choose, rather than defaulting to the UI language.

Livia additionally prefers a voice whose platform name reads as feminine
(Samantha, Zira, Paulina…). It is a nudge, never a filter: on Android most
voices have no name at all, and being understood beats being cast.

Presets live at the top of the file. Adding a language means adding one
`LanguagePreset` and a `PRESETS` entry — `languageForLesson()` keys off the
lesson id prefix (`spanish-*`, `french-*`, …).

## Human delivery

`expo-speech` has no SSML, so prosody is shaped in the text and in the rate
passed with each utterance. Two rules carry most of the human feel:

**Breath points.** `breathe()` inserts the small pause a speaker takes inside a
sentence:

- a comma before a clause link (`y`, `et`, `und`, `na`, `and`, `but`, `weil`…) when
  at least three words precede it — `"Yo como manzanas y bebo agua"` →
  `"Yo como manzanas, y bebo agua."`;
- short lists and numbers are left tight: `"pan y agua"`, `"treinta y dos"`;
- dashes, semicolons and colons become commas, because engines read them as a
  long mechanical hold (or say "colon"); times like `10:30` are untouched;
- the phrase stays a **single utterance**, so the engine's pitch keeps falling
  across the whole sentence instead of resetting at every chunk.

**Phrase-aware rate.** `humanRate()` eases one- and two-word utterances (a lone
`"Hola"` otherwise clips its last syllable) and phrases of seven words or more,
by 4% each, plus 3% when the sentence carries three or more pauses. Character
identity is untouched: Livia is still 0.86 and Bingo 0.98 on an ordinary
sentence, and the turtle replay still starts from 0.62 / 0.80.

Mixed-language prompts get a 220ms breath at each language switch, so
`"What does, ¿Cómo estás?, mean?"` sounds like one person changing language
rather than three clips butted together. Emoji, `#`, and markup are stripped
before speaking — several engines otherwise read their names aloud.

## Text preparation

`spokenPhrase()` turns authored content into something a speech engine can say:

- **Gaps are filled with the answer being taught**: `"___ hablo español."` is
  spoken as "Yo hablo español." — never "underscore underscore".
- **English glosses are dropped**: `(I speak Spanish.)`, `[bracketed notes]`.
- **Markup and arrows** become pauses.
- **Accents and `¿ ¡` are preserved** — they carry stress and intonation.
- **Terminal punctuation is added** when missing, so the engine falls in pitch
  instead of drifting upward; interrogatives get question intonation, including
  Spanish's opening `¿` ("Dónde está el baño" → "¿Dónde está el baño?").
- Ellipses (`…`) become a full stop; several engines otherwise hang on them.

`phraseForQuestion()` decides *what* to say:

- BUILD questions speak the assembled target sentence.
- Article questions speak the noun phrase the learner is choosing
  (*Which article goes with "niña"?* → "la niña"), because nobody says "la" alone.
- A gap question speaks the completed sentence.
- Otherwise the quoted target and the answer are scored (target orthography and
  vocabulary vs English function words) and the more target-like one wins.

`promptSegments()` splits a prompt into runs of English scaffolding and target
text, so "Bingo reads it" says the English in Bingo's voice and the quoted
phrase in the language's own voice instead of reading Spanish with an English
accent. It also trims a dangling scaffold after the quote: `"Gracias" means…`
is spoken as just the phrase, never as "Gracias. Means."

## In the lesson player

`components/GamifiedCodePlayer.tsx` wires the engine to the UI:

- The target phrase plays automatically when a language exercise opens
  (respecting the sound preference), like Duolingo's exercise audio.
- **Hear Livia** speaks the model phrase; the 🐢 button replays it slowly.
- **Bingo reads it** reads mixed prompts segment by segment.
- A wrong answer is followed by Livia saying the correct phrase slowly once the
  wrong-answer cue has landed.
- Starting any playback stops the previous utterance, and leaving the screen
  stops speech entirely.

## What this deliberately does not do

- No recorded native audio per sentence. Duolingo ships studio recordings; this
  app ships system voices, so quality depends on the voice packs installed on
  the device. The fallbacks exist to degrade gracefully, not to match a studio.
- No cloud TTS in the free path. `/roleplay`, narration and the audiobook
  explainer use their own premium paths (`lib/audiobook.ts`,
  `supabase/functions/process-upload`).
- No pitch tricks for character identity, for the reason above.

## QA checklist

1. `npx tsc --noEmit` and `npx eslint lib/pronunciation.ts`.
2. Open `/quiz/spanish-basics?title=Spanish%20Basics`; the phrase should play on
   open, and pressing **Hear Livia** must produce `es-MX` (or the best installed
   Spanish locale), pitch `1`, rate `0.86` on a three-word phrase, `0.83` on a
   one-word or seven-word phrase; 🐢 must be `0.62` / `0.60`.
3. Open an English lesson: Livia and Bingo should use different installed voices.
4. Answer a question wrong: after the cue, Livia repeats the correct phrase slowly.
5. Sweep the banks: every question must resolve to a non-empty phrase with no
   `___`, quotes, glosses or markup. A temporary `/pronounce-check` route was
   used for this during development (314 questions, 0 issues); recreate it from
   `phraseForQuestion()` if the banks change substantially.
