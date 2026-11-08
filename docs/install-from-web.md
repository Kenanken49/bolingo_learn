# Install from the web (bolingo.co.ke/install)

The app is not on the Play Store or the App Store. This is the sanctioned way a
learner gets it anyway, and the measures that keep a side-loaded file from being
a malware risk.

| Audience | What they get | Where |
| --- | --- | --- |
| Android 7+ | Signed release APK, checksum published on the page, QR for the laptop→phone handoff | `https://bolingo.co.ke/install` → `/download/android` |
| iPhone / iPad | The web app added to the Home Screen (Apple forbids web installs) | Safari → Share → Add to Home Screen |
| Desktop / anyone who just wants it now | The website itself | `https://bolingo.co.ke` |

## Why an APK and not a store

An APK is the app's own signed package: Android installs it, Play Protect may
warn because the source is not the Play Store, and the app updates through the
next APK posted on the page (or through EAS Update for JS-only changes, which is
already wired via `expo-updates`). Nothing about it needs a store account — and
because no store is watching, the app reads `/downloads/latest.json` itself and
offers the newer build in-app; see [contact-and-updates.md](contact-and-updates.md).

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
   bytes it publishes and writes them to `public/downloads/latest.json`; the
   page renders that hash and tells the learner to compare it before tapping
   "Install anyway" past a Play Protect warning.
4. **TLS on every hop.** The download link is the same-origin
   `/download/android` route on `bolingo.co.ke`, which the server streams over
   the site's own certificate. Nothing is served from an unencrypted host.
5. **No binary in git or the image.** The APK is a build artifact: it sits in a
   persistent volume on the web host (`/var/data/app-downloads`) together with
   the metadata the page reads, and only the ~300-byte copy of that metadata is
   committed. That keeps the repo cloneable, the Coolify image small, and a
   release unaffected by every rebuild.

## Handing the download to a phone

Someone reading the page on a laptop cannot tap "Download the APK" with the
phone they actually want to install it on, so the Android card prints a QR code
carrying the absolute file URL — `https://bolingo.co.ke/download/android`. A
phone camera opens it and the transfer starts with no typing. The code points at
the stable route rather than a versioned filename, so it keeps working through
every future publish.

It is web-only (a phone already has the button) and is drawn as one SVG path
from `lib/install-qr.ts`, with the spec's four-module quiet zone inside the
viewBox because a code running to the edge of its white box is the classic
reason a screen-to-camera scan fails. Error correction is level M, so up to 15%
of the modules can be damaged or glare-covered and it still reads.

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

## The release key on this machine

A release keystore lives in `.keystores/` (gitignored, and excluded from the
Docker build context):

```
.keystores/bolingo-release.jks   # alias: bolingo, RSA 2048, valid ~30 years
.keystores/password.txt         # store and key password
```

**Back both files up somewhere durable and private.** Android identifies an app
by its signing key: if the key is lost, a new one cannot update installs made
with the old. They are not in git and never will be.

