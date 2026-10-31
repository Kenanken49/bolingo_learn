# Audiobook voice configuration

The audiobook engine has one voice configuration, validated in
[`supabase/functions/_shared/audiobookVoice.ts`](../supabase/functions/_shared/audiobookVoice.ts).
The `process-upload` Edge Function, the preview command and
`npm run check:audiobook-voice` all read it. There is no second hard-coded
voice id inside the Edge Function.

The config is deliberately server-side: it is read from Supabase Edge Function
secrets, never from `EXPO_PUBLIC_*` variables, and the TTS API key never reaches
the app bundle. Learners do not choose this voice in Settings; it is an
operator/deployment setting, and the preview command is the audition tool.

## ElevenLabs voice setup

The audiobook uses **one** configured ElevenLabs voice for the full mix and
every segment. It does not switch between Livia, Bingo and Zora, and it does not
clone or train a voice at runtime.

1. **Use a commercial-capable account.** Confirm your ElevenLabs plan permits
   commercial use in a paid learning app, and that the chosen voice is licensed
   for that use. A Voice Library entry can carry its own terms; “available in
   the library” is not the same as “cleared for this product.”
2. **Choose an authorized voice.** Use a voice you created with the speaker's
   consent, or a library voice whose terms cover this use. For a custom or
   professional clone, complete the
   [cloned-voice consent record](voice-consent-record-template.md) before
   deploying the ID and keep the signed copy outside this repository. Copy the
   voice **ID** (not the display name) from the voice page or `GET /v1/voices`.
   The ID is a public identifier; the API key is the secret.
3. **Create a server key.** Create an ElevenLabs API key for text-to-speech and
   store it in a password manager. The key must belong to the workspace that
   owns the voice; a key from another workspace will not see that voice even
   with the correct ID. Set it as the Supabase Edge Function secret `TTS_API_KEY`;
   put the same value in `.env.local` only when running previews. Never use an
   `EXPO_PUBLIC_*` name, commit it, or paste it into chat.
4. **Pick the model.** `eleven_multilingual_v2` is the quality-first choice for
   emotional narration; `eleven_turbo_v2_5` is the lower-latency default.
   Confirm the model supports the language of the material before a full upload.
5. **Set the voice settings.** `TTS_STABILITY`, `TTS_SIMILARITY_BOOST`,
   `TTS_STYLE` and `TTS_SPEAKER_BOOST` are sent as `voice_settings`. The defaults
   (`0.5`, `0.75`, `0`, `true`) are a neutral starting point; audition them
   rather than guessing.
6. **Configure the deployment.** Confirm the cloned-voice consent record's
   pre-deployment gate is complete, then use the env names in the table below
   and deploy. For a cloned or professional voice, also set
   `TTS_CONSENT_RECORD` in `.env.local` to the machine-readable record.

   ```bash
   supabase secrets set TTS_API_KEY=...
   supabase secrets set TTS_PROVIDER=elevenlabs TTS_MODEL_ID=eleven_multilingual_v2
   supabase secrets set TTS_VOICE_ID=<voice-id> TTS_OUTPUT_FORMAT=mp3_44100_128
   supabase secrets set TTS_STABILITY=0.5 TTS_SIMILARITY_BOOST=0.75 TTS_STYLE=0 TTS_SPEAKER_BOOST=true
   npm run deploy:process-upload
   ```

7. **Preflight, validate and audition.** Confirm the configured voice is in the
   key's workspace before deploying, then run the no-network validator and
   generate the two short previews:

   ```bash
   npm run audio:preflight
   # cloned/professional voice without TTS_CONSENT_RECORD in .env.local:
   # npm run audio:preflight -- --consent ../../secure/voice-consent.json
   node scripts/preview-audiobook-voice.cjs
   node scripts/preview-audiobook-voice.cjs --preview --out ./.preview-audio
   ```

   The preflight makes read-only API calls and spends no credits. The preview
   command also verifies the configured voice with a read-only lookup before it
   synthesizes anything, so a deleted voice fails before credits are spent.
   Check names, numbers, punctuation, and any language switching in the
   previews; they spend provider credits, so keep the sample lines short.
