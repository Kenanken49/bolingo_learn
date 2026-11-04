# AdMob rewarded hearts

The only ad in Bolingo Learn. A learner who spends their last heart sees one
30-second rewarded video; finishing it returns one heart and the lesson
resumes. Nothing else in the product shows an ad, and Premium never does.

```
wrong answer ──► loseHeart() ──► hearts = 0
                                    │
                                    ▼
                        OutOfHeartsSheet (pauses the session)
                          ├─ Watch video ──► +1 heart, lesson continues
                          ├─ Wait 4 hours ──► free regen (no ad)
                          └─ Premium ──────► unlimited hearts
```

## What exists where

| File | Role |
|---|---|
| `lib/adPolicy.ts` | Pure policy: unit selection, retry backoff, who may see an ad. Node-testable. |
| `lib/ads.ts` | Resolves the rewarded unit for this platform from env. |
| `lib/adsRuntime.native.ts` | UMP consent → `MobileAds().initialize()`. Never throws. |
| `lib/adsRuntime.ts` | Web/desktop stub (no SDK). |
| `lib/rewarded/index.native.ts` | `useRewardedHeart` — one ad instance, gated on consent, idempotent reward, bounded retries. |
| `lib/rewarded/index.ts` · `index.web.ts` | Web stubs reporting `available: false`. |
| `components/OutOfHeartsSheet.tsx` | The sheet shown at zero hearts. |
| `components/GamifiedCodePlayer.tsx` | Spends a heart on a wrong answer, blocks grading at zero. |
| `src/app/quiz/[lessonId].tsx` | Persists the spend/grant and opens the sheet. |
| `components/RefillContent.tsx`, `src/app/refill.tsx` | The full refill screen (wait timer, ad, Premium). |
| `scripts/check-ads.cjs` | The gate: behaviour, safety, wiring. |

## Configuration

Two different ids, both from the owner's AdMob account:

| Value | Env var | Where it is read |
|---|---|---|
| **App ID** (`ca-app-pub-…~…`) | `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID` | `app.config.js`, baked in at build time by the config plugin. |
| **Rewarded unit** (`ca-app-pub-…/…`) | `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`, `EXPO_PUBLIC_ADMOB_REWARDED_IOS` | `lib/ads.ts`, read at runtime. |

An App ID is per app; a unit ID is per placement. Mixing them (or reusing the
Android unit on iOS) fails to fill forever, which is why the gate refuses a
single OR chain.

With neither set, the app uses **Google's sample units**. They always fill,
they never bill, and they are the only units a development build, an emulator
or a store-review build may use. The UI says so out loud ("Test ad — Google
sample unit, no revenue") so a test build can never be mistaken for a live one.

## Consent

`startAds()` runs once at app start, before any ad instance exists:

1. `MobileAds().setRequestConfiguration({ maxAdContentRating: PG, testDeviceIdentifiers: ['EMULATOR'] })`.
2. `AdsConsent.gatherConsent()` — the Google UMP form, shown only where the law requires it.
3. `MobileAds().initialize()`, and only then does the rewarded hook pass a unit id.

If consent is denied the runtime reports `denied` and no ad is ever requested;
the sheet falls back to the wait timer and Premium. If the consent call itself
fails (offline, or a build without UMP), a **test** unit is still safe to
request but a live unit is not, so the rail fails closed.

"Emulator" is declared a test device on purpose: ads served to an unregistered
emulator count as invalid traffic on the owner's account.

## Reward rules

- The heart is granted only from Google's `onUserEarnedReward` (`earnedReward`).
  Closing the video early earns nothing.
- One video grants exactly one heart (`HEARTS_PER_REWARDED_AD`), the same as one
  4-hour regen tick. Hearts cap at 5.
- The grant is idempotent per ad: a re-render cannot double-pay an earn event.
- Signed-in learners are persisted through `lib/progress.ts` (`grantHearts`),
  so the heart survives a reinstall and appears on every device. Guests keep a
  session-local count, like the rest of guest mode.
- Premium is checked first and never sees the sheet.

## Failure behaviour

| Situation | What happens |
|---|---|
| No fill / offline | Three retries at 2s, 4s, 8s, then the button explains and the timer path stays open. |
| Loaded but dismissed early | No heart; the next ad is preloaded immediately. |
| Consent denied (EEA) | No ad requested; wait + Premium only. |
| Web / desktop | `available: false`; wait + Premium only. |
| Ad SDK broken by an OTA-free build | The sheet still renders; the wait timer still refills hearts. |

## Verifying

The gate (`npm run check:ads`) covers policy, safety and wiring offline. The
on-device check is:

1. `npx expo run:android` (or install a dev build — the ad SDK is native, so
   Expo Go cannot show one).
2. Sign in, open a lesson, answer wrong five times.
3. The sheet appears with "Test ad — Google sample unit".
4. Tap **Watch a short video · +1 heart** and finish the video.
5. Hearts goes 0 → 1, the sheet closes, the lesson continues, and the heart is
   still there after a reload (signed-in learner).

Log lines to watch: `adb logcat | grep -i "ads\|rewarded"`.

## Going live (production checklist)

1. **AdMob console:** create the app (Android + iOS) → copy each **App ID**
   (`ca-app-pub-…~…`) → create one **Rewarded** unit per platform → copy each
   **unit ID** (`ca-app-pub-…/…`). Never use a test unit in production or tap
   a live ad yourself — both read as invalid traffic.
2. **EAS secrets** (never commit these — they bake into the binary at build
   time):
   ```bash
   eas secret:create  # ADMOB_ANDROID_APP_ID / ADMOB_IOS_APP_ID (build-time)
   ```
   and add the two `EXPO_PUBLIC_ADMOB_REWARDED_*` unit ids the same way
   (runtime). A production build with any of the four missing **fails fast**
   in `app.config.js` instead of shipping a zero-revenue release — unless the
   project carries `ADMOB_ALLOW_TEST_IN_PRODUCTION=1`, the explicit, visible
   opt-out for a deliberately ad-free launch (the sheet keeps saying
   "Test ad", so nobody is misled). Delete that secret the day real units
   land and rebuild.
3. **app-ads.txt:** replace the placeholder publisher id in
   `public/app-ads.txt` with the real Publisher ID (AdMob console →
   Settings → Account information), push, and link the site domain in the
   AdMob console → Settings → app-ads.txt. See `docs/web-publish.md`.
4. Rebuild the **production** profile and confirm the refill sheet no longer
   says "Test ad".

## Operational notes

## Verifying on a device (done)

Verified on the Android 37 emulator with the Google sample unit:

```
[Ads] status idle → loading → loaded
[Ads] show() {"status":"loaded","test":true,"unit":"ca-app-pub-3940256099942544/5224354917"}
[Ads] status showing → closed → loading (next ad preloaded)
```

The full loop, with a throwaway account whose hearts were set to 0: the quiz
player opened the sheet, the sheet's button played the video, "Reward granted"
appeared, the sheet closed on its own, the lesson resumed, and `profiles.hearts`
went 0 → 1 in the database. The temporary account was deleted afterwards.

Guests never spend hearts, so the sheet only exists for signed-in learners: a
guest heart could never be refilled (no row to write) and would dead-end the
lesson.

- The SDK never runs on web, so `expo start --web` stays ad-free.
- Requests are billed by impression, not by load; the preload after a close is
  deliberate and cheap.
- `testDeviceIdentifiers: ['EMULATOR']` does not stop production traffic from
  real devices — the owner's AdMob account is the source of truth for revenue.
- Invalid traffic warning: never tap live ads during development. Keep test
  units until the owner supplies real ones.