A Gradle release build is signed with the debug key (Expo's default template),
so sign the output again with the real key before publishing — no edit to
`android/` needed:

```bash
SDK="$LOCALAPPDATA/Android/Sdk/build-tools/37.0.0"
zipalign.exe -p -f 4 android/app/build/outputs/apk/release/app-release.apk aligned.apk
export KS_PASS=$(cat .keystores/password.txt)
apksigner.bat sign --ks .keystores/bolingo-release.jks --ks-key-alias bolingo \
  --ks-pass env:KS_PASS --key-pass env:KS_PASS \
  --out bolingo-learn-signed.apk aligned.apk
apksigner.bat verify --print-certs bolingo-learn-signed.apk   # must say CN=Bolingo Learn
```

Use `env:KS_PASS`, not `file:.keystores/password.txt`: MSYS rewrites the colon
in `file:` paths and apksigner then fails in `getSignerConfig`. On Windows the
executables are `zipalign.exe` and `apksigner.bat`.

## Which CPU architectures, and why the size matters

`android/gradle.properties` sets `reactNativeArchitectures=x86_64`. That builds
libs for the **emulator only**; a phone is arm64 and the APK dies at startup
with `UnsatisfiedLinkError`. Build for devices by overriding it on the command
line, without editing the file:

```bash
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" ./gradlew assembleRelease --no-daemon \
  -PreactNativeArchitectures=arm64-v8a
```

Measured, this build: **166 MB**, and `unzip -l` shows only `lib/arm64-v8a/`.
The arm64 llama.cpp package is bigger than the x86_64 one because it ships a
variant per CPU feature set (`librnllama_v8.so`, `…_v8_2_dotprod_i8mm_hexagon_opencl.so`,
… ~82 MB of them), and the app bundles audiobook audio and dictionaries inside
it (~60 MB of that is content, not code).

That is why the binary lives on our own box. Supabase Storage on the Free plan
rejects objects over **50 MiB** — verified by probe: 50 MiB → HTTP 200, 60 MiB
and 75 MiB → `413 EntityTooLarge`. The API allows 5 GB, so the wall is the plan,
not the endpoint. `--upload` still works for a build that fits, and the route
then redirects to the object instead of streaming.

## Publish it

The web host reads binaries from `/var/data/app-downloads` (override with
`BOLINGO_APK_DIR`). Coolify must mount a persistent volume there — once, in
Coolify → `bolingo-web` → Persistent Storage → Add persistent volume → source
`app-downloads`, destination `/var/data/app-downloads` → **Add Volume** →
**Update** — because a container rebuild otherwise wipes everything inside it.
Use a *volume*, not a bind mount: Docker seeds a named volume from the image, so
the directory arrives owned by `node` and the container terminal can write it
without host credentials. A rebuild does not clear it: the 1.0.0 release and its
metadata survived the redeploy that added the mount.

```bash
# 1. hash it and write the metadata the page reads
node scripts/publish-android-apk.cjs path/to/app-release.apk --local
# 2. put both files in the release directory — that is the release moment
scp path/to/app-release.apk public/downloads/latest.json <vps-host>:/var/data/app-downloads/
ssh <vps-host> "chmod a+r /var/data/app-downloads/*"
# 3. keep the record in git (fallback, and it says which build is live)
git add public/downloads/latest.json && git commit -m "Publish Android build <version>" && git push
```

Step 3 is what tells the installed apps. `app.config.js` version and the record's
`version` are compared numerically by `lib/releaseManifest.ts`, so publishing a
build means **bumping the app version first** — republishing `1.0.0` under a new
file name leaves every install silent, which is the correct answer but rarely what
you meant. A learner on the newest build sees nothing; a learner behind it gets the
card on the dashboard and *Settings → App update → Check for an update*, and
"Not now" only lasts that session.

The volume copy of `latest.json` wins over the one baked into `dist`, so step 2
publishes immediately — no container rebuild per release. Step 3 only records it
and keeps a build working on a host whose volume is not mounted.

Step 2 is the one no gate can do. Any SFTP client works instead of `scp`. If the
binary is not there, `/download/android` answers 503 with a log line saying so —
it never offers a half-published or stale build.

### Publishing without host SSH

The web server runs as `node` and owns `/var/data/app-downloads`, so Coolify →
`bolingo-web` → **Terminal** opens a shell that can write the release directory
directly — no host credentials needed. That container has no `curl` and no
`git-lfs`, and the 50 MiB Supabase object cap rules out a single PUT of a 166 MB
APK, so the binary crosses in parts, each under the cap:

```bash
# 1. split locally, under the 50 MiB object limit
split -b 44040192 -d path/to/app-release.apk .quality/apk-parts/part
# 2. stage the parts in the project's own public bucket (temporary, public!)
for f in .quality/apk-parts/part*; do
  curl -s -o /dev/null -w "%{http_code} $f\n" -X POST \
    -H "Authorization: Bearer $SUPABASE_SECRET_KEY" -F "file=@$f" \
    "$SUPABASE_URL/storage/v1/object/app-downloads/tmp/bolingo-apk-staging/$(basename "$f")"
done
```

Then, in the container terminal, a short `node` script fetches each part over
HTTPS, appends it to `/var/data/app-downloads/bolingo-learn-<version>.apk`, and
prints `size … total …` plus `sha256 <sum> MATCH|MISMATCH` against the hash
`publish-android-apk.cjs` reported. `MATCH` on the reassembled file is the only
proof the copy is complete; run it twice if a part transfer was interrupted.
Write `latest.json` next to it, `chmod a+r /var/data/app-downloads/*`, and
**delete the staging objects** (`DELETE …/storage/v1/object/app-downloads/tmp/…`,
then re-list the prefix to confirm `[]`) and the local parts — the bucket is
public, so a leftover part is a leaked half of the release.

The 1.0.0 build on `bolingo.co.ke` went out this way: 4 parts, `sha256 f49264f4…
MATCH`, staging objects removed the same session.

`--url https://…` writes metadata for an APK hosted elsewhere; `--upload` pushes
one object to the Supabase `app-downloads` bucket (must exist and be public).
`--withdraw` deletes `latest.json`, after which `/install` reports that no
signed build is published instead of offering a dead link.

## Verifying a published build

```bash
curl -s https://bolingo.co.ke/downloads/latest.json | jq .
curl -sI https://bolingo.co.ke/download/android | grep -iE 'http/|content-length|accept-ranges'
# resume behaviour: the second line must be 206 and 1000 bytes
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' -r 0-999 https://bolingo.co.ke/download/android
sha256sum bolingo-learn-<version>.apk     # compare with the page
```

On a device, `adb shell pm list packages | grep bolingo` and
`adb shell dumpsys package com.bolingo.learn | grep -A3 signatures` show what is
actually installed; the signature digest must match the release key used for the
build.

## What the gate covers

`scripts/check-web-publish.cjs` fails the build if the install page, its route,
the manifest, the post-export injection, the APK publishing script, or the
download MIME type regress — and it boots the real server against a temporary
volume to prove `/download/android` streams the published bytes, answers
`Range` with `206`, refuses an out-of-bounds range with `416`, prefers the
volume's `latest.json` over the image's, and returns 404 with no metadata, 503
with a missing file. It also rasterizes the QR path string the install page
paints and decodes it with a real reader (`jsqr`) back to the download URL, so a
code that would not scan cannot ship. It runs the shipped `public/downloads/latest.json`
through the app's own update rule (`lib/releaseManifest.ts`), so an install of the
committed version must raise no prompt and any newer record must raise one — the
in-app offer and the published build cannot drift apart. It cannot verify
that a human compared a checksum or that Play Protect will stay quiet — those
are device checks, run by hand against the published build.
