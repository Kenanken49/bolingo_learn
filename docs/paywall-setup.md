# Paywall products setup (RevenueCat + stores)

Code is wired to these exact ids — create them verbatim:

- RevenueCat entitlement: `premium`
- RevenueCat offering: `default` (monthly package inside)
- Product id (both stores): `bolingo_premium_monthly` — $7.70/mo

## 1. Google Play

1. Play Console → your app → Monetize → Products → Subscriptions → Create:
   id `bolingo_premium_monthly`, 1-month billing period, $7.70 (or local equivalent), grace period on.
2. Copy the service-account JSON key (Monetize → API access) — RevenueCat needs it next.

## 2. App Store

1. App Store Connect → your app → Subscriptions → create group "Premium", product id `bolingo_premium_monthly`, $7.99 tier (closest to $7.70), 1 month.
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

## 6. Test before release

- Android: internal testing track + license-test account → purchase with test card, verify `profiles.is_premium` flips.
- iOS: sandbox tester (App Store Connect → Users) → subscribe, verify, cancel.
- Both: Restore purchases button re-checks the entitlement; the `__DEV__` debug toggle covers UI testing with zero charges.
- LD Player / emulator without Play Store / Expo Go: store billing is
  unavailable by design — the paywall now says so instead of hanging.
  Test real purchases in a dev build (`npx expo run:android`) on a device
  with Play Store, or use the debug toggle (`EXPO_PUBLIC_DEBUG_PREMIUM=1`).

## 7. Grant the admin (one-time SQL)

```sql
update public.profiles set is_premium = true
where id = (select id from auth.users where email = 'bolingolearn@pm.me');
```