8. **Rotate on exposure.** If the key leaks, revoke it in ElevenLabs, set a new
   `TTS_API_KEY`, and redeploy the secret. No app release is required.

### Confirm the deployed TTS key

`TTS_API_KEY` must be the secret value that starts with `sk_`, not the key **ID**
shown in the ElevenLabs key list. Using the ID produces:

```text
API key ID used as API key - only valid API keys can be used.
```

Supabase secrets are write-only, so `supabase secrets list` exposes only a
SHA-256 digest. Confirm the deployment this way:

1. With the licensed key, call `GET https://api.elevenlabs.io/v1/user` and
   `GET https://api.elevenlabs.io/v1/voices/<TTS_VOICE_ID>`. Both must return
   `200`; `/user` gives the `workspace_id`, and the voice response should name
   the licensed voice.
2. Hash the same key locally and compare that digest with the `TTS_API_KEY`
   digest from `supabase secrets list --project-ref <ref>`. Equal digests mean
   the deployment holds that exact key. Do not print the key or its digest in
   shared logs.
3. If the digests differ, rotate from a one-line env file rather than a command
   line, then delete the file:

   ```bash
   supabase secrets set --env-file ./tts-rotate.env --project-ref <ref>
   rm ./tts-rotate.env
   ```

   Redeploying is not required; the next function invocation receives the new
   value. A real upload is the end-to-end check: after rotation it should store
   `<user_id>/audio/<lesson_id>.mp3` and one MP3 per question.

Only rotate to a key that is licensed for this product and belongs to the
workspace that owns the voice. A key from another workspace can authenticate
but will not see a professional voice it does not own.

## Consent requirements

The app does **not** create, train, clone or fine-tune voices itself. It sends
text to the TTS provider with the voice ID you configure. Consent is therefore
about the voice in that configuration, not about learner uploads becoming a
voice model.

Use a voice only when you have the rights to it:

- **Stock or library voice:** confirm the provider's terms and the voice's own
  licence permit commercial narration in a paid app. Check any attribution or
  usage limits before shipping.
- **Custom or professional clone:** obtain explicit written consent from the
  speaker before creating the clone. The consent should cover synthetic
  narration, the Bolingo app and its marketing, territory, duration and
  compensation. ElevenLabs' Professional Voice Cloning flow also requires the
  speaker's verified consent; complete that in the provider account.
- **Minors:** obtain guardian consent and never use a child's voice for adult
  content.
- **No impersonation:** do not use a voice to imply a real person's endorsement,
  impersonate a public figure, or mislead learners. Do not clone a third-party
  audiobook narrator.
- **Record keeping:** complete the
  [cloned-voice consent record](voice-consent-record-template.md) before deploying
  a custom or professional clone. Keep the signed record and provider
  verification outside this repository — a secure ops folder or ticket, not the
  app database. Store the voice ID, consent date, permitted scope and revocation
  contact together. Never commit consent documents or personal data.
- **Revocation:** if consent is withdrawn, remove the voice from the provider
  and from `TTS_VOICE_ID`, stop new generation, and delete stored audiobook MP3s
  that used it. Rotating the voice ID alone does not remove old audio. Deleting
  the upload in My Uploads purges its linked full mix and segments; otherwise
  remove the `<user_id>/audio/...` objects directly.
- **Source material:** do not upload a third-party audiobook or course audio
  without written permission. Audio transcription is still a Phase 2 extension
  point and the pipeline rejects audio today, but the rights rule still applies
  to text you paste or upload.

These are operational requirements, not legal advice: check the current
ElevenLabs terms and the law in your market before shipping a voice.

### Completing the cloned-voice record

Copy [the template](voice-consent-record-template.md) to your secure operations
folder, complete the speaker, scope, provider-verification and signature
sections, and mark the record `Active`. The template's section 8 is the
deployment gate: do not set `TTS_VOICE_ID` until every item is checked. A record
that is unsigned, expired, suspended or revoked is not valid consent, even if
the provider still hosts the voice. Follow section 9 when consent is withdrawn
or the term ends.

