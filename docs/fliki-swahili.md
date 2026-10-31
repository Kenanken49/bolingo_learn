# Natural Swahili lesson narration (Fliki)

Livia's three new Swahili phrase lessons can play natural, human-sounding
Swahili instead of the phone's synthesizer. The clips are generated **ahead of
time** with the [Fliki API](https://developer.fliki.ai/docs/api/generate/tts) and
bundled with the app: playback needs no API key, no network and no per-play
credit. The Fliki key is an operator secret and never reaches a device.

The path is intentionally separate from the audiobook engine in
[audiobook-voice.md](audiobook-voice.md). Audiobooks use server-side
ElevenLabs/OpenAI; these Swahili lesson clips are build-time assets.

## What is covered

`scripts/lib/swahili-phrases.cjs` derives the list from the lesson banks, so a
new question cannot silently ship without narration. It currently covers every
spoken phrase in:

- `swahili-questions` — questions and negation
- `swahili-adjectives` — adjective agreement
- `swahili-health` — health and emergencies

Each clip is keyed by the normalized phrase (`Je`, `Nisaidie!` and `je` all
resolve to the same key). The typed map lives in
[`assets/audio/swahili/clips.ts`](../assets/audio/swahili/clips.ts), the
reviewable metadata in `assets/audio/swahili/manifest.json`, and the MP3s beside
them.

## 1. Create and store the key

1. Open **Fliki → account → API** (`https://app.fliki.ai/account/api`), create a
   key for text-to-speech, and keep it in a password manager.
2. Put it in `.env.local` — **not** in chat, source control, an `EXPO_PUBLIC_*`
   variable, or a screenshot:

   ```bash
   FLIKI_API_KEY=...
   ```

3. Confirm your Fliki plan permits the intended commercial distribution. The
   generator requires `--confirm-rights` so this is a deliberate step.

`.env.local` is ignored by git. If a key is ever exposed, rotate it in Fliki and
replace the local value; no app release is needed.

## 2. Find a Swahili voice

```bash
node scripts/generate-fliki-swahili.cjs --list-voices
# npm alias: npm run swahili:fliki:voices
```

The command prints Fliki's Swahili language and dialect, every available voice
(ID, name, gender, Ultra flag and style IDs), and the one that would be chosen.
Selection is deterministic: Kenyan Swahili first, then Tanzanian, then Ugandan;
within that, an Ultra realistic female voice is preferred, with the name as the
tie-breaker. That matches Livia's feminine cast while keeping reruns stable.

Pin a specific voice for a release by adding its ID to `.env.local`:

```bash
FLIKI_VOICE_ID=...
FLIKI_VOICE_STYLE_ID=...   # optional; omit for the voice's neutral read
FLIKI_VOICE_NAME=...       # optional human label, not sent to Fliki
```

The generator refuses to mix voices: if an existing manifest was made with a
different voice, it stops until you rerun with `--force`, which regenerates
every clip in the new voice.

## 3. Preview the phrase list

```bash
node scripts/generate-fliki-swahili.cjs --dry-run
# npm alias: npm run swahili:fliki -- --dry-run
```

This reads the lesson banks, prints all 15 phrases and the output directory, and
makes **no network call and spends no credits**. Use `--json` for a
machine-readable list.

## 4. Generate

```bash
node scripts/generate-fliki-swahili.cjs --confirm-rights
# npm alias: npm run swahili:fliki -- --confirm-rights
```

What happens:

1. Each phrase is sent to `POST /v1/generate/text-to-speech` with the selected
   voice, 48 kHz MP3 output and neutral playback rate.
2. The returned MP3 is downloaded, checked for an ID3/frame-sync header, and
   written to `assets/audio/swahili/<slug>.mp3`.
3. `manifest.json` records the provider, voice, duration, lesson and question.
4. `clips.ts` is regenerated. Do not hand-edit it; the next run overwrites it.

Generation is sequential and polite to the API. It costs Fliki credits per
phrase. Existing valid files are reused, so rerunning after a failure only fills
the gaps. To audition one phrase first:

```bash
node scripts/generate-fliki-swahili.cjs --confirm-rights --limit=1
```

A `--limit` run is a partial set; rerun without it to finish. The checker fails
while the set is incomplete so partial narration cannot ship unnoticed; set
`FLIKI_ALLOW_PARTIAL=1` only while deliberately auditioning a slice.

## 5. Verify

```bash
node scripts/check-fliki-swahili.cjs
# npm alias: npm run check:fliki; also part of npm test
```

The check is offline. It validates the phrase inventory, deterministic voice and
dialect selection, the request/response shapes, MP3 headers, the app wiring and
the env/documentation contract. Once clips exist it additionally proves:

- every manifest clip still maps to a current lesson phrase;
- every MP3 exists, is non-trivial and starts with a valid MP3 header;
- the manifest marks the set complete and every lesson phrase has a clip;
- every clip has a duration and the typed map contains the matching
  `require('./<file>.mp3')`;
- no API key or bearer token was written into generated assets.

## Runtime behavior

In `components/GamifiedCodePlayer.tsx`, Livia's Swahili phrase tries the bundled
Fliki clip first:

- automatic phrase playback on exercise open (sound preference respected);
- **Hear Livia** and the 🐢 slow replay;
- the slow correction after a wrong answer.

If no clip exists for that phrase, the app falls back to the installed
`sw-KE`/`sw-TZ`/`sw-UG` device voice. Spanish, French, German and English
lessons are unchanged and stay entirely on-device. Starting Bingo, narration or
another Livia line stops the natural clip, and leaving the exercise stops it
too.

Slow playback is pitch-corrected, so Livia sounds slower rather than deeper.

## Adding lessons or changing a phrase

- Add the new lesson ID to `SWAHILI_LESSON_IDS` in
  `scripts/lib/swahili-phrases.cjs`; the generator and checker both pick it up.
- Rerun `node scripts/generate-fliki-swahili.cjs --dry-run` to review the new
  inventory, then generate without `--force` (existing clips are reused).
- If a phrase changed, its key changes, so the old clip becomes stale. Generate
  the new one and remove the orphaned MP3 deliberately after listening; the
  checker rejects a manifest entry that no longer maps to a lesson.

Clips are bundled assets: changing them requires a new app build/release. If
lesson audio must be updated without a release later, move the same manifest to
Supabase Storage and keep the device-voice fallback; do not add the Fliki key to
the client.

## Rights, consent and privacy

- Use only Fliki output your plan licenses for commercial use in Bolingo Learn, and
  keep the plan/voice record outside the repository.
- Do not use a voice to impersonate a real person or imply an endorsement. A
  custom/cloned voice needs the speaker's explicit written consent covering
  synthetic narration, distribution, territory and duration.
- Generated lessons are text, not learner recordings. The speak-back feature
  stays on-device (see [pronunciation.md](pronunciation.md)).
- Never commit `.env.local`, the API key, or a Fliki response containing a
  signed URL.

These are operational rules, not legal advice. Check the current Fliki terms and
the law in your market before shipping.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `FLIKI_API_KEY is missing` | Add it to `.env.local`; do not paste it in chat. |
| `no Swahili language row` / `no Swahili dialect` | Check your Fliki account's API access with `--list-voices`; report the catalog back without sharing the key. |
| `configured FLIKI_VOICE_ID is not available` | Run `--list-voices` and use an ID from that Swahili dialect, or unset the variable to let the deterministic pick run. |
| Voice mismatch on rerun | Add `--force` only when you intend to replace every clip. |
| Partial set failure | Rerun without `--limit`; use `FLIKI_ALLOW_PARTIAL=1` only while auditioning. |
| `npm run` exits 1 with no output on Windows | Run the `node scripts/...` command directly; the generator loads `.env.local` itself. |
| Playback still sounds robotic | The phrase has no clip (run `--dry-run`), a clip file is missing, or this is a non-Swahili lesson/device fallback. Check `npm run check:fliki`. |
| `401`/`403` from Fliki | Rotate/verify the key in Fliki; the app itself never sends it. |
