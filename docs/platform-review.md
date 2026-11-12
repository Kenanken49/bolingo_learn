# Bolingo Learn — Platform Review

A full-aspect review of the product, content, technology, operations and
business setup as shipped on `coolify-hosting` (web live at
https://www.bolingo.co.ke, mobile via EAS builds). Written for the owner and
anyone joining the project. Scores are honest, not marketing.

## 1. What the platform is

One Expo + TypeScript codebase (SDK 58) shipping iOS, Android and web from
the same screens. Learners play tap-to-build code quizzes and language
lessons along a Duolingo-style path, keep streaks alive, earn XP/gems/
diamonds, open unit chests, listen to generated audiobooks, practice speaking,
roleplay with AI tutors, run real code and Git labs offline, and turn their
own files into custom lessons. Supabase (project `rlulmewvmhxgctonizas`)
provides Postgres + Auth + Storage + 10 Edge Functions; a Coolify container on
the InterServer VPS serves web + API; AdMob (rewarded only) and
RevenueCat/M-Pesa monetize; a 32-gate quality runner blocks bad releases.

## 2. Learning design — strong

- **Teach → practice → prove.** Every unit runs theory → guided workshop →
  solo lab → review → quiz, 80% to pass, zero XP on a failed check, retries
  framed as practice. First-try mastery is recorded separately from retries,
  so grades mean something.
- **Forgiving economy, honest incentives.** Wrong answers are always free;
  only a failed lesson costs one of 5 diamonds, refilled 1 per 4 hours, +1 per
  rewarded ad, unlimited on Premium. This is the right difficulty posture for
  beginners: practice fearlessly, pay attention at the checkpoint.
- **Real execution, not matched text.** 1,842 licensed labs, 308 JS/CSS
  sandbox exercises executed for real, an offline in-memory Git VM with 59
  scenarios graded from actual repo state, and a labeled guided fallback where
  execution is impossible. This is rare and defensible.
- **Languages done properly.** CEFR A1–A2 scoping, one-question-per-turn
  tutors, target-language + gloss + one-correction chat contract, per-language
  device voices with cast auditing, and word-level speak-back scoring with
  published bands (90/75/50) that honestly admits it scores words, not
  phonemes.
- **Memory science in uploads.** Revision packs are built on seven named
  techniques (recall, spacing, flashcards, chunking, mind map, memory palace,
  teach-it), not "AI summary".

## 3. Content breadth — very strong, with a maintenance tail

- 104 built-in catalog lessons editable in Supabase without an app release
  (5-minute cache, offline snapshot fallback); English 19 nodes, ES/FR/DE 20,
  Swahili 22; FSI-derived drafts stay unpublished until reviewed, with
  attribution intact.
- 186 classic audiobooks + user-generated narration; Swahili↔English
  dictionary; UI/UX design track; certifications with verifiable codes;
  career/jobs surfaces.
- **Watch-out:** content is code-adjacent in many places (`lib/*-plus.ts`
  banks, `lib/tracks/`, guided chunks). The gates pin correctness, but adding
  a brand-new lesson still needs a path block in `lib/curriculum.ts` —
  editors can fix wording remotely, not restructure the path.

## 4. Engagement systems — strong

Streaks with purchasable-by-luck freezes (chest pulls, one missed day each),
weekly leagues + leaderboard, Squad Cup same-seed tournaments, study rooms
with live presence, friends, gems, variable-ratio chest payouts, celebrations
with frame-budgeted confetti that degrades gracefully to 20 ribbons on weak
devices. The celebration timing (chest → 5s storm, applause on handoff) is
measured, not vibes. Reminders are local and survive restarts.

## 5. Monetization — sound, half-wired

- Free tier costs ~$0 to serve (text uploads ≤1,000 words, device TTS).
  Premium (KSh 770/mo) unlocks the expensive stuff (PDF/scan/AV, LLM
  curation, ElevenLabs/OpenAI voices, 100k AI words/mo) with server-side
  enforcement — the client check is UX only. Correct design.
- AdMob is the only ad, rewarded-only, consent-gated (UMP), test units in
  dev, Premium never sees one. Invalid-traffic hygiene is documented.
- RevenueCat webhook is the server authority for revocations; M-Pesa
  (Android-only, correctly, per App Store rule 3.1.1) re-derives premium from
  paid-through dates so a 30-day payment cannot outlive itself; price comes
  from the server, never the client; callbacks are idempotent and
  replay-safe.
- **Gaps:** M-Pesa sits behind an unreleased flag; store listing still has
  `[YOUR SUPPORT URL]` / demo-account placeholders; reviewer demo path needs
  staging before submission or review will stall.

## 6. Technology — modern, disciplined, heavy

- Expo Router, NativeWind, Reanimated, expo-audio/speech, RevenueCat +
  AdMob native modules, on-device Llama via `llama.rn` with a prefer-offline
  toggle and knowledge sync. One codebase, real native builds, OTA for JS.
- Jungle expedition theming is coherent (route → habitat → bird), OLED true
  black, light mode on the same system. Accessibility basics (font scaling
  guards, no-voice fallbacks) are handled, not assumed.
- **Weight is the tax:** full native builds need the documented Windows
  long-path + ninja fixes, ~25 min release APKs, and dev builds (not Expo Go)
  for mic/speech/ads. Web is a first-class citizen via the Coolify container.

## 7. Quality operations — exceptional for a solo project

32 blocking gates run the *real* code (solvers, graders, economies, wiring),
not mocks: curriculum solvability, sandbox execution, Git VM references,
speak-back alignment, chest/streak math, M-Pesa ledger, AdMob wiring, web
publish config. CI runs the same runner; the owner console shows gates,
crash-free %, p95, funnel, experiments and an AI engineer with allowlisted,
reversible, emailed approvals. Telemetry is anonymous with a one-tap opt-out
that clears the queue.

## 8. Privacy & safety — strong

Row-level-secured personal data, private per-user buckets, signed URLs (no
public bucket), no training on user uploads, speak-back audio deleted after
scoring, rights-attestation gate before AV transcription, consent-gated ads,
kid-safe content rating posture (no public UGC). Privacy policy names
Supabase/AdMob/RevenueCat.

## 9. Hosting & infrastructure — works, fragile

- Coolify 4.6 on a 2 GB InterServer VPS serves apex + www with Let's Encrypt;
  legacy box keeps nginx + the Ollama tutor endpoint edge functions call.
  Deploy-from-push works (`coolify-hosting` branch).
- **Fragility, observed first-hand:** a routine deploy stalled for 25+ minutes
  because RAM *and* swap were fully exhausted (dockerd itself ballooned to
  ~1 GB). Recovery needed a Docker daemon restart. A 2 GB box that both builds
  and serves is living on the edge; there is no staging environment, and
  backups/restore have never been exercised.

## 10. Gaps & risks, ranked

1. **VPS memory (P0).** Will stall every other deploy. Fix: RAM upgrade
   and/or build off-box; add a deploy-time memory guard.
2. **No staging (P1).** Reviewer demos, M-Pesa sandbox and content edits all
   touch production. Fix: second Coolify app on a staging branch + subdomain.
3. **Unfinished launch wiring (P1 — partly fixed 6 Nov 2026).** Fixed: store
   support/privacy URLs filled, privacy policy published in-app at `/privacy`,
   CI workflow added (`.github/workflows/ci.yml` runs `npm run gate`). Still
   open: Supabase Auth email provider secret, reviewer demo account
   credentials, M-Pesa behind flag, AdMob `app-ads.txt` publisher ID.
4. **Single VPS = single point of failure (P2).** No exercised DB/volume
   restore. Fix: Supabase PITR + volume snapshots + a restore drill.
5. **Support story (P2).** No support URL/email, no in-app help path beyond
   Ask Bingo. Fix before store submission.
6. **Content ops bottleneck (P3).** Path structure is code; editors need a
   developer for new lessons. Acceptable now, revisit with growth.

## 11. Verdict

A genuinely well-architected learning platform with best-in-class quality
gating for its size. Product and pedagogy are the strengths; infrastructure
headroom and launch wiring are the debts. Clear the P0/P1 list and it is
submittable to both stores.