See also the project provenance rules in
[language-sources.md](language-sources.md).

## Free versus Premium behavior

The fence is enforced server-side in `process-upload` from
`profiles.is_premium`; the client's premium state is UX only. Free users cannot
obtain new server TTS by asking the app.

| Surface | Free | Premium |
| --- | --- | --- |
| Text upload + AI quiz | `.txt`/`.md`/`.csv`, ≤1,000 words per upload | Supported uploads, 100,000 words per 30-day window |
| Server audiobook TTS | Never | Configured ElevenLabs/OpenAI voice |
| Full mix + segments | None generated | One full-mix MP3 + one MP3 per question |
| Audiobook Mode | Device `expo-speech` over the question prompts | Signed full-mix/segment URLs |
| Quiz narration | Device voice; upgrade hint | Generated segment; device fallback if a URL is missing |
| TTS cost | $0 | Provider charges; the word cap is a guardrail, not a TTS budget |
| Voice preview CLI | Operator only | Operator only |
| Premium narrator audition | Bundled 9-second MP3, free to replay | Bundled sample + generated narration |

Details:

- **Free:** text uploads still get a generated quiz, but the Edge Function
  skips TTS entirely (`fullNarration` stays empty and no segment jobs run). The
  app opens `AudiobookPlayer` in `freeMode` and reads the question prompts with
  the device voice. No full-mix or segment MP3s are stored for that lesson.
- **Premium:** after the quiz is inserted and the upload is marked `ready`, the
  function generates the full mix and one segment per question, stores them in
  the private `user-materials` bucket, and records the manifest on the lesson.
  `AudiobookPlayer` loads only signed URLs; the bucket is never public.
- **TTS failure is non-fatal.** The lesson is already ready before TTS starts,
  so a provider error never blocks the quiz. Premium Audiobook Mode reports
  that audio is not ready until a later run produces it; quiz narration falls
  back to the device voice when a segment URL is absent. A TTS error is logged
  on the upload pipeline, not shown as a broken lesson.
- **The cap is a word ceiling, not a seconds meter.**
  `PREMIUM_MONTHLY_WORD_CAP = 100,000` limits billable upload words over a
  30-day rolling window (`profiles.ai_words_used` / `ai_words_reset_at`). The
  provider bills TTS separately by character/credit, and every preview spends
  credits too. Monitor provider usage as well as the app counter.
- **Non-text formats:** PDF and photo Scan are premium paths. Audio/video
  transcription is still Phase 2: the AI Sandbox does not offer those formats,
  and `process-upload` rejects them with a clear message if one arrives by
  another route. Free users are limited to text files.
- **Downgrading does not delete existing audio.** Server TTS is gated at
  generation time; MP3s already attached to an older lesson remain in storage.
  Delete the lesson/audio deliberately if consent or retention policy requires
  it.
