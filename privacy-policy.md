# Privacy Policy — Bolingo Learn

**Effective date:** 6 November 2026 · **Contact:** support@bolingo.co.ke

Bolingo Learn ("we") is an educational quiz app. This policy describes what
we collect, why, and your choices. It covers the mobile app on iOS and
Android (and web preview where available).

## 1. Data we collect

**Account data (Supabase auth + `profiles` table).** Email address and
authentication identifiers needed to sign you in and sync progress: XP,
streak count, diamonds and refill timestamps, lesson completions, and premium
status. Legal basis where applicable: contract (providing the service).

**Your uploads (`user-images`/`user-materials` storage, `user_uploads`).**
Files you choose to upload (text, PDF, audio) are stored privately in your
account and processed to generate lessons, quiz questions, and audiobook
narration. We do not publish, share, or sell your uploads. Other users
cannot access them (per-user storage policies + row-level security).

**Generated content (`lessons`, `questions`).** Quiz items and narration
derived from your uploads, tagged to your account only.

**Purchases (RevenueCat).** Subscription status for the `premium`
entitlement and transaction metadata from Apple/Google. We never see or
store your card details — those stay with the app store.

**Ads (Google AdMob).** Rewarded video ads use Google's advertising
identifier and standard ad-serving data (device info, approximate location
from IP, ad interactions) under Google's policies. No rewarded-ad viewing
history is attached to your account beyond the diamond refill it earns.
Ads are optional: they appear only when you run out of diamonds and choose to
watch one. Before any ad is requested we ask Google's consent management
platform whether you have consented — in the EEA, UK and other regions where
it applies you will see a consent form, and declining it means no ad is ever
requested for your device. You can revisit that choice any time in Settings
→ Ad privacy options. Choosing “wait for a free refill” or Premium instead
never contacts an ad server at all.

**On-device only (never leaves your phone).** Quiz answers, audio playback
position, and free-tier device-voice (expo-speech) narration happen locally.

**What we do NOT collect.** No analytics SDK, no crash reporter, no
location tracking, no contacts, no public user-generated content feed.

## 2. How we use data

- Operate the service: auth, progress sync, lesson generation, audiobooks.
- Enforce freemium limits: word counts against the 100k/month premium
  ceiling and 1,000-word free cap.
- Serve rewarded ads (AdMob) and verify premium status (RevenueCat).
- Prevent abuse and debug errors (server logs retained ≤30 days).

## 3. Sharing

- **Supabase** (database, auth, storage, edge functions) — subprocessors
  hosting your account and content.
- **Google AdMob** — ad delivery per Google's privacy policy.
- **RevenueCat + Apple/Google stores** — subscription verification.
- Legal compliance or safety where required by law.

We do not sell personal data. We do not share uploads with advertisers.

## 4. Retention

Account and content data persist until you delete your account. Server logs
≤30 days. Purchase records follow store/RevenueCat retention. Uploads and
generated lessons are deleted with the account (cascade delete).

## 5. Your rights

Access, correct, export, or delete your data: use in-app account controls
or email support@bolingo.co.ke. Deleting your account removes your
profile, uploads, lessons, and questions. EU/UK users may lodge a complaint
with their supervisory authority; California users may exercise CCPA/CPRA
rights at the same address.

## 6. Children

Bolingo Learn is a general-education app not directed at children under 13
(16 in the EEA). We do not knowingly collect children's data; contact us
for removal.

## 7. Security

Transport encryption (TLS), Supabase row-level security + private storage
buckets scoped per user, service-role keys kept server-side only. No
method is 100% secure — report issues to support@bolingo.co.ke.

## 8. Changes

Material changes will be announced in-app and dated above. Continued use
after the effective date constitutes acceptance.

---

### Filling checklist (before publishing)

- [x] Replace `[DATE]`, `[support@bolingo.example]`, support URL (done 6 Nov 2026).
- [ ] Confirm Supabase project region (data residency note if needed).
- [x] Host this file publicly — served in-app/web at `bolingo.co.ke/privacy`
      (`src/app/privacy.tsx`); confirm it resolves on the live site after deploy.
- [ ] Mirror the §1 categories in Play Data Safety + App Store nutrition
      labels (see store-listing.md reviewer notes).
