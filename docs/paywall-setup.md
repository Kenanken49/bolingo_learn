# Paywall products setup (RevenueCat + stores)

Code is wired to these exact ids — create them verbatim:

- RevenueCat entitlement: `premium`
- RevenueCat offering: `default` (monthly package inside)
- Product id (both stores): `bolingo_premium_monthly` — KSh 770/mo

## 1. Google Play

1. Play Console → your app → Monetize → Products → Subscriptions → Create:
   id `bolingo_premium_monthly`, 1-month billing period, KSh 770 (set the Kenya price explicitly), grace period on.
2. Copy the service-account JSON key (Monetize → API access) — RevenueCat needs it next.

## 2. App Store

1. App Store Connect → your app → Subscriptions → create group "Premium", product id `bolingo_premium_monthly`, the tier closest to KSh 770, 1 month.
2. Fill the subscription display name/description + review screenshot (use store-listing.md shot #7), submit for review alongside the build.
3. App Store Connect → Users and Access → Keys: create an In-App Purchase key (p8) + Issuer ID for RevenueCat.

## 3. RevenueCat

1. New project → link Play service-account key + App Store p8/issuer ID.
2. Products → import `bolingo_premium_monthly` from both stores.
3. Entitlements → create `premium`, attach the product.
4. Offerings → `default` → add monthly package → attach product.
5. Copy the **Android + iOS API keys** into EAS secrets:
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
6. The app matches the package by product id first, then falls back to any
   monthly package — mismatched ids degrade gracefully to the debug path.

## 4. Web checkout (RevenueCat Web Billing, Stripe-backed)
Native apps bill through the App Store / Play Store. The **website** needs its own setup:
1. In the RevenueCat dashboard, enable **Web Billing** on the same project and connect **Stripe**
   (test mode first). Attach the SAME `premium` entitlement and a monthly web product.
2. Copy the **Web Billing public API key** (`rcb_...`) — it is NOT the same as the native SDK key.
3. Set `EXPO_PUBLIC_REVENUECAT_WEB_KEY=rcb_...` in `.env` (add the same var in EAS for web builds).
4. Without the key, the web paywall shows "Subscribe in the mobile app" and both
   buttons stay inert instead of failing — that is the expected fallback, not a bug.

## 5. Server truth — RevenueCat webhook (required for "really premium")

Client-side `refreshPremiumStatus` syncs fast, but the webhook is what keeps
Cancelled/Expired users honest (stores can take hours to propagate).

1. `supabase functions deploy revenuecat-webhook`
2. `supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random-32-chars>`
3. RevenueCat dashboard → Integrations → Webhooks → URL =
   `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization header = the same secret. Send a test event, then check
   `profiles.is_premium` flips without the app open.

Costly server paths double-enforce Premium regardless of the flag:
`process-upload` (PDF/audio + word billing) and `roleplay-chat` (402 unless
`profiles.is_premium`) both read the profile service-side.

## 6. Kenya: M-Pesa through Safaricom Daraja (Android only)

Store billing excludes a large part of the audience — no card, no Play balance.
M-Pesa is the second rail: the app sends an STK Push, the learner types their
M-Pesa PIN **on the phone**, and Safaricom tells the server whether it landed.

1. Run [`supabase/migrations_mpesa_premium.sql`](../supabase/migrations_mpesa_premium.sql)
   (creates `mpesa_checkouts`: select-only RLS for the owner, service-role writes).
2. `supabase secrets set DARAJA_CONSUMER_KEY=… DARAJA_CONSUMER_SECRET=… DARAJA_SHORTCODE=… DARAJA_PASSKEY=… MPESA_CALLBACK_URL=… MPESA_CALLBACK_TOKEN=…`
   — get the first four from the Daraja dashboard (sandbox keys first; see step 5
   for going live); invent the token and embed it in the callback URL as
   `?t=<token>`.
3. `supabase functions deploy mpesa-push --no-verify-jwt=false` and
   `supabase functions deploy mpesa-callback --no-verify-jwt`.
4. Sandbox test: with `MPESA_ENV=sandbox` (the default when it is unset), pay
   with a Safaricom test MSISDN, confirm `mpesa_checkouts.status` flips to
   `confirmed` and `profiles.is_premium` follows.
5. Go live. Create a keys file **outside this repository** — the CLI refuses a
   file git tracks, because a committed key is already public (`.env.example`
   lists the names only). It holds the live consumer key/secret pair, the live
   paybill or till number and its passkey, the live callback URL with a freshly
   invented `MPESA_CALLBACK_TOKEN`, and `MPESA_ENV=production`. Then read the
   report before sending anything:

   ```bash
   npm run mpesa:golive -- --from ~/mpesa-live.env            # audit only
   npm run mpesa:golive -- --from ~/mpesa-live.env --apply    # secrets + deploy
   ```

   The auditor checks the pair that a live outage actually comes from: `MPESA_ENV`
   against `DARAJA_BASE_URL`, the Daraja test paybill `17439` sitting on the live
   endpoint, a `MPESA_CALLBACK_URL` whose `?t=` token is missing or is not the
   value in `MPESA_CALLBACK_TOKEN` (that one is silent and expensive: the learner
   pays, the callback is rejected, premium never arrives), a plain-HTTP callback,
   an unrecognised `MPESA_TRANSACTION_TYPE`, and any missing key — those are
   problems, and they block. A token under 16 characters, a price that differs
   from the `KSh 770/mo` card and a sandbox number under `MPESA_ENV=sandbox` are
   warnings the report prints without blocking. It names variables and their
   lengths, never values, which is what makes its output safe to paste into a
   report. `--apply` writes the secrets and deploys
   both functions, and refuses to do either while the audit has problems unless
   `--force` is given — `mpesa-push` runs the same audit on every request and
   answers `503` rather than push a configuration that cannot settle.
6. Live self-test: `MPESA_ENV=production` selects `https://api.safaricom.co.ke`,
   the only live host the code accepts. Pay yourself once from a Kenyan number at
   the real price, check the ledger row lands `confirmed` with `amount_kes` equal
   to what was charged, and confirm the app shows premium. If the price had to be
   lowered for the test, put `MPESA_PREMIUM_KES` back before the flag goes on:
   the paywall card and the server price are checked to agree (`KSh 770/mo`).
7. Enable the `mpesa_premium` release flag in Settings → Quality & Operations
   and roll out gradually. The card is hidden on iOS by rule 3.1.1 and on
   Android until the flag is on, so nothing changes for existing learners. The
   flag ships dark in `content/quality/flags.json`, and `npm run check:mpesa`
   keeps it that way — enabling is an operator action, not a commit.

Who owns what: the **server** picks the amount (`MPESA_PREMIUM_KES`, default
770) and the paid-through window; the client only ever sends a phone number and
a plan key. A callback that reports a different amount is marked `failed` and
grants nothing. Because M-Pesa has no renewal webhook, `mpesa-push` recomputes
`profiles.is_premium` from the ledger on every call, so premium ends when the
30 days end — and `refreshPremiumStatus` will not let an unentitled answer from
the store clear an in-date M-Pesa period.

## 7. Test before release

- Android: internal testing track + license-test account → purchase with test card, verify `profiles.is_premium` flips.
- iOS: sandbox tester (App Store Connect → Users) → subscribe, verify, cancel.
- Both: Restore purchases button re-checks the entitlement; the `__DEV__` debug toggle covers UI testing with zero charges.
- LD Player / emulator without Play Store / Expo Go: store billing is
  unavailable by design — the paywall now says so instead of hanging.
  Test real purchases in a dev build (`npx expo run:android`) on a device
  with Play Store, or use the debug toggle (`EXPO_PUBLIC_DEBUG_PREMIUM=1`).
- M-Pesa: `npm run check:mpesa` exercises the ledger rules offline; a real
  sandbox payment still needs a Kenyan test number and an Android dev build.

## 8. Grant the admin (one-time SQL)

```sql
update public.profiles set is_premium = true
where id = (select id from auth.users where email = 'bolingolearn@pm.me');
```
