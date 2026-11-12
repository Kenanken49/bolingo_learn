#!/usr/bin/env node
/**
 * Publish a signed Android release APK for bolingo.co.ke/install.
 *
 * The APK is a build artifact, not source, so it never enters git and never
 * enters the container image. Normally it lives on the web host itself, in the
 * persistent volume `/download/android` streams from, and this script writes
 * only the small metadata file: the install page reads
 * `public/downloads/latest.json` and always links the stable route, so the
 * address people share never changes when a new build lands.
 *
 * Usage
 *   node scripts/publish-android-apk.cjs path/to/app-release.apk --local
 *   node scripts/publish-android-apk.cjs path/to/app-release.apk --upload
 *   node scripts/publish-android-apk.cjs path/to/app-release.apk --url https://…/app.apk
 *   node scripts/publish-android-apk.cjs --withdraw
 *
 * --local is the default hosting: after committing the metadata, copy the APK
 * to the host volume under the printed file name (docs/install-from-web.md has
 * the mount and the scp command). --upload instead pushes one object to the
 * project's Supabase Storage bucket, which needs SUPABASE_URL and
 * SUPABASE_SECRET_KEY in the environment and a public "app-downloads" bucket —
 * that plan caps a single object at 50 MiB, so it only works for a build small
 * enough to fit. The secret never enters the image or the bundle.
 *
 * Refuses to publish anything that is not a plausible signed APK: a file with
 * no ZIP header, or one too small to be a release build, is rejected rather
 * than advertised on the install page.
 *
 * The record also carries `buildNumber` — the Android `versionCode` from
 * `app.config.js`, the same value `prebuild` writes into the APK — so two
 * rebuilds published under one version stay tellable apart, in the record, on
 * the install page and to the app's own update check. Bump `versionCode` with
 * every build you publish, even one that does not move the version.
 */
'use strict';
/* global __dirname, require, process, console, fetch */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'downloads');
const LATEST = path.join(OUT_DIR, 'latest.json');
const BUCKET = 'app-downloads';
/** The route the site serves the binary from; --local points the record at it. */
const SITE = 'https://bolingo.co.ke';
const DOWNLOAD_ROUTE = '/download/android';
/** Where the web host keeps released binaries (Coolify persistent volume). */
const HOST_VOLUME = '/var/data/app-downloads';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`));
  if (hit) return hit.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

function fail(message) {
  console.error(`publish-android-apk: ${message}`);
  process.exit(1);
}

/**
 * The `versionCode` the app config declares, which is what the APK this file
 * hashes was built with. Read from the config rather than taken as a flag, so
 * the published record cannot claim a build number the binary does not carry.
 * Returns null when the config has no android block, which an old release record
 * without a build number still describes honestly.
 */
function declaredBuildNumber() {
  let config = null;
  try {
    // app.config.js exports the Expo dynamic-config function; the fields this
    // script needs (android.versionCode) are literals in it, so an empty base
    // config is enough and keeps this the one place the number is defined.
    config = require(path.join(ROOT, 'app.config.js'))({ config: {} });
  } catch (error) {
    fail(`cannot read app.config.js for android.versionCode: ${error instanceof Error ? error.message : String(error)}`);
  }
  const raw = config && config.android ? config.android.versionCode : undefined;
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}

async function uploadToStorage(fileBytes, fileName) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base || !key) fail('--upload needs SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.');
  const objectPath = `${BUCKET}/${fileName}`;
  console.log(`publish-android-apk: uploading ${fileName} (${(fileBytes.length / 1048576).toFixed(1)} MB)…`);
  const res = await fetch(`${base}/storage/v1/object/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/vnd.android.package-archive',
      'x-upsert': 'true',
    },
    body: fileBytes,
  });
  if (!res.ok) fail(`upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return `${base}/storage/v1/object/public/${objectPath}`;
}

async function main() {
  if (flag('--withdraw')) {
    fs.rmSync(LATEST, { force: true });
    for (const file of fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []) {
      if (file.endsWith('.apk.sha256')) fs.rmSync(path.join(OUT_DIR, file), { force: true });
    }
    console.log('publish-android-apk: latest.json removed — /install now reports that no build is published.');
    return;
  }

  const apkPath = args.find((arg) => !arg.startsWith('--') && arg !== valueOf('--url'));
  if (!apkPath) {
    fail('usage: node scripts/publish-android-apk.cjs <app-release.apk> (--local | --upload | --url <https://…>)');
  }
  if (!fs.existsSync(apkPath)) fail(`${apkPath} does not exist`);

  const bytes = fs.readFileSync(apkPath);
  if (bytes.length < 1024 * 1024) fail(`${apkPath} is only ${bytes.length} bytes — that is not a release APK.`);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) fail(`${apkPath} is not a ZIP/APK (no PK header).`);

  // A real APK's first ZIP entry is AndroidManifest.xml. A repacked or
  // truncated file usually loses that, so it is a cheap authenticity smell.
  const firstEntry = bytes.subarray(30, 30 + 128).toString('latin1');
  if (!firstEntry.includes('AndroidManifest.xml') && !firstEntry.includes('META-INF')) {
    console.warn('publish-android-apk: warning — the first ZIP entry is not AndroidManifest.xml/META-INF. Is this a real APK?');
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version || '1.0.0';
  const buildNumber = declaredBuildNumber();
  if (buildNumber === null) {
    console.warn(
      'publish-android-apk: warning — app.config.js declares no android.versionCode, so this record cannot distinguish a rebuild from the build already installed. Set it and publish again if this build replaces one.'
    );
  }
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  // A rebuild of the same version overwrites the same name in the release
  // directory, so the APK and latest.json must always go up together — a stale
  // file beside a new record means the published checksum matches nothing.
  const fileName = `bolingo-learn-${version}.apk`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${fileName}.sha256`), `${sha256}  ${fileName}\n`);

  let url = valueOf('--url');
  if (flag('--local')) url = `${SITE}${DOWNLOAD_ROUTE}`;
  if (flag('--upload')) url = await uploadToStorage(bytes, fileName);
  if (!url || !/^https:\/\//.test(url)) {
    fail('pass --local (serve from the web host), --upload (object storage) or --url https://…');
  }

  const record = {
    version,
    ...(buildNumber === null ? {} : { buildNumber }),
    packageName: 'com.bolingo.learn',
    fileName,
    sizeBytes: bytes.length,
    sha256,
    url,
    publishedAt: new Date().toISOString(),
    minAndroid: '7.0',
  };
  fs.writeFileSync(LATEST, `${JSON.stringify(record, null, 2)}\n`);

  console.log(`publish-android-apk: published version ${version}${buildNumber === null ? '' : ` (build ${buildNumber})`}`);
  console.log(`  sha256 ${sha256}`);
  console.log(`  url    ${url}`);
  console.log('  Verify a downloaded copy:');
  console.log(`    sha256sum ${fileName}                       # Linux/macOS`);
  console.log(`    Get-FileHash ${fileName} -Algorithm SHA256   # Windows PowerShell`);
  console.log('  Now commit public/downloads/latest.json and push — /install picks it up on the next deploy.');
  if (flag('--local')) {
    console.log('');
    console.log(`  And put the release where the site can read it, on the web host:
    scp ${apkPath} ${LATEST} <host>:${HOST_VOLUME}/
    sha256sum ${HOST_VOLUME}/${fileName}   # must match the checksum above
    # Both files land in one directory and /install reads the volume copy of
    # latest.json, so a new build needs no container rebuild.
    # No host SSH? Coolify's container terminal writes the same volume; the
    # split-and-stage procedure is in docs/install-from-web.md.`);
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
