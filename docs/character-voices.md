# Character voices — Livia, Bingo and Zora on ElevenLabs

The three teaching characters speak with real ElevenLabs voices when the
`character-voice` Edge Function answers, and with the device voice when it does
not. The device path is not a legacy fallback to be removed: it is what keeps a
lesson working offline, signed out, on a Swahili line, or during a provider
outage.

## Casting and tuning

`supabase/functions/_shared/characterVoices.ts` is the only place that decides a
character's voice or delivery. The Edge Function, the client and
`scripts/check-character-voices.cjs` all read it.

| Character | Voice | Stability | Similarity | Style | Speed | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Livia | Alice — Clear, Engaging Educator | 0.62 | 0.82 | 0.08 | 0.92 | The learner copies her pronunciation, so steadiness beats personality. |
| Bingo | Chris — Charming, Down-to-Earth | 0.38 | 0.75 | 0.34 | 1.04 | The host carries the celebration; a little variation is the point. |
| Zora | Matilda — Knowledgeable, Professional | 0.50 | 0.80 | 0.20 | 0.98 | A build coach is clipped and precise, and code identifiers stay intelligible. |

All three use `eleven_multilingual_v2`. It is the only ElevenLabs model that
covers every character's teaching language (English, Spanish, French, German).
**Swahili is not in that model's language list**, so a Swahili line never reaches
ElevenLabs: the endpoint answers `{ fallback: true, reason: 'language' }` and the
device voice (or one of Livia's bundled Fliki takes) speaks it. Reading Swahili
with English phonetics would be worse than the honest robot voice.

## Request path

```
speakAs() / speakSegments()      lib/pronunciation.ts
  → studioPlayer (registered in src/app/_layout.tsx)
  → playStudioLine()             lib/studioVoices.ts
  → POST /functions/v1/character-voice
      ├─ auth: the caller's JWT, verified with getUser()
      ├─ cache hit  → signed URL, no synthesis, no credits
      └─ cache miss → ElevenLabs → MP3 → user-materials/character-audio/<character>/<sha256>.mp3
  → null (any failure) → device TTS
```

The cache key is the character's voice id, every tuning value, the language and
the whitespace-normalized text. Two learners meeting the same line pay for it
once; retuning a character writes a new object instead of serving the old
delivery.

`lib/pronunciation.ts` stays free of `expo-audio` and network imports on
purpose: the Node guards run the real speaking path with no studio player
installed, which is exactly the offline behaviour the app has to keep.

## Failure behaviour

The studio layer is best effort, in this order:

1. Unsupported language → no request at all.
2. Signed out, no function, network error, provider error → device voice.
3. Three consecutive failures → the studio layer stops trying for the session,
   so a dead endpoint cannot add latency to every line.
4. Playback never starts (a browser blocking autoplay, a bad clip) → the
   timeout does **not** count as a played line; the device voice speaks instead.

## No product limits

There is no per-day, per-user or per-line allowance: a character may speak as
much as the lesson asks. The only ceiling is ElevenLabs' own per-request limit
for `eleven_multilingual_v2` — 10,000 characters — which is far beyond any line
the app produces. A 1,151-character paragraph was synthesized in 4.3 s as one
`eleven_multilingual_v2` request, so nothing in the app truncates a character.

Because every unique line is a paid synthesis the first time it plays, the cost
of going without limits is bounded only by how much new text learners hear. The
cache, not a quota, is what keeps that cheap: repeats are signed URLs.

## Deploying

```bash
supabase secrets set TTS_API_KEY=<elevenlabs key>   # same secret the audiobook pipeline uses
supabase functions deploy character-voice
```

Without `TTS_API_KEY` the function answers `fallback: true` and the app stays on
the device voice — no crash, no silence. The audiobook pipeline uses the same
secret, so setting it also turns on Premium server narration.

## Verifying

```bash
node scripts/check-character-voices.cjs   # registry, request shape, wiring, copy
```

That gate makes no network call. To prove the voices themselves still exist on
the account, synthesize each character once with the registry's own builder
(there is no separate preflight for characters; the audiobook preflight covers
the narrator ids).

### On a device

Development builds log one line per character line, which is how the Android
run below was verified — `adb logcat -s ReactNativeJS:V | grep CharacterVoice`:

```
[CharacterVoice] livia studio Alice — Clear, Engaging Educator cache=miss 1388ms
[CharacterVoice] livia played 8134ms
[CharacterVoice] bingo studio Chris — Charming, Down-to-Earth cache=miss 786ms
[CharacterVoice] bingo played 6819ms
[CharacterVoice] zora studio Matilda — Knowledgeable, Professional cache=miss 4427ms
[CharacterVoice] zora played 6962ms
[CharacterVoice] livia fallback language=sw
```

`played` is the honest part: it only appears once the player reported audio
moving, so a clip that never started cannot show up as a success. The same
button tapped again logs `cache=hit` with the clip starting immediately.
