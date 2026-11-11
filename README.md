# Bolingo Learn

Fresh start: React Native (via Expo) + TypeScript, styled with NativeWind (Tailwind), backed by Supabase (Postgres + Auth), with Supabase Edge Functions for serverless logic.

## Stack

- **Frontend:** Expo SDK 58 + TypeScript — one codebase for iOS, Android, Web
- **Styling:** NativeWind v4 (Tailwind CSS v3)
- **Backend:** Supabase Postgres + Auth (`lib/supabase.ts`)
- **Serverless:** Edge Functions in `supabase/functions/` (Deno/TypeScript)

## Setup

1. Install deps:
   ```bash
   npm install
   ```
2. Copy env and fill in Supabase keys:
   ```bash
   cp .env.example .env
   ```
   Get keys from your Supabase project dashboard (Project Settings → API).
3. Create tables: run `supabase/schema.sql` in the Supabase SQL editor, then
   `supabase/migrations_language_catalog.sql` to seed the language catalog.
   Existing projects also run `supabase/migrations_content_rights.sql` once to
   add the audio/video rights-attestation columns,
   `supabase/migrations_transcription.sql` to store consented transcripts, and
   `supabase/migrations_uploaded_lessons.sql` once if the pre-existing
   `lessons` table still has the legacy course columns as `NOT NULL` (without
   it, `process-upload` cannot insert a generated lesson). Fresh installs get
   all shapes from `schema.sql`. The migrations are idempotent; the app falls
   back to its bundled lessons until the catalog migration has run.
4. Start:
   ```bash
   npm start
   ```
   Then press `w` (web), `a` (Android), or `i` (iOS).
5. Run it on a device or emulator:
   ```bash
   npm run android   # expo run:android
   npm run ios       # expo run:ios
   ```
   Either one compiles and installs a **development client**, launches it and
   starts Metro (pass `-- --no-bundler` to stop after the install; a client
   already on the device attaches with `npx expo start --dev-client`). Expo Go
   is not an option here — `llama.rn`, `react-native-worklets` and
   `expo-speech-recognition` are native modules Expo Go does not ship.
   - **Android:** JDK 17, the SDK with platform + build-tools + NDK
     27.1.12297006, CMake with ninja ≥ 1.11 and Windows long paths enabled, and
     `source scripts/android-env.sh` in the same shell first so the AVDs and
     Gradle caches land on `D:`. Details and failure modes are in
     *Local Android toolchain* below; a cold debug build measured 1 h 7 min on
     this machine, almost all of it the NDK/CMake compiles, and the same build
     warm — caches and `.cxx` objects intact — takes 1 m 15 s.
   - **iOS:** macOS with Xcode and a simulator or device, so it cannot build
     from Windows — use a Mac, or the cloud:
     `npx eas-cli build --profile development --platform ios` under
     *EAS builds*.

## Checks

```bash
npm run gate        # every required release gate (CI runs the same runner)
npm run typecheck   # TypeScript
npm test            # cue + benchmark + celebration + speak-back + catalog + drafts + content rights + transcription + roleplay + labs
npm run lint        # ESLint (expo lint)
npm run check:labex    # licensed lab library: 1842 labs, 6580 questions, 12 categories
npm run check:sandbox  # every generated JS/CSS exercise really executes (reference passes, starter fails)
npm run check:vm       # offline Git VM: every scenario's reference solution passes its own checks
npm run check:guided   # every lab is runnable here or ships a walkthrough
npm run audio:preflight                 # workspace + cloned-voice consent gate for the configured voice
npm run verify:lesson-audio -- --list   # uploaded lessons available for full audio verification
npm run verify:lesson-audio:disposable -- --plan  # free dry run with a temporary lesson
```

`npm run gate` reads [content/quality/gates.json](content/quality/gates.json),
runs every blocking check, writes `.quality/last-run.json` / `.md`, and can
publish the run to the owner console with `--publish`. CI calls the same
runner on every pull request and main push. See
[docs/quality-operations.md](docs/quality-operations.md).

