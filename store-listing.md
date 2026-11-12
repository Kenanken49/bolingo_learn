# Bolingo Learn — Store Listing

> Fill brackets, then paste into Play Console → Store listing and
> App Store Connect → App Information / Version Information.

## Identity

- **App name (30 chars max both stores):** Bolingo Learn
- **Subtitle (App Store, 30 chars):** Playful code lessons
- **Short description (Play, 80 chars):** Learn to code by playing — quizzes, streaks & AI audiobooks.
- **Package / Bundle ID suggestion:** `com.bolingo.learn`
- **Category:** Education
- **Content rating:** Everyone / 4+ (no user-generated public content; uploads are private to the account)
- **Support URL / email:** https://www.bolingo.co.ke / support@bolingo.co.ke
- **Privacy policy URL (required both stores):** https://www.bolingo.co.ke/privacy — served by the app's public `/privacy` route; discloses Supabase auth/data, AdMob ads, RevenueCat purchases

## Long description (Play, ≤4000 chars) / Description (App Store)

Learn to code the playful way. Bolingo Learn turns your study material into
bite-size games — earn XP, protect your diamonds, and keep your streak alive.

**HOW IT WORKS**
🧭 Pick a node on your learning path — from HTML Basics to your own uploads.
🧩 Play tap-to-build code quizzes: multiple-choice and drag-and-drop
assembled from tokens, never typed on a tiny keyboard.
🎧 Listen in Audiobook Mode: lessons narrate while each block highlights,
Audible-style.
🔥 Finish lessons to earn XP, grow your streak, and unlock the next node.
Running low on diamonds? Watch a short ad, wait for a refill, or go Premium.

**🧠 AI SANDBOX (Premium)**
Upload your own text, PDFs, or note scans. The AI curates them into a custom
quiz path — "My Custom Revision" — with natural human-like narration.

**👑 PREMIUM (KSh 770/mo)**
- PDF & note-scan uploads with ultra-smart AI lesson compilation
- Soothing ElevenLabs/OpenAI audiobook voices
- Unlimited diamonds, 100k AI words/month, no ads
- Payment via Google Play / App Store. Cancel anytime in store settings.

Free tier includes starter lessons, text uploads up to 1,000 words, and
device-voice narration.

## Keywords (App Store, 100 chars, comma-separated, no spaces)

```
code,games,quiz,html,python,audiobook,learn,streak,flashcards,programming
```

## Screenshot checklist (capture on a real dev build)

Phone (both stores require at minimum):

1. Path Map — winding nodes, 🔥/⭐/💎 top bar (portrait 1080×2400 / 1290×2796)
2. Quiz Player — IDE token slot + CHECK ANSWER
3. Bottom slider — green Correct banner mid-animation
4. AI Sandbox panel — file picked, "Generate my node"
5. Audiobook Mode — highlighted block + player controls
6. Refill screen — ad / wait / Premium options
7. Paywall — price + feature list

Feature graphic (Play, 1024×500): logo + "Turn anything into a code game" + node art.
App preview video (optional, both): 30s — upload → node appears → quiz → audiobook.

Capture with device screenshots (no emulator status bars). Dark quiz card
reads best on OLED — lead with shot #2 for Education featuring.

## Reviewer notes (paste into both consoles)

- Demo account: [CREATE ONE + FILL EMAIL/PASSWORD] — preloaded with a ready upload + lesson.
- Diamonds: failed lessons cost 1 (wrong answers are free); refill via test ad (Google sample id in dev), wait timer, or debug premium toggle (dev builds only).
- AI pipeline needs Supabase secrets configured; reviewer demo uses staged content so no key entry is needed.
- Subscriptions: RevenueCat sandbox product "premium monthly" — test with store sandbox accounts, cancel anytime.
- Ads: Google sample ad units in review builds; real ids only in production.
- Data safety (Play) / Nutrition labels: account email (Supabase auth), uploaded files stored privately per user, ad identifiers (AdMob), purchase history (RevenueCat). No data sold, no public UGC.
