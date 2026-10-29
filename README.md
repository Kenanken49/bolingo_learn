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
3. Create tables: run `supabase/schema.sql` in the Supabase SQL editor.
4. Start:
   ```bash
   npm start
   ```
   Then press `w` (web), `a` (Android), or `i` (iOS).

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # celebration cue is exactly 5.000s
npm run lint        # ESLint (expo lint)
```

The audio check reads the WAV header directly, so it also guards against a
re-export silently changing the cue's sample rate or frame count.

## Edge Functions

- `supabase/functions/streak-reset` — reset stale streaks (schedule daily via cron).
- `supabase/functions/premium-webhook` — toggle `profiles.is_premium` from a payment webhook.

Deploy with the Supabase CLI:

```bash
supabase functions deploy streak-reset
supabase functions deploy premium-webhook
```

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

## Pronunciation (Livia & Bingo)

Language lessons are voiced by [lib/pronunciation.ts](lib/pronunciation.ts):
Livia models every target phrase in its own language and Bingo narrates the
English around it. Pitch stays at 1.0 — pitch-shifted TTS drags its formants and
sounds foreign — so the characters differ by pacing (Livia 0.86, 🐢 0.62; Bingo
0.98) and, in English lessons, by using different installed voices. The engine
fills gaps with the answer being taught, drops English glosses, keeps accents
and restores question intonation, prefers enhanced/neural voices, excludes
novelty voices, and falls back to a vowel-compatible voice (Swahili → Italian)
when no native voice is installed. The phrase plays when an exercise opens, and
a miss is followed by a slow replay of the correct sentence. Details and the QA
checklist: [docs/pronunciation.md](docs/pronunciation.md).

## Core loop (Path Map ➔ Quiz Player ➔ Loss Aversion)

Expo Router (`src/app/`) drives the habit loop:

1. **Path Map** (`/`): Duolingo-style winding track of circular nodes — 🔥 streak / ⭐ XP / ❤ hearts top bar; completed nodes turn gold 🏆, the active node pulses, locked nodes are greyed 🔒 (sequential unlock once signed in). The **🧠 AI Sandbox** FAB opens an upload panel (books, PDFs, audio via the system picker → `user-materials` → pipeline); each finished upload renders a **My Custom Revision** node, with in-flight uploads shown as ⏳ nodes and live statuses.
2. **Quiz Player** (`/quiz/[lessonId]` + [components/GamifiedCodePlayer.tsx](components/GamifiedCodePlayer.tsx)): the reusable core game engine — tap-token assembly (`correctChain` vs `scrambledTokens`), animated top progress bar, hearts via `progress.ts`, cheerful/soft correction chimes from [assets/sounds.ts](assets/sounds.ts) on `expo-audio`, and the 🔊 audiobook anchor (plays the generated narration URL when present, premium-locked hint otherwise). The screen is a thin wrapper: loads demo or Supabase questions (multiple-choice collapses to one token, drag-and-drop splits the stored answer chain), attaches signed segment URLs as `audioUrl`, and handles completion/streak.
3. **Loss-Aversion Screen** (`/refill`, modal): real AdMob rewarded video (+1 heart only on `EARNED_REWARD`, [lib/ads.ts](lib/ads.ts) unit config with Google test ids in dev), live 4-hour countdown from `hearts_refilled_at`, Premium upgrade (honest placeholder — RevenueCat/Stripe plugs in here). Meta Audience Network skipped (deprecated); AdMob serves iOS + Android.

Progress helpers live in [lib/progress.ts](lib/progress.ts) (`getProfile`, `completeLesson`, `loseHeart`, `grantHearts`, `refillWaitRemaining`); guest mode plays with local state only.

## EAS builds (device testing)

`eas.json` ships three profiles: `development` (dev client + `EXPO_PUBLIC_DEBUG_PREMIUM=1`), `preview` (internal channel), `production`. `app.config.js` (replacing `app.json`, kept as `app.json.bak`) reads AdMob app ids from `ADMOB_*_APP_ID` with Google sample ids as fallback.

```bash
npm i -g eas-cli
 eas login
 eas init            # fills in extra.eas.projectId in app.config.js
 eas build --profile development --platform android  # first real-device test
 eas build --profile preview --platform all          # internal sharing
 eas build --profile production --platform all        # store submission
```
Set secrets with `eas secret:create` (or EAS dashboard → Environment variables): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, AdMob + RevenueCat keys. Install the dev build, open it, then run `npx expo start --dev-client` and scan the QR.

### OTA updates (no rebuild)

`runtimeVersion` tracks the app version, so JS-only changes (screens, quiz logic, styles) ship instantly:

```bash
 eas update --branch preview --message "Tweak lesson copy"
 eas update --branch production --message "Fix quiz scoring"
```
After `eas init`, replace `your-eas-project-id` in `app.config.js` (`updates.url`) with the real id. Native changes (new SDKs, AdMob/RevenueCat config, splash/icon) still need a rebuild — OTA covers JS only.

## Premium paywall (RevenueCat)

`/paywall` (modal, linked from the Path tier badge and refill): loads the current offering's monthly package via `Purchases.getOfferings()`, `purchasePackage` on subscribe, `restorePurchases`, and syncs the `premium` entitlement into `profiles.is_premium` ([lib/purchases.ts](lib/purchases.ts)). Setup: create the `premium` entitlement + $7.70/mo product in RevenueCat, add `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` / `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. `__DEV__` includes a debug premium toggle (needs `EXPO_PUBLIC_DEBUG_PREMIUM=1` for the auto-unlock path).

