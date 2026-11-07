# Install from the web (bolingo.co.ke/install)

The app is not on the Play Store or the App Store. This is the sanctioned way a
learner gets it anyway, and the measures that keep a side-loaded file from being
a malware risk.

| Audience | What they get | Where |
| --- | --- | --- |
| Android 7+ | Signed release APK, checksum published on the page | `https://bolingo.co.ke/install` → `/download/android` |
| iPhone / iPad | The web app added to the Home Screen (Apple forbids web installs) | Safari → Share → Add to Home Screen |
| Desktop / anyone who just wants it now | The website itself | `https://bolingo.co.ke` |

## Why an APK and not a store

An APK is the app's own signed package: Android installs it, Play Protect may
warn because the source is not the Play Store, and the app updates through the
next APK posted on the page (or through EAS Update for JS-only changes, which is
already wired via `expo-updates`). Nothing about it needs a store account.

iOS has no equivalent. Sideloading an `.ipa` needs an Apple Developer account
plus each device's UDID (Ad Hoc, 100 devices) or an Enterprise certificate,
which is why the iPhone path is the Home Screen web app — same content, real
icon, full-screen display, no Apple account, no install risk at all.

## The safety chain (what the page promises and how it is kept)

1. **One official source.** Only `bolingo.co.ke/install` links to a file. The
   page states plainly that installers are never sent over WhatsApp, Telegram or
   email, and that "modded" copies are not ours.
2. **A signed release.** The APK is signed with the project's release key, so an
   altered file cannot update an existing install — Android rejects the
   signature mismatch. The key belongs in EAS (remote credentials) or a backed-up
   keystore, **never** in git and never in the container.
3. **A published SHA-256.** `scripts/publish-android-apk.cjs` hashes the exact
   bytes it uploads and writes them to `public/downloads/latest.json`; the page
   renders that hash and tells the learner to compare it before tapping
   "Install anyway" past a Play Protect warning.
4. **TLS on every hop.** The download URL must be `https://` (the script refuses
   anything else), and the same-origin `/download/android` route redirects to it
   so the shared link is always `bolingo.co.ke`.
5. **No binary in git or the image.** The APK is a build artifact: it goes to the
   project's Supabase Storage bucket, and only the ~300-byte metadata file is
   committed. That keeps the repo cloneable and the Coolify image small.

## Build the APK

```bash
# one-off: a signed, installable APK (internal distribution = APK, not AAB)
npx eas-cli build -p android --profile apk
```

`eas.json`'s `apk` profile sets `android.buildType: "apk"` and internal
distribution. The first build asks EAS to generate the Android keystore, which
EAS then keeps — do not recreate it, or every installed copy stops updating.

A local Gradle build also works once a release keystore exists, but the keystore
must be created and backed up deliberately:

```bash
cd android && ./gradlew assembleRelease   # output: app/build/outputs/apk/release/
```

Never commit `*.jks`, `*.keystore` or the passwords file. `android/` is
generated (CNG) and untracked, so a local keystore there is lost on the next
`expo prebuild` — keep it outside the project.

## Publish it

```bash
# 1. bucket: Supabase → Storage → New bucket → name "app-downloads" → Public
# 2. upload + write the metadata the page reads
SUPABASE_URL=… SUPABASE_SECRET_KEY=… \
  node scripts/publish-android-apk.cjs path/to/app-release.apk --upload
# 3. ship it
git add public/downloads/latest.json && git commit -m "Publish Android build <version>" && git push
```

`--url https://…` writes the metadata for an APK hosted elsewhere (for example
an S3/R2 bucket) without uploading it. `--withdraw` deletes `latest.json`, after
which `/install` reports that no signed build is published instead of offering a
dead link.

## Verifying a published build

```bash
curl -s https://bolingo.co.ke/downloads/latest.json | jq .
curl -sI https://bolingo.co.ke/download/android | grep -i location
sha256sum bolingo-learn-<version>.apk     # compare with the page
```

On a device, `adb shell pm list packages | grep bolingo` and
`adb shell dumpsys package com.bolingo.learn | grep -A3 signatures` show what is
actually installed; the signature digest must match the release key used for the
build.

## What the gate covers

`scripts/check-web-publish.cjs` fails the build if the install page, its route,
the manifest, the post-export injection, the APK publishing script, the
`/download/android` redirect or the download MIME type regress. It cannot verify
that a human compared a checksum or that Play Protect will stay quiet — those
are device checks, run by hand against the published build.
