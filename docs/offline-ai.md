# Offline-first AI: architecture and device testing

## What runs where

| Question arrives…                          | Answered by                                   |
| ------------------------------------------ | --------------------------------------------- |
| Online, free learner with allowance left   | Cloud tutor (`ask-bingo` edge function)       |
| Online, Premium                            | Cloud tutor (no allowance)                    |
| Offline, allowance spent, or "always offline" | On-device model if one is installed, else lesson search |
| Cloud tutor fails                          | Same local route, labelled in the sheet       |

- Router: `lib/edgeAI/router.ts`. Tutor entry point: `lib/edgeAI/tutor.ts`.
- Lesson search: `lib/edgeAI/retrieval.ts` (BM25 + hashed TF-IDF vectors, light
  stemming, learner→lesson synonyms). It is built in memory from bundled lessons
  plus downloaded course updates (`lib/edgeAI/knowledge.ts`) and never written
  to storage.
- **Grounding rule:** the on-device model only runs when search found lesson
  text (or the screen passed the lesson's theory). Qwen2.5 1.5B, given no
  extracts, ignores "answer only from the extracts" and answers from memory, so
  with nothing to ground it the tutor says the lessons don't cover it.
- On-device runtime: `llama.rn` (llama.cpp), loaded lazily from
  `lib/edgeAI/llamaRuntime.native.ts`. The web build gets the stub in
  `llamaRuntime.ts`. Models are pinned to a Hugging Face commit and verified by
  exact byte size (`lib/edgeAI/edgeEngine.ts`, `lib/edgeAI/modelStore.ts`).
- Boot: `startAutoSync()` and `startEdgeEngine()` in `src/app/_layout.tsx`.

`npm run check:adaptive-ai` (also in `npm run gate`) covers the pure logic and
the screen wiring.

## Verified off-device (Nov 2026)

On a 4-core x86 Linux box, outside the app:

- The Qwen2.5 1.5B file downloaded from the catalog's pinned URL was exactly
  1,117,320,736 bytes, and its SHA-256 matched the catalog.
- llama.cpp (the engine llama.rn wraps) ran it with the app's own prompt: the
  retrieved lesson extracts, the app's system message, and the same sampling
  settings. Answers were correct and grounded ("use the `mv` command…", "a
  class selector targets elements with a class, an id selector a single
  element"), in 3–4 s at about 30 tokens/s.

This does **not** replace a device test: llama.rn's native bindings, the
Android file download, phone memory limits and the UI were not exercised.

## Testing on an Android emulator

The emulator needs hardware acceleration (KVM on Linux, HVF on macOS, WHPX on
Windows). Without it, an x86_64 image is too slow to run a model.

1. Create an AVD: **API 34+, x86_64 image, 6 GB RAM, 16 GB storage**.
2. Build and install a development build, either with
   `npx expo run:android` (needs Android SDK + NDK), or with
   `npx eas-cli@latest build --profile development --platform android` and
   then installing the APK.
3. Sign in with a Premium test account. In debug builds,
   `EXPO_PUBLIC_DEBUG_PREMIUM=1` enables the paywall's debug Premium switch.
4. Settings → **Offline AI & sync** → download **Qwen2.5 1.5B**. Expect a
   1.1 GB download with progress, then "In use".
5. Turn on **Always use offline AI**, open any lesson → **Ask Bingo**, ask
   "How do I move a file to another folder in Linux?". Expect an answer
   labelled "On-device model". The first answer is slower because it loads the
   model.
6. Turn on airplane mode in the emulator and repeat. Expect the same route,
   labelled "you are offline".
7. Finish a quiz offline. Expect the results card "Saved on this device". Turn
   the network back on, then Offline AI → **Sync now**. Expect "Uploaded 1
   lesson result".
8. Cancel a download mid-way and check that no `.part` file remains:
   `adb shell run-as <package> ls files/models`.

Watch `adb logcat | grep -i llama` for runtime errors.