- **The preview command is an operator tool.** It bypasses the learner tier
  check, uses the operator's TTS key, and spends provider credits. Do not expose
  it in the app or call it from a client screen.

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `TTS_PROVIDER` | `elevenlabs` | `elevenlabs` or `openai` |
| `TTS_MODEL_ID` | `eleven_turbo_v2_5` (ElevenLabs) / `tts-1` (OpenAI) | ElevenLabs ids start with `eleven_`; OpenAI accepts `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts` |
| `TTS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | ElevenLabs voice id |
| `TTS_VOICE` | `alloy` | OpenAI voice: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| `TTS_OUTPUT_FORMAT` | `mp3_44100_128` | MP3 only: `mp3_44100_128`, `mp3_44100_192`, `mp3_22050_32`, `mp3_44100_64`, `mp3_44100_96` |
| `TTS_STABILITY` | `0.5` | ElevenLabs voice setting, `0`–`1` |
| `TTS_SIMILARITY_BOOST` | `0.75` | ElevenLabs voice setting, `0`–`1` |
| `TTS_STYLE` | `0` | ElevenLabs voice setting, `0`–`1` |
| `TTS_SPEAKER_BOOST` | `true` | ElevenLabs voice setting |
| `TTS_PREVIEW_FULL_MIX` | built-in line | Optional sample text, max 400 chars |
| `TTS_PREVIEW_SEGMENT` | built-in line | Optional sample text, max 240 chars |

`TTS_API_KEY` is required to synthesize. It is an Edge Function secret and a
local `.env.local` value only. The preview command also accepts
`ELEVENLABS_API_KEY` as a local fallback for the existing `scripts/tts-clip.ts`
workflow. `TTS_PREVIEW_FULL_MIX` and `TTS_PREVIEW_SEGMENT` are read only by the
local preview command; the Edge Function ignores them.

The provider is explicit, not inferred from the voice value: with
`TTS_PROVIDER=openai`, the ElevenLabs `TTS_VOICE_ID` is ignored and `TTS_VOICE`
is used. Set `TTS_PROVIDER=elevenlabs` when you intend to use the ElevenLabs
voice.

## Validate without spending a token

```bash
npm run audio:voice
# or directly:
node scripts/preview-audiobook-voice.cjs
```

This reads `.env.local` if present, applies the defaults, validates every field
and prints the effective configuration. It makes **no network call**. Invalid
providers, models, voice ids, formats, numbers, booleans, preview lengths and
unknown keys all fail with the field name.

## Preview the full mix and a segment

```bash
node --env-file=.env.local scripts/preview-audiobook-voice.cjs --preview
# or:
npm run audio:preview
```

Two short MP3s are written to a fresh OS temp directory (or `--out <dir>`):

- `full-mix.mp3` — a short excerpt of the concatenated full narration, using
  `preview.fullMix`.
- `segment.mp3` — one question-sized line, using `preview.segment`.
- `manifest.json` — provider, model, voice, voice-lookup result, format, voice
  settings, file paths and byte counts.

Before spending credits, `--preview` verifies the configured voice with a
read-only `GET /v1/voices/<TTS_VOICE_ID>`. If the voice was deleted, moved out of
the workspace, or is no longer accessible with the key, the command exits 1,
names the voice ID, and writes neither MP3 nor an output directory. OpenAI voice
names are built in and need no provider lookup.

The preview uses [`buildSpeechRequest()`](../supabase/functions/_shared/audiobookVoice.ts),
the same function the Edge Function calls, so the sample cannot drift from the
real narration request. Before writing a file the command checks that the
response is non-empty and starts with an MP3 header (ID3 or an MPEG frame
sync); a provider error or an HTML error page is rejected.

The full-mix sample is intentionally short. It is not a whole lesson and it is
not mixed with music; it is the same narration voice the full-mix MP3 uses.

Example:

```bash
node --env-file=.env.local scripts/preview-audiobook-voice.cjs --preview --out ./.preview-audio
# .preview-audio/full-mix.mp3
# .preview-audio/segment.mp3
# .preview-audio/manifest.json
```

Do not commit generated audio or `.env.local`; the default temp directory keeps
the repository clean.

## Bundled free sample

The app ships [`assets/audio/premium-narrator-sample.mp3`](../assets/audio/premium-narrator-sample.mp3),
a 9.06-second recording of the default full-mix line in the configured licensed
voice. Free learners can play it from the paywall and from **Settings → Audiobook
voice**; it is bundled locally, so replaying it makes no TTS call, spends no
provider credits and needs no signed URL or sign-in. Premium learners hear the
same sample alongside their generated full mix and segments.

The sample text is the default `AUDIOBOOK_VOICE_DEFAULTS.preview.fullMix` line,
and the checked-in recording is the only generated preview artifact that belongs
in the repository. Regenerate it after changing `TTS_VOICE_ID` or the preview
line, then run the audiobook check:

```bash
npm run audio:preview -- --out ./.preview-audio
cp .preview-audio/full-mix.mp3 assets/audio/premium-narrator-sample.mp3
npm run check:audiobook-voice
```

`assets/narrator.ts` owns the bundled asset and the exact spoken line. Keep the
clip short; it is shipped in the app bundle, not fetched from storage. The
sample must stay within the permitted scope in the voice's consent record.

### On-device playback test

The sample has a real device test, separate from the source-only checks in
`npm test`:

```bash
npx expo start --dev-client --host lan    # in one terminal
npm run test:narrator-sample:device       # in another
```

It needs a connected Android device or emulator with the development build
installed, and Metro on port 8081. An emulator is pointed at the host through
`10.0.2.2`; a physical device uses `adb reverse`. Use a free/guest session: the
paywall card is shown to learners who are not Premium.

The script launches each real screen with `?narratorAudit=1`, a development-only
hook that calls the same `toggleNarratorSample()` handler as the Play button.
This avoids `uiautomator`, which cannot reach an idle state on the continuously
animated screen, while still exercising the production player. It verifies:

- the source still wires both Play buttons and both audit hooks to that one
  handler;
- the dev-only `useNarratorSampleProbe` line appears in `adb logcat` for
  `surface=paywall` **and** `surface=settings`;
- that line reports a playback position past 0.25 s and a non-zero duration,
  proving the bundled player decoded audio rather than only changing state.

Pass `--serial <id>` to choose among devices, `--avd <name>` to boot an emulator,
`--headless` with `--avd`, or `--report <path>` to keep the pass log. The test
force-stops the app between surfaces so each player is measured alone. It never
calls ElevenLabs, OpenAI, or Supabase; the MP3 is local and the only network
traffic is the Metro bundle.

## Verify a real uploaded lesson

The preview command proves the request shape with two short canned lines. The
full-lesson verifier proves the whole narration with **actual lesson content**:
it selects a real `user_uploads` row whose generated lesson is `ready`, rebuilds
the narration exactly as `process-upload` would, and synthesizes the complete
full mix plus **every** question segment with the same licensed voice.

```bash
# See which uploaded lessons exist (id, upload status, question count, stored audio)
npm run verify:lesson-audio -- --list

