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
voices* where the same language is spoken by both (English lessons get a
`model` lane and a `narrator` lane).

## Voice selection

`resolveVoice()` builds a ranked list per language:

1. Voices whose base locale matches the target (`es`, `fr`, `de`, `sw`, `en`),
   ordered by the preset's regional preference (`es-MX` → `es-US` → `es-ES`).
2. `VoiceQuality.Enhanced` and names containing `enhanced|premium|neural|natural`
   score higher; known engines (Google, Microsoft, Siri…) get a small bonus.
3. Novelty voices (Whisper, Zarvox, Bells, Bad News…) are excluded — they are
   never acceptable for teaching pronunciation.
4. If no native voice exists, a **related** voice may stand in: Swahili uses the
   same five pure vowels as Italian and Spanish, so those voices land far closer
   than an English voice reading "Habari". The UI labels this as approximate.
5. If the platform exposes no voice list at all (common on web before
   `voiceschanged`), the engine still asks for the right locale and lets the OS
   choose, rather than defaulting to the UI language.

Presets live at the top of the file. Adding a language means adding one
`LanguagePreset` and a `PRESETS` entry — `languageForLesson()` keys off the
lesson id prefix (`spanish-*`, `french-*`, …).

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
accent.

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
   Spanish locale), pitch `1`, rate `0.86`; 🐢 must be `0.62`.
3. Open an English lesson: Livia and Bingo should use different installed voices.
4. Answer a question wrong: after the cue, Livia repeats the correct phrase slowly.
5. Sweep the banks: every question must resolve to a non-empty phrase with no
   `___`, quotes, glosses or markup. A temporary `/pronounce-check` route was
   used for this during development (314 questions, 0 issues); recreate it from
   `phraseForQuestion()` if the banks change substantially.
