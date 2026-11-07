#!/usr/bin/env node
/**
 * Publish a signed Android release APK for bolingo.co.ke/install.
 *
 * The APK is a build artifact, not source, so it never enters git and never
 * enters the container: it is uploaded once to the project's Supabase Storage
 * bucket and the site serves only the small metadata file written here. The
 * install page reads `public/downloads/latest.json`, and `/download/android`
 * redirects to `url`, so the link people share is always bolingo.co.ke.
 *
 * Usage
 *   node scripts/publish-android-apk.cjs path/to/app-release.apk --upload
 *   node scripts/publish-android-apk.cjs path/to/app-release.apk --url https://…/app.apk
 *   node scripts/publish-android-apk.cjs --withdraw
 *
 * --upload needs SUPABASE_URL and SUPABASE_SECRET_KEY in the environment. The
 * bucket must exist and be public (Supabase → Storage → New bucket
 * "app-downloads" → Public). The secret never enters the image or the bundle.
 *
 * Refuses to publish anything that is not a plausible signed APK: a file with
 * no ZIP header, or one too small to be a release build, is rejected rather
 * than advertised on the install page.
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
  if (!apkPath) fail('usage: node scripts/publish-android-apk.cjs <app-release.apk> (--upload | --url <https://…>)');
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
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const fileName = `bolingo-learn-${version}.apk`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${fileName}.sha256`), `${sha256}  ${fileName}\n`);

  const url = flag('--upload') ? await uploadToStorage(bytes, fileName) : valueOf('--url');
  if (!url || !/^https:\/\//.test(url)) fail('pass --upload or --url https://… so the page links over TLS only.');

  const record = {
    version,
    packageName: 'com.bolingo.learn',
    fileName,
    sizeBytes: bytes.length,
    sha256,
    url,
    publishedAt: new Date().toISOString(),
    minAndroid: '7.0',
  };
  fs.writeFileSync(LATEST, `${JSON.stringify(record, null, 2)}\n`);

  console.log(`publish-android-apk: published version ${version}`);
  console.log(`  sha256 ${sha256}`);
  console.log(`  url    ${url}`);
  console.log('  Verify a downloaded copy:');
  console.log(`    sha256sum ${fileName}                       # Linux/macOS`);
  console.log(`    Get-FileHash ${fileName} -Algorithm SHA256   # Windows PowerShell`);
  console.log('  Now commit public/downloads/latest.json and push — /install picks it up on the next deploy.');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