## Freemium fence (cost control)

AI/TTS burn is fenced behind Premium ($7.70/mo — wire RevenueCat/Stripe where the upgrade buttons point):

- **Free:** raw text files only (picker filters to `text/*`), ≤1,000 words per upload (client pre-check in `lib/tiers.ts` + authoritative Edge Function enforcement), and no server TTS — Listen mode and quiz narration use the phone's built-in robot voice via `expo-speech` ([lib/voice.ts](lib/voice.ts)), $0.
- **Premium:** PDF/audio uploads, smart LLM compilation, elite ElevenLabs/OpenAI voices, and a 100,000-word monthly ceiling (`profiles.ai_words_used` / `ai_words_reset_at`, 30-day rolling reset; a 500-page book bills past the cap and is rejected). Server enforces everything — the client check is UX only.

## Listen to Audiobook Mode

Tapping **🎧 Listen to Audiobook Mode** on the home screen loads the newest user-generated lesson and renders [components/AudiobookPlayer.tsx](components/AudiobookPlayer.tsx) (`expo-audio`): segments stream one after another from signed bucket URLs while the matching text block highlights — Audible/Blinkist style. Cards are tappable to jump, with ⏮/⏭, play/pause, and a block counter with elapsed/total time. Signed URLs come from [lib/audiobook.ts](lib/audiobook.ts) (`loadLatestAudiobook()`); the private bucket never goes public.

## Notes

- Node 22+ is recommended for Expo SDK 58 (`node -v`). The project installs on Node 20 with engine warnings.
- After adding native libraries, use a development build (`npx expo run:android|ios`) or EAS — Expo Go only includes bundled native modules.
- Web uses the Metro bundler (`app.json` → `web.bundler: metro`) as required by NativeWind.

## Async curriculum pipeline

User Uploads ➔ Storage (private `user-materials` bucket) ➔ `process-upload` Edge Function (fires on upload) ➔ LLM (DeepSeek default, GPT-4o supported) curates JSON quiz ➔ TTS (ElevenLabs default, OpenAI supported) generates the audiobook.

1. Client uploads via `uploadRawFile()` in [lib/uploads.ts](lib/uploads.ts) — file lands at `<user_id>/<file_name>`, a `user_uploads` row is created (`processing`), and `process-upload` is invoked.
2. **AI Curation Engine:** the function downloads the file and extracts text — Text/Markdown parsed directly as a string, PDFs via the lightweight `pdf-parse` wrapper (`npm:pdf-parse` in the Deno runtime); audio transcription stays a Phase 2 extension point. It sends the text to a cost-effective LLM (DeepSeek-V3 default via `LLM_MODEL=deepseek-chat`, or GPT-4o-mini via `LLM_BASE_URL`/`LLM_MODEL`) with strict instructions — top 5 concepts × exactly 3 quiz elements, JSON schema `[{ type: multiple-choice | drag-and-drop, prompt, options, answer }]`, nothing but valid JSON. The payload is schema-validated, then inserted as one `lessons` row (`is_user_generated = true`, tagged to the user, linked via `upload_source_id`) plus one `questions` row per element.
3. **Audiobook engine:** it synthesizes narration audio and stores it in the same bucket — one full-mix `<user_id>/audio/<lesson_id>.mp3` plus one segment MP3 per quiz element (`<user_id>/audio/<lesson_id>/<n>.mp3`, failures non-fatal) — records the segment manifest in the lesson, and flips the upload to `ready` (or `failed` on error). Voice knobs: `TTS_PROVIDER=elevenlabs|openai`, `TTS_MODEL_ID` (`eleven_multilingual_v2` for emotional nuance/breathing, `eleven_turbo_v2_5` for speed), `TTS_VOICE_ID` (ElevenLabs voice), `TTS_VOICE` (`alloy|shimmer|onyx` for OpenAI `tts-1`).

Edge Function secrets (Supabase dashboard → Edge Functions → Secrets):

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 supabase secrets set LLM_API_KEY=... TTS_API_KEY=...
# Optional: LLM_BASE_URL LLM_MODEL TTS_PROVIDER=elevenlabs|openai TTS_VOICE_ID OPENAI_BASE_URL
```

Deploy with `supabase functions deploy process-upload` (plus `streak-reset`, `premium-webhook`).

### Trigger on upload (recommended)

The function accepts both shapes, so uploads trigger it immediately either way:

- **Storage webhook (immediate, no client change needed):** Supabase Dashboard → Database → Webhooks → Create webhook on table `storage.objects`, events `INSERT`, filter `bucket_id = 'user-materials'`, pointing at your `process-upload` URL. `uploadRawFile()` already writes the `user_uploads` row first, so the function resolves the upload from `record` metadata.
- **Client invocation (fallback, zero dashboard config):** `uploadRawFile()` calls `supabase.functions.invoke('process-upload', { body: { upload_id } })` right after the bucket upload — this path works out of the box.