# Show the planned calls and character count without spending credits
npm run verify:lesson-audio -- --lesson 42 --plan

# Synthesize the full mix and every segment
npm run verify:lesson-audio -- --lesson 42

# Verify the newest ready upload and choose an output directory
npm run verify:lesson-audio -- --out ./.preview-audio/lesson-42
```

Flags: `--upload <uuid>` selects the lesson generated from a specific upload,
`--concurrency 1..3` controls parallel TTS requests, and `--json` prints the
full manifest. `--allow-default-voice` bypasses the licensed-voice guard for
demo-only runs; do not use it for a release check.

### Disposable verification lesson

If you do not have a real upload yet, or do not want to touch one, use the
disposable wrapper. It creates a temporary ready `user_uploads` row, a
generated lesson with three questions, and then runs the same verifier against
it. The rows are removed after a pass, a failed check or a missing voice (in a
`finally` block), and on Ctrl+C; no manual SQL or dashboard cleanup is needed.

```bash
# Create, plan, and remove the temporary lesson without spending credits
npm run verify:lesson-audio:disposable -- --plan

# Run the real full-mix and segment synthesis, then remove everything
npm run verify:lesson-audio:disposable -- --out ./.preview-audio/disposable
```

The verifier flags pass straight through (`--plan`, `--out`, `--concurrency`,
`--allow-default-voice`, `--json`). `--lesson`, `--upload` and `--list` are
rejected because the temporary lesson is always the target. `--keep` leaves the
rows in place and prints the upload id, lesson id and title for debugging.

The helper uses the same `SUPABASE_URL` and server key as the verifier, creates
the rows with `user_id = null` (so they never belong to a learner), marks
`content.verification.disposable`, and gives the lesson a
`Disposable audio verification …` title. A normal interruption is cleaned up;
a `SIGKILL` or power loss can still leave rows, which the title and marker make
easy to find.

Before spending anything the command:

- loads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `.env` / `.env.local`
  (uploaded lessons are private, so a server key is required; it is never
  printed);
- rejects a lesson that is not linked to an upload, or an upload that is not
  `ready`;
- resolves the voice through `audiobookVoiceFromEnv()`, requires the ElevenLabs
  provider, and fails if `TTS_VOICE_ID` is still the built-in placeholder;
- looks the voice up with the configured key, so a key from the wrong workspace
  fails before synthesis;
- checks the remaining ElevenLabs character quota against the lesson's total
  narration length when the subscription endpoint is available.

Artifacts go to `.preview-audio/lesson-<id>-<timestamp>/` (gitignored) or the
`--out` directory:

- `full-mix.mp3` — every question prompt joined with newlines, capped at 4,000
  characters like the Edge Function;
- `segments/01.mp3`, `02.mp3`, … — one MP3 per question, each capped at 1,000
  characters;
- `manifest.json` — lesson/upload identity, voice id, model, settings, voice
  name, per-artifact bytes, frames, duration and SHA-256, plus the pass/fail
  checks.

The manifest reports whether the stored audio manifest still matches the
current question rows, whether the full mix covers every prompt before the
4,000-character cap, and whether every artifact parsed as playable MP3. A
non-zero exit means at least one call failed or one check did not pass; nothing
is uploaded to Storage and no lesson rows are modified.

This is an operator command, not part of `npm test`: it spends provider credits
(one call for the full mix plus one per question) and needs a lesson linked to
a ready upload. If no uploaded lesson exists yet, use the disposable wrapper
above or create one through **My Uploads** in the app first — the command exits
with a clear message instead of falling back to canned text.

## What is validated

- Provider is `elevenlabs` or `openai`.
- The model belongs to the selected provider (an ElevenLabs model on OpenAI, or
  vice versa, is rejected).
- `voiceId` is a provider-shaped id (10–64 letters, digits, hyphens,
  underscores).
- OpenAI voice is one of the six supported names.
- Output format is one of the MP3 formats the pipeline can store.
- `stability`, `similarityBoost` and `style` are finite numbers in `0`–`1`.
- `useSpeakerBoost` is a boolean (the strings `true`/`1`/`yes`/`on` and
  `false`/`0`/`no`/`off` are accepted from env).
- Preview lines are non-empty and within their length limits.
- Unknown keys are rejected, so a typo in a config object cannot silently do
  nothing.

## Preflight the voice before deployment

```bash
npm run audio:preflight
```

This is the deployment gate for the configured ElevenLabs voice. It:

1. Validates the shared `TTS_*` configuration and refuses a non-ElevenLabs
   provider or the built-in placeholder voice.
2. Calls `GET /v1/user` with the configured key and records the key's
   `workspace_id`.
3. Calls `GET /v1/voices/<TTS_VOICE_ID>` to confirm the voice is readable.
4. Calls `GET /v1/voices` and requires the configured ID to appear in the
   workspace's own voice list.
5. If the voice category is `cloned` or `professional`, requires a completed,
   active consent record via `--consent <file>` or `TTS_CONSENT_RECORD`.

Step 4 matters: a key can sometimes read a shared or library voice that is not
in its workspace. That voice is not a safe deployment choice, so the command
exits `1` with a message instead of letting TTS fail later. It also exits `1`
for an invalid key, a key ID used as the secret, a missing voice, a workspace
listing error, or a missing/invalid cloned-voice consent record.

```bash
# machine-readable result for CI
npm run audio:preflight -- --json
```

### Cloned-voice consent record

A voice with category `cloned` or `professional` is a cloned voice. The
preflight refuses to finish for one unless you provide a completed, active
record:

```bash
npm run audio:preflight -- --consent ../../secure/voice-consent.json
# or set this in .env.local (never commit that file):
# TTS_CONSENT_RECORD=../../secure/voice-consent.json
```

`--consent` wins over `TTS_CONSENT_RECORD`. The record must match the configured
`TTS_VOICE_ID` and the key's workspace; a record for another voice or workspace
is rejected. Complete the signed Markdown
[cloned-voice consent record](voice-consent-record-template.md) first; the JSON
is a machine-readable companion, not a replacement.

```json
{
  "templateVersion": "2026-10-30",
  "recordId": "VC-2026-001",
  "status": "Active",
  "completed": true,
  "provider": "ElevenLabs",
  "voiceId": "ezWcjzmShLr2IarIA07u",
  "workspaceId": "302af46e251b4a7783b3601c64b4cdc1",
  "voiceType": "Professional Voice Clone",
  "speaker": "Speaker legal name",
  "signedOn": "2026-10-30",
  "reviewDueOn": "2027-10-30",
  "approvedBy": "Operator name",
  "approvedOn": "2026-10-30"
}
```

`completed: true` attests that the signed record is complete, including the
speaker signature and provider verification. `status` must be `Active`.
`reviewDueOn` is optional, but a past date fails the gate. Dates use `YYYY-MM-DD`
and cannot be in the future. The preflight output includes the record ID and
dates, not the speaker's personal details.

`npm run deploy:process-upload` runs the preflight automatically before
`supabase functions deploy process-upload`. For a cloned voice, set
`TTS_CONSENT_RECORD` in `.env.local` or the CI environment so the deploy script
finds the record. Run the standalone preflight after rotating `TTS_API_KEY`, and
whenever `TTS_VOICE_ID` changes. It never prints the key. `--base-url` exists
only for the local stub test.

## Deploying

For a cloned or professional voice, add the machine-readable record path to
`.env.local` (never commit it) or the CI environment:

```bash
TTS_CONSENT_RECORD=../../secure/voice-consent.json
```

Then set the secrets on the Edge Function and use the gated deploy script:

```bash
supabase secrets set TTS_API_KEY=...
supabase secrets set TTS_PROVIDER=elevenlabs TTS_MODEL_ID=eleven_multilingual_v2
supabase secrets set TTS_VOICE_ID=<voice-id> TTS_OUTPUT_FORMAT=mp3_44100_128
supabase secrets set TTS_STABILITY=0.5 TTS_SIMILARITY_BOOST=0.75 TTS_STYLE=0 TTS_SPEAKER_BOOST=true
npm run deploy:process-upload
```

`deploy:process-upload` runs the voice preflight first. If the key, workspace,
voice or provider guard fails, or a cloned voice has no valid consent record,
the preflight exits non-zero and the function is not deployed. Run
`npm run audio:preflight` on its own when you only want to check the
configuration.

The pipeline validates the same values at TTS time. A bad value fails the audio
jobs with a field-specific message while the already-ready quiz stays usable.

## Automated guard

```bash
npm run check:audiobook-voice
# also part of npm test
```

The check executes the real shared validator against valid and invalid configs,
inspects the ElevenLabs and OpenAI request shapes, verifies the 4,000-character
cap, and confirms the Edge Function, preview command, package scripts and this
document still point at the shared module. It also proves the full-mix and
segment requests resolve to the same voice and model on **both** providers,
with matching ElevenLabs voice settings, that both narration paths go through
one `synthesizeAudio()` / `buildSpeechRequest()` path, and that the full-lesson
verifier keeps using the shared builder and stays out of `npm test`.

The ElevenLabs stub test is a real end-to-end preview run, not just a request
shape assertion. It starts a local HTTP stub, then spawns
`preview-audiobook-voice.cjs --preview` with `TTS_PROVIDER=elevenlabs`. A
test-only preload ([scripts/elevenlabs-stub-preload.cjs](../scripts/elevenlabs-stub-preload.cjs))
reroutes only `https://api.elevenlabs.io` to the stub, preserving the path,
query, headers and body. The test captures the read-only voice lookup before
the synthesis requests and asserts the full mix and segment use the same voice
ID in the URL, the same `model_id`, the same voice settings, their distinct
preview texts, and a manifest with that voice ID, model and lookup result. A
separate deleted-voice stub proves a 404 fails with a clear "no longer exists"
message, makes zero synthesis requests, and creates no output directory. The older OpenAI stub test now makes the same explicit identity
assertions: both preview requests must share the endpoint, model, voice and
response format, and the manifest must report that provider, model and voice.
The preflight stub test runs the real preflight against a local API stub and
proves it accepts a voice listed in the workspace, rejects a voice that is only
directly readable but absent from `/v1/voices`, refuses a non-ElevenLabs
provider, and requires a completed `Active` consent record for a cloned voice
while rejecting Draft, expired and wrong-voice records. None of the stub checks
makes a real network call or spends credits.
