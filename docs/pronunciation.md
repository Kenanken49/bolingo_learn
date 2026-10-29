# Pronunciation engine — Livia & Bingo

Language lessons are the one place where a wrong voice teaches a wrong sound, so
`lib/pronunciation.ts` owns every spoken phrase in a language course. The goal is
Duolingo-grade delivery: each word is pronounced by a voice native to the
language being taught, and the character only changes *how* it is delivered, not
*what* is delivered.

Everything runs on-device through `expo-speech`: no API key, no per-play cost,
and it keeps working offline once a system voice is installed. These are the
operating system's own voices, so the app cannot fine-tune or clone them.
"Tuning" here means casting the right installed voice, matching the locale,
normalizing the text, and shaping pace and intonation — not training a model.

## Swahili specifics

Swahili shares the five pure vowels of Italian and Spanish, so the preset asks
for `sw-KE` → `sw-TZ` → `sw-UG` → `sw` and falls back to Italian, then Spanish,
only when no Swahili voice is installed. Two details make the new beginner
lessons sound right:

- **Question contour without a mark.** `Je, unakwenda sokoni` is recognized as a
  question from `je`, `wapi`, `nini`, `lini`, `nani`, `gani` and `kwa nini`, so
  the engine lifts at the end even when the bank omitted the `?`.
- **Target-span detection.** `TARGET_CLUES.sw` includes the new lesson
  vocabulary (`sipendi`, `hatuna`, `hakuna`, `mzuri`, `vikubwa`, `naumwa`,
  `nisaidie`, `daktari`…), so a quoted Swahili phrase is spoken by the Swahili
  voice even when the surrounding prompt is English.

English uses `en-US → en-GB → en-KE → en-AU → en`; the Kenyan English voice is
third in line so East African learners still hear a familiar accent when it is
installed.

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
| Zora | build coach | 1.0 | 0.93 | 0.70 |

Character distinction comes from pacing and from picking *different installed
voices*: every language has a `livia`, a `bingo` and a `zora` lane, so a phone
with several acceptable Spanish voices hears different Spanish speakers instead
of one robot at three speeds. When only one voice exists, everyone shares it and
pacing carries the difference.

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

Casting is explicit: **Livia and Zora are women, Bingo is a man.** `pickBest()`
first keeps the native voices whose platform name reads as the character's
gender (Samantha, Zira, Paulina… for the women; David, Daniel, Jorge… for
Bingo), and only then ranks them by quality. If no voice of that gender is
installed, it falls back to the full native pool — an unnamed Android voice or a
single installed voice still gets used, because a character with the wrong
voice is better than a silent lesson. The name lists live next to
`CHARACTER_GENDER` in [lib/pronunciation.ts](../lib/pronunciation.ts).

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

## Zora, the build coach

Zora speaks in the project runner (`/project/[lessonId]`): the speaker button
beside her hint reads the exact line on the card, so the learner can hear
"2 of 3 stories still failing…" instead of decoding it. Hints contain real HTML
(`Add <a href=…>See cats</a>.`), and `spokenPhrase()` strips the tags before
speaking — otherwise the engine reads tag names or falls over the angle
brackets. Zora uses the feminine casting lane and stops speaking when the screen
unmounts.

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

## Speak-back practice

Every language exercise offers **Say it back** (`components/SpeakBack.tsx`).
Recognition is handled by the device: `expo-speech-recognition` binds to
`SFSpeechRecognizer` on iOS, `SpeechRecognizer` on Android, and the Web Speech
API in the browser. The app asks for microphone + speech permission on the first
tap. The audio is never uploaded: it stays in the cache directory (native) or
in a tab-scoped blob URL (web) only long enough to replay the attempt, and is
deleted when a newer attempt replaces it or the exercise closes.

### Replaying your attempt

A transcript cannot tell a learner that their `r` sounds like an `l`, so the
result card offers the real recording: **Your attempt** plays your take and
**Hear Livia** plays the model beside it. One voice at a time — starting the
model pauses your recording, and starting yours stops Livia.

The recognizer owns the microphone, and opening a second recorder session on
native fights it for the audio route, so `lib/attemptAudio.ts` takes the audio
from the recognition session itself:

- **Native** asks for `recordingOptions.persist` (Android 13+, iOS): the
  recognizer writes a WAV into the cache and the `audioend` event returns its
  URI. `supportsRecording()` gates the option, so older Android simply has no
  replay button instead of a dead one.
- **Web** cannot persist from the browser recognizer, so a `MediaRecorder` taps
  the same microphone while it listens and hands back a blob URL.

A new attempt pauses and deletes the previous recording before opening the
microphone, so a score is never paired with the wrong voice. The button's
playing state is polled from the live player (expo-audio emits no play/end
status on web), and leaving the exercise cancels an in-flight recording and
discards the file.

The transcript goes through [lib/speakBack.ts](../lib/speakBack.ts):

- tokens are lowercased, stripped of punctuation and accent-folded for
  comparison, so `donde esta el bano` matches `¿Dónde está el baño?`;
- Levenshtein alignment over words finds matches, substitutions, omissions and
  insertions;
- an exact word counts 1; an accent-only match also counts 1 but shows amber;
  a substituted word counts 0.5; an extra word subtracts 0.25; the credit is
  normalized to 0–100;
- `maxAlternatives: 3` means the best-scoring alternative wins, so one misheard
  word in the first guess doesn't fail an otherwise correct answer;
- bands: ≥90 great, ≥75 good, ≥50 almost, below that again.

**What it is not:** phoneme scoring. The recognizer collapses pronunciation to
words, so the UI labels the result "word match". A wrong word is caught; a
strong accent whose words are still recognized is (rightly) not. Real
phoneme-level assessment needs a pronunciation API such as Azure Speech
Pronunciation Assessment behind a server-side function; that adds a paid
dependency and should be a premium feature if it is ever added.

**Requirements:** a development build for native (Expo Go has no speech
recognizer); Chrome or Safari for web. Permission copy lives in `app.config.js`.
If the recognizer is missing, the mic is denied or nothing is heard, the card
explains it and the lesson stays playable.

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
3. Open an English lesson: Livia (woman) and Bingo (man) should use different
   installed voices — on Windows/macOS, a name like Zira/Samantha for Livia and
   David/Alex for Bingo.
4. Open `/project/rwd-cat-photo` and tap the speaker beside Zora's hint: a
   feminine voice should read the line with the HTML tags stripped.
5. Answer a question wrong: after the cue, Livia repeats the correct phrase slowly.
6. Speak-back: `node scripts/check-speak-back.cjs` (also in `npm test`). In a
   development build, open a language lesson, tap **Say it back**, say the
   phrase, and confirm the score and coloured words. Then confirm **Your
   attempt** replays your recording, **Hear Livia** pauses it, the label returns
   to *Your attempt* when playback ends, and **Try again** replaces it with the
   new take. On Android 12 or older the replay button should be absent. Deny the
   microphone permission once to see the explanation card.
7. Sweep the banks: every question must resolve to a non-empty phrase with no
   `___`, quotes, glosses or markup. A temporary `/pronounce-check` route was
   used for this during development (314 questions, 0 issues); recreate it from
   `phraseForQuestion()` if the banks change substantially.