`verify:lesson-audio` is an operator command, not part of `npm test`: it
synthesizes a real lesson's complete full mix and every segment with the
configured ElevenLabs voice and therefore spends provider credits. See
[docs/audiobook-voice.md](docs/audiobook-voice.md#verify-a-real-uploaded-lesson).
The `:disposable` variant creates a temporary ready upload, lesson and question
set, runs the same verifier, and deletes them even when a check fails; start
with `--plan` to exercise the whole path without spending credits.

The audio check reads the WAV header directly, so it also guards against a
re-export silently changing the cue's sample rate or frame count.

The results check ([scripts/check-results-celebration.cjs](scripts/check-results-celebration.cjs))
executes the real `shouldCelebrate()` gate from [lib/resultsGate.ts](lib/resultsGate.ts)
against a pass/fail matrix — 80% compared unrounded, a level-up still counts
after a miss, an empty result scores 0 — and then asserts the screen's wiring:
the burst is seeded from the gate and `<Celebration>` renders only behind
`burst && celebrates`. It also executes the chest gate from
[lib/chestGate.ts](lib/chestGate.ts) and asserts the path screen records the
award only after `completeLesson` succeeds, then re-checks that awarded claim
before the chest opens and again before the storm starts. It walks the chest
payout table in [lib/chestRewards.ts](lib/chestRewards.ts) (every row reachable,
weights summing to 100, labels matching the kind) and exercises the streak freeze
in [lib/streak.ts](lib/streak.ts) — one missed day is covered and consumed, a
longer gap still resets. Flip either gate or drop the render guard and `npm test`
fails.

The catalog check ([scripts/check-language-catalog.cjs](scripts/check-language-catalog.cjs))
parses the generated migration, proves every question is solvable, confirms the
seed matches the lesson banks and covers every language block on the path, and
asserts the public-read policies and grants. It also requires a bundled offline
snapshot for every published transcript lesson and runs the real loader with an
unreadable catalog to prove the path node still resolves. It fails if a bank
lesson was added without running `npm run catalog:sql`.

The curriculum check ([scripts/check-curriculum-quality.cjs](scripts/check-curriculum-quality.cjs))
locks in the learning standard across every course, quiz, lab, and workshop:
every block resolves, every lesson teaches before it tests, every question has
an explanation, every chain is solvable, every exam has production work, and
every course that needs a capstone has one. It also proves the first-try
mastery model: 80% to unlock, zero XP on a failed check, retries as practice.
The rules are documented in [docs/curriculum-standards.md](docs/curriculum-standards.md).

The four lab gates keep the runnable content honest: `check:labex` validates the
licensed library, `check:sandbox` re-executes every generated JS/CSS exercise in
`node:vm` and fails if a reference stops passing, a starter passes as written, an
assertion turns trivial or a fixture smuggles a script or a network call,
`check:vm` proves each Git lab's reference solution against its own state checks,
and `check:guided` proves no lab is left with neither a runnable stage nor a
walkthrough. Full design: [docs/hands-on-labs.md](docs/hands-on-labs.md).

The transcript check ([scripts/check-transcript-import.cjs](scripts/check-transcript-import.cjs))
regenerates the draft lessons from the FSI Swahili transcript, validates every
row with the app's `toCourseLesson()`, and fails if the committed draft JSON/SQL
is stale, a draft is published, or a question is unsolvable. A second guard
([scripts/check-subtitle-import.cjs](scripts/check-subtitle-import.cjs)) drives
the SRT/VTT parser, sidecar manifests, translation fallback and draft output
with temporary files. Both run inside `npm test`.

## Edge Functions

Ten functions, all deployed to `rlulmewvmhxgctonizas`. Nine of them reject an
unauthenticated call; the tenth (`mpesa-callback`) is provider-facing and
authenticates a shared secret instead:

- `supabase/functions/ask-bingo` — in-lesson help from Bingo.
- `supabase/functions/explain-answer` — why an answer was right or wrong.
- `supabase/functions/grade-project` — capstone grading.
- `supabase/functions/process-upload` — turns a pasted text into draft lessons.
- `supabase/functions/roleplay-chat` — Livia/Bingo language tutors (ES/FR/DE) and the code/career scenarios.
- `supabase/functions/engineer-agent` — Kito audits quality, telemetry, flags and errors; records approvals and emails the owner.
- `supabase/functions/review-approval` — owner approval/rejection with allowlisted, reversible actions and an audit trail.
- `supabase/functions/revenuecat-webhook` — grants and revokes `profiles.is_premium` from RevenueCat events. Needs the `REVENUECAT_WEBHOOK_SECRET` secret and must run with `--no-verify-jwt`, because it authenticates the provider's bearer token itself.
- `supabase/functions/mpesa-push` — starts a Safaricom STK Push for a signed-in learner, rate-limits prompts, queries missed callbacks and settles the learner's own expiry. Runs with JWT verification ON.
- `supabase/functions/mpesa-callback` — receives the STK Push result from Daraja. Deployed with `--no-verify-jwt` and gated by `MPESA_CALLBACK_TOKEN`; it can only settle a `CheckoutRequestID` this server created.

`npm run check:roleplay` keeps the persona/language catalogs, prompt contract,
bilingual parser and screen/function wiring aligned; it runs inside `npm test`.
`npm run check:mpesa` runs the real payment module against an in-memory ledger
(price authority, underpayment rejection, idempotency, automatic lapse) plus
the trust-boundary and wiring checks — no network, no credentials.

Streaks are advanced by `lib/progress.ts`, and premium is also synced on-device
by `lib/purchases.ts`, so the webhooks are the server-side authority for
revocations when the learner is not in app. M-Pesa has no renewal webhook at
all: `mpesa-push` re-derives `profiles.is_premium` from the paid-through dates
in `mpesa_checkouts` on every call, so one 30-day payment cannot outlive itself.

Deploy with the Supabase CLI. State `--no-verify-jwt` explicitly: `deploy`
keeps whatever the function already had.

```bash
npx supabase functions deploy ask-bingo --no-verify-jwt=false
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
npx supabase functions deploy mpesa-push --no-verify-jwt=false
npx supabase functions deploy mpesa-callback --no-verify-jwt
```

## Quality operations (CI gates, telemetry, A/B, AI engineer)

Run [`supabase/migrations_quality_ops.sql`](supabase/migrations_quality_ops.sql),
deploy `engineer-agent` and `review-approval`, then open
**Settings → Quality & Operations** as the verified owner
(`bolingolearn@pm.me`). The console shows the latest published gate run,
crash-free %, p95, the learning funnel, experiment results, the engineer's
findings, and pending approvals. Every approval is also emailed to the owner
through a provider-neutral webhook or the Resend adapter.

- CI: [.github/workflows/quality-gate.yml](.github/workflows/quality-gate.yml)
- Scheduled audit: [.github/workflows/engineer-audit.yml](.github/workflows/engineer-audit.yml)
- Telemetry opt-out: Settings → Anonymous diagnostics (clears the queue)
- Full setup, privacy model, agent autonomy and runbook:
  [docs/quality-operations.md](docs/quality-operations.md)

The migration and both functions are already applied to the live project
(`engineer-agent`, `review-approval` answer `401` unauthenticated as intended);
what is still missing is an email provider secret and a git remote for CI — see
*Deployed state* in the runbook.

## Runnable labs (offline VM, sandbox editors, guided)

1 842 imported labs, and each one runs or says plainly that it cannot:

- **Offline Git VM** — `lib/vm/` is an in-memory POSIX filesystem plus the Git
  object model and porcelain (`clone`, `branch`, `switch`, `merge`, `rebase`,
  `stash`, `reset`, `push`…), driven by [components/TerminalPlayer.tsx](components/TerminalPlayer.tsx).
  Tasks are graded from the repository state the learner actually built, never
  from matched text. 59 scenarios, 59/63 Git labs runnable.
- **Sandbox editors** — [lib/codeSandbox.ts](lib/codeSandbox.ts) compiles the
  learner's JavaScript/CSS/HTML with the lab's own assertions into one offline
  runner; [components/CodeExercise.tsx](components/CodeExercise.tsx) shows
  per-test results and the run time. 308 exercises (226 JS, 82 CSS).
- **Guided fallback** — labs in languages this build cannot execute keep their
  knowledge check and add a read-only walkthrough of the real steps, commands and
  reference files, labelled **GUIDED — NO EXECUTION**
  ([components/GuidedLabPlayer.tsx](components/GuidedLabPlayer.tsx)). Chunks load
  per 40 labs, so one lab never pulls a whole category.

Interactive stages always come last in a session, and a lesson that runs here
never also gets the walkthrough. Details, licensing and the gate table:
[docs/hands-on-labs.md](docs/hands-on-labs.md).

## Jungle expedition UI (QD-OLED)

The app is one bioluminescent rainforest. `lib/jungle.ts` maps every route to a
habitat, a resident bird and a quantum-dot accent pair; the router-level
`components/jungle/ExpeditionBackdrop.tsx` paints the canopy glow, vines,
fireflies and bird behind every screen. The home loop adds
`components/jungle/StreakTrail.tsx`: seven leaves light with each streak day, so
today's unlit leaf is a visible reason to come back. True black stays black for
OLED; light mode is the same system on quantum paper.

| Screen | Bird | Habitat |
| --- | --- | --- |
| Learn path | 🦜 Kea | Canopy Trail |
| Lesson player | 🐦 Kingfisher | River Run |
| Results | 🦚 Bird of Paradise | Victory Glade |
| Leaderboard | 🦅 Harpy Eagle | Emerald Ridge |
| Dictionary | 🦜 Hornbill | Word Market |
| Design lab | 🦩 Crane | Design Lagoon |
| Roleplay | 🦉 Lyrebird | Campfire Circle |
| Settings | 🕊️ Nightjar | Basecamp |
| Paywall | 🦚 Peacock | Summit Pass |
| Auth | 🐦 Sunbird | Trailhead Gate |
| Uploads | 🕊️ Swift | Mistfall |
| Curriculum | 🦜 Quetzal | Scholar's Grove |
| Project | 🐦 Woodpecker | Builder's Hollow |
| Certifications | 🦩 Ibis | Sun Temple |
| Refill | 🐦 Hummingbird | Heart Spring |

Zora's build-coach surfaces now render the Figma-frame portrait
(`assets/characters/zora-portrait.png`), not the old in-code vector.

## Language courses

English carries nineteen nodes, Spanish, French, and German carry twenty nodes, and Swahili twenty-two. The lessons are original Bolingo Learn material built
around beginner survival topics:

- **Swahili** — [Questions & Negation](lib/swahili-plus.ts), [Adjectives &
  Agreement](lib/swahili-plus.ts), [Health & Emergencies](lib/swahili-plus.ts).
  They cover `Je…?`, `wapi/nani/lini`, the present negative (`sipendi`,
  `hatuna`, `hakuna`), noun-class agreement (`mtoto mzuri`, `vitabu vikubwa`,
  `nyumba ndogo`), and `naumwa` / `nisaidie` / `daktari`.
- **Swahili phrasebook** — [Politeness & Sympathy](lib/swahili-plus.ts),
  [Introductions & Origins](lib/swahili-plus.ts), [Languages &
  Understanding](lib/swahili-plus.ts), [Money & Bargaining](lib/swahili-plus.ts).
  Drawn from the licensed Eko Languages phrase video (see
  [docs/language-sources.md](docs/language-sources.md)): `samahani` / `pole
  sana` / `karibu`, `Jina langu ni…` and `Nimetoka…`, `Unazungumza
  Kiingereza?` / `sielewi` / `sema polepole`, and `Bei yake ni ngapi?` /
  `punguza bei`, with colloquial market forms like `Uko na pesa?` labelled as
  such.
- **English** — [Questions & Negatives](lib/english-plus.ts), [Describing &
  Comparing](lib/english-plus.ts), [Health & Emergencies](lib/english-plus.ts).
  They cover do/does/did, short answers, adjective order, `-er` vs `more`,
  `as … as`, `too`/`enough`, symptoms, and `should` advice.
- **Spanish** — [Questions & Negation](lib/spanish-plus.ts), [Health &
  Emergencies](lib/spanish-plus.ts). `¿Dónde está…?`, `no hablo`, double
  negatives, `me duele`, `tengo fiebre`, and the pharmacy.
- **French** — [Questions & Negation](lib/french-plus.ts), [Health &
  Emergencies](lib/french-plus.ts). `Est-ce que` vs inversion, `ne … pas`,
  `ne … jamais/rien`, `j’ai mal à…`, and `j’ai besoin d’un médecin`.
- **German** — [Questions & Negation](lib/german-plus.ts), [Health &
  Emergencies](lib/german-plus.ts). Verb-first questions, `nicht` vs
  `kein/keine`, `Kopfschmerzen`, `einen Arzt`, and `die Apotheke`.

Each lesson is five questions with a teaching note on every answer, and each is
wired into [lib/curriculum.ts](lib/curriculum.ts) before the daily review and
checkpoint, so completion, XP, chests and the final exam all work unchanged.
The Swahili and English checkpoints and final exams each close with one item
from the questions, adjective/describing and health lessons, so that material is
assessed rather than only browsable — the checkpoint stays shorter than the
final (9 and 9 for Swahili, 8 and 9 for English).

Topic sequencing was checked against the public-domain FSI Basic Courses and
publicly available beginner YouTube playlists; no third-party audio, captions or
lesson text was copied into these published lesson banks. (The separate FSI
Swahili transcript drafts reproduce short public-domain dialogues with
attribution; see [docs/transcript-import.md](docs/transcript-import.md).)
Sources and license notes: [docs/language-sources.md](docs/language-sources.md).

## Multilingual Roleplay (Livia & Bingo)

`/roleplay` is now a language-tutor picker as well as the code/career chat.
Choose **Spanish**, **French** or **German**, then choose the teaching style:
**Livia** is the patient mentor who notices effort first, recasts one mistake
at a time and invites a full sentence; **Bingo** is the playful partner who
turns each turn into a tiny game or challenge. Every pairing has its own
opening line and starter replies in [lib/roleplayPersonas.ts](lib/roleplayPersonas.ts).

The server owns the actual teaching prompt and language rules in
[supabase/functions/_shared/roleplayPersonas.ts](supabase/functions/_shared/roleplayPersonas.ts).
It whitelists only Livia/Bingo × ES/FR/DE, keeps the learner at CEFR A1–A2,
limits the tutor to one question per turn, and requires a target-language reply
with an English gloss. The chat bubble shows the target line, the gloss sits
under a divider, and an optional coaching note explains one correction. **Hear
Livia / Hear Bingo** replays the target line through the existing on-device
`speakAs()` voice path in the right locale. The code/career scenarios remain
unchanged below the language picker. Roleplay is still Premium and still
stateless; the API, prompt contract, deployment and limitations are in
[docs/roleplay-personas.md](docs/roleplay-personas.md).

**Where courses live.** The banks in `lib/*-plus.ts` are the build-time source
and the offline fallback; at runtime [lib/languageCatalog.ts](lib/languageCatalog.ts)
reads `public.language_lessons` first, validates every row, and merges it over
the bundle. Editors can therefore fix wording, rewrite theory or replace a
question in the Supabase dashboard and have it reach learners without an app
release — the loader caches for five minutes. Reviewed transcript lessons that
are remote-only also ship a release snapshot in
[content/published/language-lessons.offline.json](content/published/language-lessons.offline.json),
so their path nodes open when the catalog cannot be read; a successful remote
read stays authoritative and hides an unpublished row online. The generated
migration
[supabase/migrations_language_catalog.sql](supabase/migrations_language_catalog.sql)
creates the tables and seeds all 104 built-in lessons (`npm run catalog:sql`
regenerates it, `npm run check:catalog` guards it). The learning path itself —
which lesson sits where — remains code in `lib/curriculum.ts`, so a brand-new
lesson still needs a path block; see [docs/language-catalog.md](docs/language-catalog.md).
Supabase's older `lessons` and `questions` tables hold *personalized uploads*
and are row-level-secured per user — they are not this catalog. Published
catalog content is original Bolingo Learn writing, not a transcript or re-recording
of third-party course audio.

**Transcript drafts.** Public-domain or openly licensed source transcripts can
be turned into unpublished lesson drafts with
[scripts/import-language-transcripts.cjs](scripts/import-language-transcripts.cjs).
The importer accepts the JSON transcript format as well as `.srt` and `.vtt`
video subtitles; a subtitle import needs a small sidecar manifest for the
licence, attribution and lesson boundaries. The first committed set comes from
the 1963 FSI Swahili Basic Course; the rows are seeded with `published = false`,
carry their attribution in the theory, and stay off the learning path until
reviewed. Format, subtitle conventions, commands and the review lifecycle are in
[docs/transcript-import.md](docs/transcript-import.md).

## Pronunciation (Livia & Bingo)

Language lessons are voiced by [lib/pronunciation.ts](lib/pronunciation.ts):
Livia models every target phrase in its own language and Bingo narrates the
English around it. Pitch stays at 1.0 — pitch-shifted TTS drags its formants and
sounds foreign — so the characters differ by pacing (Livia 0.86, 🐢 0.62; Bingo
0.98; Zora 0.93) and by each taking their own installed voice in every language.
Livia and Zora are cast with a woman's voice and Bingo with a man's whenever the
platform names its voices; Zora reads her build hint aloud in the project
runner. The
engine fills gaps with the answer being taught, drops English glosses, keeps
accents and restores question intonation, prefers neural/network voices over
compact and robotic ones, excludes novelty voices, and falls back to a
vowel-compatible voice (Swahili → Italian) when no native voice is installed. It
also breathes where a speaker would — a comma before a long clause link, dashes
and semicolons turned into pauses — and eases the rate on one-word answers and
long sentences instead of delivering everything at one metronomic clip. The
phrase plays when an exercise opens, and a miss is followed by a slow replay of
the correct sentence. Details and the QA checklist:
[docs/pronunciation.md](docs/pronunciation.md).

Settings → **Voice cast** checks the installed voices before a lesson: switch
between **English** and **Kiswahili**, then tap Livia, Bingo or Zora for a sample
line played through `auditionVoice()` in [lib/voiceCast.ts](lib/voiceCast.ts) —
the same `speakAs()` call a lesson makes, so the gender casting, pacing and
installed-voice choice are exactly what the learner will hear. After each
audition the card reports what the platform actually used (character · language ·
locale · voice name) and flags an approximate fallback, so a device missing a
native Swahili voice says so instead of surprising the learner mid-exercise.
Tapping the character who is talking stops her, tapping another hands the
microphone over (never two voices at once), and leaving Settings stops speech.
When the language is missing the card says which voice to install; when a
platform refuses to list its voices at all (some browsers) it says that
separately, so a timeout is never mistaken for a missing language.

## Speak-back practice (language lessons)

Every language exercise has a **Say it back** button under Livia's controls.
Tap it, say the phrase, and the device's speech recognizer returns a transcript;
[lib/speakBack.ts](lib/speakBack.ts) aligns it word by word to the model phrase
and scores the attempt 0–100. Exact words are green, accent-only differences
(`esta` / `está`) are amber, substituted or missing words are red, and extra
words are appended in grey. The best of the recognizer's alternatives wins.

The label says **word match** on purpose: this catches wrong, missing or
misrecognized words, not phoneme quality. It cannot tell a perfect rolled `rr`
from an acceptable one, and it does not pretend to.

- Native uses the OS recognizer through
  [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
  (iOS `SFSpeechRecognizer`, Android `SpeechRecognizer`). It is a native module,
  so it needs a development build — Expo Go has no recognizer. The config plugin
  adds microphone + speech-recognition permissions and the permission copy is
  in `app.config.js`; rebuild the client after pulling this
  (`npx expo run:android` / `run:ios`, or a new EAS build).
- Web uses the browser's Web Speech API (Chrome, Safari).
- The app never uploads the audio. An attempt is kept on the device only long
  enough to replay it, then deleted when you retry or leave the exercise.
  Depending on the device, the OS/browser service may send it to its provider
  to transcribe it.
- After the score, **Your attempt** sits next to **Hear Livia** so the learner
  can hear their own recording against the model before retrying. Native
  (Android 13+/iOS) keeps the audio from the recognizer's session; web records
  beside it. On older Android the replay button is simply omitted.
- If the recognizer or microphone is unavailable, the card explains why and the
  lesson stays playable.
- Bands: ≥90 nailed it, ≥75 close, ≥50 almost, below that try again.
- Alignment, accent folding and the extra-word penalty are covered by
  `node scripts/check-speak-back.cjs` (part of `npm test`).

## Celebrations (chest ➔ five-second storm)

A unit chest is claimed in two beats. [components/ChestOpening.tsx](components/ChestOpening.tsx)
drops the chest in, rattles it, throws the lid and fires the gold sparks, beam
and rings over `CHEST_OPEN_MS` (1080ms). On its last frame it calls `onOpened`
and the screen hands straight over to [components/Celebration.tsx](components/Celebration.tsx)
for the full `FULL_CELEBRATION_MS` ribbon storm — no overlap and no gap. The
applause starts on that handoff frame rather than on the tap, so the five
seconds of crowd sit exactly under the five seconds of ribbons. Results mount
the storm directly, but only for a pass (80%+, unrounded) or a level-up — a
failed run gets the review panel and no applause. Only the chest gets a
ceremony in front of the storm.

Chests pay a variable reward. [lib/chestRewards.ts](lib/chestRewards.ts) is a
weighted table — bonus XP (30/50/75/100), gems (5/10/20) or a streak freeze —
rolled once at claim time and written with the claim by `completeLesson`, so the
payout and the `chest:<unitId>` completion commit together and a failure mid-write
shows nothing. The roll then travels with the ceremony state: the chest's caption
reveals it as the lid lifts, and the storm badge repeats it (`+10 gems`,
`+1 streak freeze`, `+75 XP`) instead of the old fixed 50 XP. Gems and freezes are
shown in Settings, and a freeze is consumed by `advanceStreak` when it covers a
single missed day.

The storm is also frame-budgeted: after a 700ms settle (so the mount spike
doesn't count) it samples its own frame times, and if more than half of a
30-frame window runs longer than 32ms — below ~30fps — it trims from 42 ribbons
to 29 and then 20, stopping there so the celebration still reads as confetti.
The shared clock is never touched, so trimming can't shorten the five seconds
or desync the applause, and because each ribbon is seeded by index, dropping the
tail never makes the survivors jump.

**Benchmarking the storm.** Development builds expose
`/dev/celebration-benchmark`, linked from the bottom of Settings. It mounts the
real `Celebration` at `FULL_CELEBRATION_MS`, discards the first 700ms of mount
cost, ignores gaps of 200ms or more, and samples requestAnimationFrame deltas
until `onDone`. The screen shows **p50**, **p95**, mean, max, frame count and
average FPS; run it with the app foregrounded and use a profile/release build
for representative device numbers. The route redirects to `/` outside `__DEV__`,
so it cannot run in a shipped build. `npm run check:benchmark` exercises the
percentile logic and verifies the route still measures the real component.

## Core loop (Path Map ➔ Quiz Player ➔ Loss Aversion)

Expo Router (`src/app/`) drives the habit loop:

1. **Path Map** (`/`): Duolingo-style winding track of circular nodes — 🔥 streak / ⭐ XP / 💎 diamonds top bar; completed nodes turn gold 🏆, the active node pulses, locked nodes are greyed 🔒 (sequential unlock once signed in). The **🧠 AI Sandbox** FAB opens an upload panel (text, PDFs and photos via the system picker → `user-materials` → pipeline); each finished upload renders a **My Custom Revision** node, with in-flight uploads shown as ⏳ nodes and live statuses.

   The pipeline first decides **what was uploaded** (`supabase/functions/_shared/materialKind.ts`): a chaptered **book** is narrated from its first character to its last (resumable parts, chapter offsets), while **notes**, **articles** and **transcripts** get a **revision pack** built on the seven memorization techniques — active recall, spaced repetition, flashcards, chunking, mind map, memory palace and teach-it — in `components`-free form at `src/app/revision/[uploadId].tsx`. See [docs/materials.md](docs/materials.md).
2. **Quiz Player** (`/quiz/[lessonId]` + [components/GamifiedCodePlayer.tsx](components/GamifiedCodePlayer.tsx)): the reusable core game engine — tap-token assembly (`correctChain` vs `scrambledTokens`), animated top progress bar, diamonds via `progress.ts` (one lost per failed lesson, wrong answers free), cheerful/soft correction chimes from [assets/sounds.ts](assets/sounds.ts) on `expo-audio`, and the 🔊 audiobook anchor (plays the generated narration URL when present, premium-locked hint otherwise). The screen is a thin wrapper: loads demo or Supabase questions (multiple-choice collapses to one token, drag-and-drop splits the stored answer chain), attaches signed segment URLs as `audioUrl`, and handles completion/streak.
3. **Loss-Aversion Screen** (`/refill`, modal) and the **out-of-diamonds sheet** (`components/OutOfDiamondsSheet.tsx`) that the quiz screen raises at zero diamonds before a lesson starts: real AdMob rewarded video (+1 diamond only on `EARNED_REWARD`, [lib/ads.ts](lib/ads.ts) unit config with Google test ids in dev), live 4-hour countdown from `diamonds_refilled_at`, Premium upgrade (honest placeholder — RevenueCat/Stripe plugs in here). Guests never spend diamonds (no account to refill) and Premium never sees an ad. See [docs/admob.md](docs/admob.md). Meta Audience Network skipped (deprecated); AdMob serves iOS + Android.

Progress helpers live in [lib/progress.ts](lib/progress.ts) (`getProfile`, `completeLesson`, `loseDiamond`, `grantDiamonds`, `refillWaitRemaining`); guest mode plays with local state only.

## EAS builds (device testing)

`eas.json` ships three profiles: `development` (dev client + `EXPO_PUBLIC_DEBUG_PREMIUM=1`), `preview` (internal channel), `production`. `app.config.js` replaces `app.json` and reads AdMob app ids from `ADMOB_*_APP_ID` with Google sample ids as fallback.

```bash
npx eas-cli login
npx eas-cli init     # projectId 7ceeed84-5e6b-4157-b515-b7adfba83ddb is already in app.config.js
npx eas-cli build --profile development --platform android  # first real-device test
npx eas-cli build --profile preview --platform all          # internal sharing
npx eas-cli build --profile production --platform all       # store submission
```
`.env` is gitignored and there is no `.easignore`, so a cloud build never sees your local file — its configuration comes only from EAS environment variables. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are already set in `development`, `preview` and `production`; the AdMob and RevenueCat keys are not. `eas secret:create` is deprecated, so use `env:set` and confirm with `eas env:list --environment <name>` (it hides sensitive values unless you pass `--include-sensitive`):

```bash
npx eas-cli env:set --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value <key> \
  --environment development --environment preview --environment production
```

Install the dev build, open it, then run `npx expo start --dev-client` and scan the QR.

If the CLI aborts before running with `MODULE_NOT_FOUND` (e.g. `Cannot find module 'domino'`) or `ERR_INVALID_ARG_TYPE`, npm's cached copy of `eas-cli` is broken — not the project. Install it into the project instead, which skips the lifecycle scripts that crash under Node 24, and call the local binary:

```bash
npm install --no-save --ignore-scripts eas-cli@27.2.0
npx eas-cli build --profile preview --platform android
```

### Local Android toolchain (SDK on C:, AVD + Gradle on D:)

The SDK binaries are installed by Android Studio on `C:`, but the two directories that actually grow live on the `D:` volume, where there is space. Nothing exports them, so a plain `npx expo run:android` looks in `%USERPROFILE%\.android\avd` and `%USERPROFILE%\.gradle`, finds neither, and re-downloads the Gradle graph onto `C:`.

| Path | Holds | Wired by |
| --- | --- | --- |
| `C:\Users\<you>\AppData\Local\Android\Sdk` | platform-tools, platform 37, build-tools, NDK 27.1.12297006 | `android/local.properties` (`sdk.dir`) |
| `D:\android-sdk-cmake` | CMake | `android/local.properties` (`cmake.dir`) |
| `D:\android-avd` | emulator AVDs (`Medium_Phone`, `Medium_Phone_API_37.0`) | `ANDROID_AVD_HOME` |
| `D:\gradle-home` | Gradle 9.4.1 wrapper distro + dependency caches | `GRADLE_USER_HOME` |

Source the helper before any Android command — it exports those variables for the current shell, prints what it found, and keeps the two build settings that decide how long every later rebuild takes in `$GRADLE_USER_HOME\gradle.properties` (see *Rebuild time, measured*):

```bash
source scripts/android-env.sh          # export into this shell, write the two settings
source scripts/android-env.sh --check  # also verify SDK, AVDs, caches, ABIs and .cxx

emulator -list-avds                    # Medium_Phone, Medium_Phone_API_37.0
emulator -avd Medium_Phone &
npx expo run:android                   # Gradle now writes to D:\gradle-home
```

`ANDROID_ARCHS` picks the ABI list written there — default `x86_64`, the emulator's own; a phone wants `arm64-v8a`, a store upload wants both — and `ANDROID_GRADLE_PROPS=off` leaves that file entirely your own. It goes in the *user-level* properties file rather than `android/gradle.properties` because `android/` is generated, so the next `expo prebuild` would undo the edit, and because Gradle reads the user file after the project one.

To make it permanent instead of per-shell, set the same names once (user scope, no admin needed) and reopen the terminal:

```bash
setx ANDROID_AVD_HOME "D:\android-avd"
setx GRADLE_USER_HOME "D:\gradle-home"
```

Both are optional: without them the build still works, it just fills `C:` — 10 GB free there against 796 GB on `D:` at the time of writing, and one ABI's native object files alone want about 2.1 GB. The NDK needs no variable — it ships inside the SDK at `ndk/27.1.12297006`, the same revision as the `android-ndk-r27b` copy on `D:`.

#### Windows native build prerequisites

React Native's CMake targets mirror each source file's absolute path into the object directory, so reanimated's `Common/cpp/reanimated/CSS/common/filters` becomes a 260-character path under `node_modules`. Two machine settings are required, and without them the build dies in the native stage:

```text
ninja: error: mkdir(CMakeFiles/reanimated.dir/C_/Users/.../CSS/common/filters): No such file or directory
```

1. **Long paths enabled** (one-time, admin):
   ```bash
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
   ```
2. **ninja ≥ 1.11** on the CMake path. The Android CMake 3.22 in `D:\android-sdk-cmake` bundles ninja 1.10.2, which predates Windows long-path support and still fails after step 1. Replace just that binary and keep the original next to it:
   ```bash
   cp D:/android-sdk-cmake/bin/ninja.exe D:/android-sdk-cmake/bin/ninja-1.10.2.exe.bak
   curl -sL -o /tmp/ninja.zip https://github.com/ninja-build/ninja/releases/download/v1.12.1/ninja-win.zip
   powershell -Command "Expand-Archive -Path /tmp/ninja.zip -DestinationPath /tmp/ninja -Force"
   cp /tmp/ninja/ninja.exe D:/android-sdk-cmake/bin/ninja.exe
   ```

A release APK builds and installs on an emulator with:

```bash
source scripts/android-env.sh
cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64
# ~25 min cold, app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

The `-P` is not decoration: a device-less `gradlew` build now inherits `reactNativeArchitectures=x86_64` from the user-level properties file, and a store artifact needs `arm64-v8a` in it. `expo run:android` never sees this problem — it detects the attached device's ABI and passes `-PreactNativeArchitectures=<that abi>` itself (`getActiveArchArg` in `node_modules/@expo/cli/build/src/start/platforms/android/gradle.js`), and a command-line `-P` outranks the properties file anyway.

#### Rebuild time, measured

`./gradlew :app:assembleDebug` on this machine — 8 cores, 15.8 GB RAM, no ccache, `D:\gradle-home` caches warm, one ABI (`x86_64`), after `source scripts/android-env.sh`:

| Starting state | Time | Task summary |
| --- | --- | --- |
| Nothing deleted, same Gradle daemon, no source changes | **1 m 15 s** | 650 tasks: 25 executed, 625 up-to-date |
| Nothing deleted, fresh daemon (`./gradlew --stop` first) | **9 m 16 s** | 650: 105 executed, 36 from cache, 509 up-to-date |
| `android/app/build` + `android/.gradle` deleted, build cache on | **13 m 16 s** | 650: 292 executed, 294 from cache, 64 up-to-date |
| The same two folders deleted, `--no-build-cache` | **13 m 26 s** | 650: 614 executed, 36 up-to-date |
| Everything cold: `expo run:android` after `prebuild --clean`, empty caches | **1 h 7 m 35 s** | 649 tasks, every C++ target compiled from source |

1. **The warm path is pure C/C++.** Those 25 executed tasks in row 1 are the `configureCMakeDebug[x86_64]` + `buildCMakeDebug[x86_64]` pairs of the eight native modules — `app`, `expo-modules-core`, `expo-updates`, `llama.rn`, reanimated, worklets, screens, gesture-handler — plus a little bookkeeping. AGP reruns them on every build, and the Gradle build cache does not cover them. They cost about a minute *only because `node_modules/*/android/.cxx` still holds the objects for that ABI*, so ninja has nothing to do. That folder is the cache worth protecting.
2. **Do not stop the daemon.** Rows 1 and 2 are the same project with the same caches; `--stop` (or 3 idle hours) costs about eight minutes of re-snapshotting inputs the daemon already remembered. The extra work is the app's packaging chain — `mergeDebugAssets`, `mergeDebugNativeLibs`, `stripDebugDebugSymbols`, `packageDebug`.
3. **The build cache is a safety net, not a speedup.** Restoring 294 tasks saved ten seconds over re-executing them, because that work overlaps on 8 workers while the native and packaging tasks run. Keep `org.gradle.caching=true` regardless — `expo run:android` already passes `--build-cache` (`buildCache: !args['--no-build-cache']` in `@expo/cli`), so this property is what gives plain `./gradlew` the same treatment for free.
4. **One ABI, not four.** `expo prebuild` writes all four ABIs into the generated `android/gradle.properties`. Pinned to one, `--dry-run` plans 779 tasks with 8 native build tasks; unpinned it plans 823 with 30. The measured price per ABI is 2 107 MB of `x86_64` Debug objects across the eight modules — 1 520 MB of it `llama.rn` — so the other three would add roughly 6.3 GB to `C:` — the same volume this layout moves everything else off precisely because it runs out. And since those tasks rerun on every build, an extra ABI slows *every* rebuild, not just the first. (The hour in row 5 was not the ABIs: `expo run:android` pins them to the device — see the `-P` note above. It was compiling every C++ target from an empty `.cxx`.)
5. **`android/.gradle` is the up-to-date database.** `executionHistory.bin` inside it is what lets Gradle answer "nothing changed". `expo prebuild` without `--clean` leaves it alone and the row 1 numbers survive; `--clean`, or deleting `android/` to reclaim space, throws it away and pays row 3.

One Windows hazard shows up when builds are scripted back to back: `Execution failed for task ':expo-modules-core:bundleLibCompileToJarDebug' > Unable to delete file '...\compile_library_classes_jar\debug\bundleLibCompileToJarDebug\classes.jar'`. A daemon that survived an interrupted build still holds that jar. `./gradlew --stop` and rerun, and budget the eight minutes of row 2.

#### What invalidates `.cxx`

Each `node_modules/<module>/android/.cxx/Debug/<hash>/` folder is named after a hash of the CMake configure command, and the `hash_key.txt` sitting in it lists the inputs verbatim: the AGP version (9.2.1), the NDK path, the `$CMAKE` and `$NINJA` paths, the absolute project path and every `-D` flag — while noting that `$ABI` is *not* part of the hash. Change one input and AGP neither reuses nor repairs the old folder: it configures a fresh one and leaves the previous set of objects as dead weight.

Two of those inputs move by themselves:

- **Turning on Windows long paths** changed `-DCMAKE_OBJECT_PATH_MAX` from 140 to 1024 and re-hashed every module. Still on disk: `react-native-worklets/android/.cxx/RelWithDebInfo/` holds `2j564h2t` (110 MB, `=1024`) beside `734q4i31` (60 MB, `=140`) — two caches for one library, and the cold hour in row 5 is what that kind of split buys: every module then configures and compiles as if for the first time.
- **`expo prebuild --clean`** deletes `android/local.properties`, and with it `cmake.dir=D:/android-sdk-cmake`. CMake then resolves to the SDK's own copy, which changes both `$CMAKE` and `$NINJA`, re-hashes every module, and lands back on the ninja 1.10.2 that cannot build reanimated.

So keep `cmake.dir`, the NDK revision and the long-path setting steady and the objects are reused indefinitely; `source scripts/android-env.sh --check` fails on a missing `cmake.dir` and warns when a module carries more than one `.cxx/Debug` folder. Deleting a `.cxx` folder is only the right move when you swapped a binary *behind a path that never changed* — the ninja 1.10.2 ➔ 1.12.1 replacement kept `$NINJA` identical, so the hash did not move and the stale `CMakeCache.txt` survived — and then delete the stale sibling, not the folder the current hash points at.

#### OTA channel for a local release build

The update *channel* is not a native build field — it is the `expo-channel-name` request header the app sends to EAS. EAS Build writes it from the profile in `eas.json`; a local `gradlew` build has no profile, so name it at prebuild time (`app.config.js` turns the variable into `updates.requestHeaders`, and prebuild writes the manifest meta-data):

```bash
source scripts/android-env.sh
export EXPO_UPDATES_CHANNEL=preview       # omit it and the build has no channel at all
npx expo prebuild --platform android --clean
# --clean regenerates android/ and drops local.properties: restore sdk.dir and cmake.dir
cd android && ./gradlew :app:assembleRelease
```

Confirm it landed before installing — the channel is plain manifest meta-data:

```bash
unzip -p app/build/outputs/apk/release/app-release.apk AndroidManifest.xml | tr -d '\000' | grep -a expo-channel-name
```

The channel also has to point at a branch, or every update check answers "no update available" while the build looks healthy:

```bash
npx eas-cli@latest channel:create preview --branch preview
npx eas-cli@latest channel:list
```

After that a published update reaches the installed local APK on its next launch, as long as `runtimeVersion` still matches.

### Dependency parity

`npx expo-doctor` must end with `20/20 checks passed`. It lags silently: the SDK
ships patches, and `expo install --fix` is what pulls `expo`, `expo-router` and
`react-native` back onto the versions the SDK expects. Run it before a release
build, not after — a patch bump changes the native runtime, and
`runtimeVersion` only tracks the app version, so an update published from newer
JS libraries will still be served to builds compiled against the old ones.

`npm audit --omit=dev` is the shipped-surface number; the dev bucket holds the
local Supabase server (`@supabase/server` → `hono`) and Prisma RC tooling, which
never reach a learner's device. What remains in `--omit=dev` is Expo's own
toolchain (`glob`/`minimatch`, `node-forge` via code-signing) — upstream-pinned,
not fixable here, and not reachable from the app bundle.

### OTA updates (no rebuild)

`runtimeVersion` tracks the app version, so JS-only changes (screens, quiz logic, styles) ship instantly. `expo-updates` is a real dependency — without it the app cannot check for an update at all, and `eas update` refuses to publish.

```bash
npx eas-cli@latest update --branch preview --environment preview -p all --message "Tweak lesson copy"
npx eas-cli@latest update --branch production --environment production -p all --message "Fix quiz scoring"
```

The flag is `-p/--platform` (there is no `--platforms`), and a non-interactive publish must name `--environment`. A published rollout only reaches builds that were made with a channel: `preview` and `production` both carry one, a local release build carries whichever channel `EXPO_UPDATES_CHANNEL` named at prebuild, and the `development` profile carries none — so a dev client always runs whatever the Metro bundler serves. Native changes (new SDKs, AdMob/RevenueCat config, splash/icon, adding `expo-updates` itself) still need a rebuild — OTA covers JS only.

### When a rebuild is out (the app checks the website)

The APK is distributed from `https://bolingo.co.ke/install` — no store — so
nothing would tell an installed phone about a rebuild. It tells itself: the
dashboard fetches `/downloads/latest.json` once a session, compares its
`version` with the version baked into the binary (`lib/releaseManifest.ts`,
numeric, so `1.10.0` beats `1.9.0`), and offers the download through
`components/dashboard/UpdateCard.tsx`. Accepting opens the APK in the browser,
because Android will not let an app install over itself; "Not now" lasts the
session, and *Settings → App update* re-checks on demand. The record also
carries a `buildNumber` — the Android `versionCode` declared in
`app.config.js` — because two builds published under one version look identical
to a phone otherwise: a rebuild that does not move the version must move
`versionCode`, and the app offers it on that alone. Publish a build by bumping
`app.config.js` `version` and `android.versionCode` (keeping `package.json` in
step), building, then
`node scripts/publish-android-apk.cjs <apk> --local` and copying the APK plus
`latest.json` to `/var/data/app-downloads` on the host. The release record is
served `no-store`, so the next check after a publish sees it. Full runbook:
[docs/install-from-web.md](docs/install-from-web.md); the wire-up and the
`npm run check:web-publish` coverage of this path are in
[docs/contact-and-updates.md](docs/contact-and-updates.md).

## Premium paywall (RevenueCat)

`/paywall` (modal, linked from the Path tier badge and refill): loads the current offering's monthly package via `Purchases.getOfferings()`, `purchasePackage` on subscribe, `restorePurchases`, and syncs the `premium` entitlement into `profiles.is_premium` ([lib/purchases.ts](lib/purchases.ts)). Setup: create the `premium` entitlement + KSh 770/mo product in RevenueCat, add `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` / `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. `__DEV__` includes a debug premium toggle (needs `EXPO_PUBLIC_DEBUG_PREMIUM=1` for the auto-unlock path).

## Freemium fence (cost control)

AI/TTS burn is fenced behind Premium (KSh 770/mo — wire RevenueCat/Stripe where the upgrade buttons point):

- **Free:** raw text files only (picker filters to `text/*`), ≤1,000 words per upload (client pre-check in `lib/tiers.ts` + authoritative Edge Function enforcement), and no server TTS — Listen mode and quiz narration use the phone's built-in robot voice via `expo-speech` ([lib/voice.ts](lib/voice.ts)), $0.
- **Premium:** PDF, photo-scan and consented audio/video uploads, smart LLM compilation, elite ElevenLabs/OpenAI voices, and a 100,000-word monthly ceiling (`profiles.ai_words_used` / `ai_words_reset_at`, 30-day rolling reset; a 500-page book bills past the cap and is rejected). Server enforces everything — the client check is UX only. Audio/video is transcribed by Deepgram (signed URL, recommended) or an OpenAI-compatible endpoint before curation; see [docs/transcription.md](docs/transcription.md). See [docs/audiobook-voice.md](docs/audiobook-voice.md) for ElevenLabs setup, voice-consent requirements and the exact free/premium playback behavior.

## Listen to Audiobook Mode

Tapping **🎧 Listen to Audiobook Mode** on the home screen loads the newest user-generated lesson and renders [components/AudiobookPlayer.tsx](components/AudiobookPlayer.tsx) (`expo-audio`): segments stream one after another from signed bucket URLs while the matching text block highlights — Audible/Blinkist style. Cards are tappable to jump, with ⏮/⏭, play/pause, and a block counter with elapsed/total time. Signed URLs come from [lib/audiobook.ts](lib/audiobook.ts) (`loadLatestAudiobook()`); the private bucket never goes public.

## Notes

- Node 22+ is recommended for Expo SDK 58 (`node -v`). The project installs on Node 20 with engine warnings.
- After adding native libraries, use a development build (`npx expo run:android|ios`) or EAS — Expo Go only includes bundled native modules.
- Web uses the Metro bundler (`app.json` → `web.bundler: metro`) as required by NativeWind.

## Async curriculum pipeline

User Uploads ➔ Storage (private `user-materials` bucket) ➔ `process-upload` Edge Function (fires on upload) ➔ TTS (ElevenLabs default, OpenAI supported) narrates the whole upload as an audiobook ➔ LLM (DeepSeek default, GPT-4o supported) optionally curates JSON quiz nodes. What an upload produces follows the learner's `upload_output` preference: `both` (default), `audiobook`, or `nodes`.

1. Client uploads via `uploadRawFile()` in [lib/uploads.ts](lib/uploads.ts) — file lands at `<user_id>/<file_name>`, a `user_uploads` row is created (`processing`), and `process-upload` is invoked.
2. **Text extraction:** Text/Markdown is parsed directly as a string, PDFs via the lightweight `pdf-parse` wrapper (`npm:pdf-parse` in the Deno runtime, capped at the first 60 pages because only the first 60k characters are ever used), photos via vision OCR, and audio/video via the consented transcription path (Deepgram signed URL, or an OpenAI-compatible Whisper endpoint for clips under 25 MB). The transcript is cached on the upload row before curation, so a retry does not pay the provider twice; see [docs/transcription.md](docs/transcription.md).
3. **Audiobook engine (the whole upload):** Premium narration is the uploaded text, not a reading of its questions. Because every provider caps one request (`MAX_TTS_CHARS`, 4,000), the extract is split on sentence boundaries into ordered parts (`<user_id>/audio/<lesson_id>/part-NN.mp3`, three synthesized at a time) and stored on the lesson as `audio_chunks`; `audio_url` stays the first part for older players, and a failed part is recorded as `audio_error` instead of silently splicing a gap into the book. One segment MP3 per quiz element (`<user_id>/audio/<lesson_id>/<n>.mp3`) is kept for review navigation when nodes exist. Uploads flip to `ready` as soon as the lesson row exists. Learners choose this in Settings → Upload output (`profiles.upload_output`, see `migrations_upload_output.sql`).
4. **AI Curation Engine (optional):** skipped entirely for `upload_output = 'audiobook'`, so an audiobook-only learner never pays for the curation model. Otherwise the text goes to a cost-effective LLM (DeepSeek-V3 default via `LLM_MODEL=deepseek-chat`, or GPT-4o-mini via `LLM_BASE_URL`/`LLM_MODEL`) with strict instructions — top 2–3 concepts, 4–5 quiz elements, JSON schema `[{ type: multiple-choice | drag-and-drop, prompt, options, answer }]`, nothing but valid JSON. The payload is schema-validated, then inserted as one `lessons` row (`is_user_generated = true`, tagged to the user, linked via `upload_source_id`) plus one `questions` row per element. An audiobook-only lesson is tagged `audiobook_only` and stays out of the revision-node list. Voice knobs are validated in one shared module (`TTS_PROVIDER`, `TTS_MODEL_ID`, `TTS_VOICE_ID`, `TTS_VOICE`, `TTS_OUTPUT_FORMAT` and the ElevenLabs voice settings); `npm run audio:voice` validates them without spending a token, and `npm run audio:preview` verifies the configured voice with a read-only lookup, then writes a short full-mix sample plus a segment sample. See [docs/audiobook-voice.md](docs/audiobook-voice.md).

### Names, characters and training

The curator prompt tells the model to use **Livia, Bingo, or Zora** when it invents an example learner or character. It must preserve the name of a real author, historical figure, public person, or anyone named in the source, and must never attribute invented words or actions to them. Renaming a real person would make the lesson factually false; that is why the policy is “characters for invented examples, real names stay.”

The transcript importer applies that policy deterministically for curated sources: an optional top-level `nameMap` lists the only generic example names that may be swapped for Livia, Bingo or Zora. It affects lesson titles, summaries, speakers and dialogue, never source metadata or attribution; unmapped names are untouched. See [docs/transcript-import.md](docs/transcript-import.md#generic-example-names).

Audio and video uploads are gated by a content-rights checklist before storage and re-checked by `process-upload`; see [docs/content-rights.md](docs/content-rights.md) for the four declarations, attestation columns and migration. The consented transcription path, providers, limits and failure messages are documented in [docs/transcription.md](docs/transcription.md).

There is **no fine-tuning or shared-model training** in this project. The LLM is called per upload, and uploads/lessons are scoped to the signed-in user by row-level security. The app does not feed them into a shared training corpus. A transcription provider receives the recording only after the rights attestation is stored, and the transcript is kept on the learner's private upload row. Do not upload third-party course video or audiobook audio without written permission from the rights holder.

Edge Function secrets (Supabase dashboard → Edge Functions → Secrets):

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 supabase secrets set LLM_API_KEY=... TTS_API_KEY=...
# Audio/video transcription (pick one):
#   supabase secrets set DEEPGRAM_API_KEY=...          # signed URL, long audio + video
#   supabase secrets set TRANSCRIBE_API_KEY=...        # OpenAI-compatible, ≤25 MB
# M-Pesa (Safaricom Daraja) — see the paywall section below:
#   supabase secrets set DARAJA_CONSUMER_KEY=... DARAJA_CONSUMER_SECRET=...
#   supabase secrets set DARAJA_SHORTCODE=... DARAJA_PASSKEY=...
#   supabase secrets set MPESA_CALLBACK_URL=... MPESA_CALLBACK_TOKEN=...
# Optional: LLM_BASE_URL LLM_MODEL TTS_PROVIDER=elevenlabs|openai TTS_VOICE_ID TTS_OUTPUT_FORMAT
# Optional: TTS_STABILITY TTS_SIMILARITY_BOOST TTS_STYLE TTS_SPEAKER_BOOST OPENAI_BASE_URL
# Optional: TRANSCRIBE_PROVIDER TRANSCRIBE_MODEL TRANSCRIBE_BASE_URL TRANSCRIBE_LANGUAGE
# Optional: DARAJA_BASE_URL (default is the Daraja sandbox) MPESA_PREMIUM_KES MPESA_PENDING_TTL_MINUTES
```

Deploy with `npm run deploy:process-upload` (this runs the audiobook voice preflight first; a cloned/professional voice needs a completed, active consent record via `TTS_CONSENT_RECORD`).

## Paying with M-Pesa (Kenya)

Install [`supabase/migrations_mpesa_premium.sql`](supabase/migrations_mpesa_premium.sql),
set the six Daraja secrets above, then deploy `mpesa-push`
(`--no-verify-jwt=false`) and `mpesa-callback` (`--no-verify-jwt`). Create
`MPESA_CALLBACK_TOKEN` yourself — a long random string kept out of the repo —
and put the same value in `MPESA_CALLBACK_URL` as `?t=<token>`, because
Safaricom posts the result without a learner session.

The rail is **Android only** (App Store rule 3.1.1 requires in-app purchase for
digital content on iOS) and stays hidden until the `mpesa_premium` release flag
in **Settings → Quality & Operations** is enabled and rolled out. Until then the
paywall behaves exactly as before.

Trust boundaries, enforced by `npm run check:mpesa`:

- the learner sends a phone number and a plan key — never an amount. The price
  comes from `_shared/mpesa.ts` (`MPESA_PREMIUM_KES` can localize it), and the
  ledger stores that server-chosen figure;
- a callback paying less than the recorded amount is marked `failed`, with the
  reason, and grants nothing;
- `mpesa_checkouts` has a select-only RLS policy, so no client can insert a
  `confirmed` row and grant itself premium;
- the callback only settles a `CheckoutRequestID` this server created, compares
  the token at constant time, and refuses everything when the secret is unset;
- a payment is settled once — a replayed callback cannot extend the period;
- premium lapses on its own: `mpesa-push` recomputes `profiles.is_premium` from
  the live paid-through date on every call, and `refreshPremiumStatus` will not
  let a "not entitled" answer from the store clear an in-date M-Pesa period.

Sandbox testing uses `DARAJA_BASE_URL=https://sandbox.safaricom.co.ke` (already
the default), the sandbox shortcode/passkey pair from the Daraja dashboard, and
one of Safaricom's sandbox test MSISDNs. Move to `https://api.safaricom.co.ke`
only after a live KES-1 self-test payment round-trips, then raise
`MPESA_PREMIUM_KES` back to the real price.

### Trigger on upload (recommended)

The function accepts both shapes, so uploads trigger it immediately either way:

- **Storage webhook (immediate, no client change needed):** Supabase Dashboard → Database → Webhooks → Create webhook on table `storage.objects`, events `INSERT`, filter `bucket_id = 'user-materials'`, pointing at your `process-upload` URL. `uploadRawFile()` already writes the `user_uploads` row first, so the function resolves the upload from `record` metadata.
- **Client invocation (fallback, zero dashboard config):** `uploadRawFile()` calls `supabase.functions.invoke('process-upload', { body: { upload_id } })` right after the bucket upload — this path works out of the box.

## Credits, contact and releases

**Bolingo Learn is built and maintained by Freebuff.** No third-party coding
agent, bot account or vendor is credited as a contributor to this codebase. The
AI services the product calls at runtime (OpenAI, ElevenLabs, Deepgram, Groq,
Supabase) are APIs behind the upload, voice and chat features — they are not
contributors, and no bot identity of theirs appears in the app or on the site.

- **Support:** support@bolingo.co.ke · +254 711 617 407 (support, calls &
  WhatsApp) · 0735 336 030 (admin, calls)
- **Feedback inbox for the admin/support team:** bolingolearn@pm.me
- **Contact screen:** `bolingo.co.ke/contact`, and in the app under
  Settings → **Contact & feedback**. A message is stored in Postgres before an
  email is attempted, so nothing is lost when no provider is configured.
- **Automatic releases:** `.github/workflows/release.yml` deploys the website
  and publishes an OTA app update on every push to `coolify-hosting` / `main`
  (needs `COOLIFY_DEPLOY_WEBHOOK` and `EXPO_TOKEN`).
- **Install without a store:** `bolingo.co.ke/install`.

Details: [docs/contact-and-updates.md](docs/contact-and-updates.md),
[docs/install-from-web.md](docs/install-from-web.md).
