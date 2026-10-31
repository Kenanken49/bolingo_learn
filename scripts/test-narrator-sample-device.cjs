#!/usr/bin/env node
/**
 * On-device playback test — bundled Premium narrator sample.
 *
 * Opens the real Paywall and Settings screens in the Android app with the
 * development-only `?narratorAudit=1` hook. That hook calls the same
 * `toggleNarratorSample()` handler as each screen's Play button, so the test
 * exercises the production audio path. The dev-only `useNarratorSampleProbe`
 * then proves the bundled player decoded and advanced before the test reads
 * the evidence from `adb logcat`.
 *
 * Prerequisites:
 *   - an Android device or emulator connected (`adb devices`)
 *   - a development build of com.bolingo.learn installed
 *   - Metro running (`npx expo start --dev-client --host lan`)
 *
 * Usage:
 *   npm run test:narrator-sample:device
 *   npm run test:narrator-sample:device -- --serial emulator-5554
 *   npm run test:narrator-sample:device -- --avd Medium_Phone_API_37.0 --headless
 *   npm run test:narrator-sample:device -- --report reports/narrator-sample.log
 *
 * The test never calls TTS, ElevenLabs, OpenAI, or Supabase. The MP3 is local;
 * the only network traffic is the Metro bundle.
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PKG = 'com.bolingo.learn';
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const SAMPLE_COMPONENT = path.join(ROOT, 'components', 'PremiumNarratorSample.tsx');
const PAYWALL = path.join(ROOT, 'src', 'app', 'paywall.tsx');
const SETTINGS = path.join(ROOT, 'src', 'app', 'settings.tsx');
const SAMPLE_AUDIO = path.join(ROOT, 'assets', 'audio', 'premium-narrator-sample.mp3');
const LOG_PREFIX = '[NarratorSample]';

const DEV_CLIENT_SCHEME = 'exp+bolingolearn';
const ROUTE_SCHEME = 'bolingo-learn';

function parseArgs(argv) {
  const options = {
    serial: process.env.ANDROID_SERIAL || null,
    apk: process.env.BOLINGO_APK || null,
    avd: null,
    headless: false,
    report: null,
    timeoutMs: 90_000,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`${arg} needs a value`);
      return argv[i];
    };
    if (arg === '--serial') options.serial = next();
    else if (arg === '--apk') options.apk = path.resolve(next());
    else if (arg === '--avd') options.avd = next();
    else if (arg === '--headless') options.headless = true;
    else if (arg === '--report') options.report = path.resolve(next());
    else if (arg === '--timeout') options.timeoutMs = Number(next()) * 1000;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 10_000) {
    throw new Error('--timeout must be at least 10 seconds');
  }
  return options;
}

function usage() {
  console.log(`Bundled narrator on-device playback test

  --serial <id>     Use a specific adb device (default: the only connected device)
  --apk <path>      Install this APK if ${PKG} is missing
  --avd <name>      Start this emulator when no device is connected
  --headless        Add -no-window when starting the emulator
  --report <path>   Write the pass/fail log to a file
  --timeout <sec>   Timeout per wait (default 90)

Requires Metro on port 8081 (npx expo start --dev-client --host lan).`);
}

function findSdkTool(name) {
  const file = process.platform === 'win32' ? `${name}.exe` : name;
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
    '/usr/local/share/android-sdk',
    '/opt/android-sdk',
  ].filter(Boolean);

  for (const root of roots) {
    const candidate = path.join(root, name === 'adb' ? 'platform-tools' : 'emulator', file);
    if (fs.existsSync(candidate)) return candidate;
  }

  const onPath = spawnSync(name, ['--version'], { encoding: 'utf8' });
  if (!onPath.error) return name;
  return null;
}

const ADB = findSdkTool('adb');
const EMULATOR = findSdkTool('emulator');
let TARGET_SERIAL = null;

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function adbRaw(args) {
  if (!ADB) throw new Error('adb was not found. Set ANDROID_HOME or add platform-tools to PATH.');
  return spawnSync(ADB, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 60_000,
  });
}

function adb(...args) {
  const full = TARGET_SERIAL ? ['-s', TARGET_SERIAL, ...args] : args;
  const result = adbRaw(full);
  if (result.error) throw new Error(`adb ${full.join(' ')} failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ''}`.trim();
    throw new Error(`adb ${full.join(' ')} exited ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout;
}

function shell(...args) {
  return adb('shell', ...args);
}

function listDevices() {
  const output = adbRaw(['devices'])?.stdout ?? '';
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('*'))
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    });
}

function bootCompleted(serial) {
  return (
    adbRaw(['-s', serial, 'shell', 'getprop', 'sys.boot_completed']).stdout.trim() === '1'
  );
}

async function ensureDevice(options) {
  let devices = listDevices().filter((device) => device.state === 'device');
  if (options.serial) {
    if (!devices.some((device) => device.serial === options.serial)) {
      throw new Error(
        `Device ${options.serial} is not connected. adb devices shows: ` +
          `${devices.map((device) => device.serial).join(', ') || 'none'}`
      );
    }
    return options.serial;
  }
  if (devices.length === 1) return devices[0].serial;
  if (devices.length > 1) {
    throw new Error(
      `Several devices are connected (${devices.map((device) => device.serial).join(', ')}). Pass --serial.`
    );
  }
  if (!options.avd) {
    throw new Error('No Android device is connected. Start an emulator or pass --avd <name>.');
  }
  if (!EMULATOR) throw new Error('The Android emulator binary was not found.');

  const args = [
    '-avd',
    options.avd,
    '-no-boot-anim',
    '-no-snapshot-save',
    '-gpu',
    'swiftshader_indirect',
  ];
  if (options.headless) args.push('-no-window');
  const logFile = path.join(os.tmpdir(), `bolingo-emulator-${Date.now()}.log`);
  const out = fs.openSync(logFile, 'w');
  const child = spawn(EMULATOR, args, { detached: true, stdio: ['ignore', out, out] });
  child.unref();
  console.log(`Started emulator ${options.avd} (pid ${child.pid}); log: ${logFile}`);

  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    devices = listDevices().filter((device) => device.state === 'device');
    if (devices.length > 0 && bootCompleted(devices[0].serial)) return devices[0].serial;
    await sleep(2000);
  }
  throw new Error(`Emulator ${options.avd} did not finish booting within ${options.timeoutMs / 1000}s`);
}

function ensurePackage(options) {
  const installPath = shell('pm', 'path', PKG).trim();
  if (installPath.startsWith('package:')) return;

  if (!options.apk) {
    throw new Error(
      `${PKG} is not installed. Build and install the development app first, or pass --apk <path>.`
    );
  }
  if (!fs.existsSync(options.apk)) throw new Error(`APK not found: ${options.apk}`);
  console.log(`Installing ${options.apk}…`);
  adb('install', '-r', '--no-streaming', options.apk);
}

function metroAt(host, port) {
  return new Promise((resolve) => {
    const request = http.get({ host, port, path: '/status', timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve(res.statusCode === 200 && /packager-status:running/i.test(body)));
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

async function metroRunning(port = 8081) {
  // Expo on Windows may bind only ::1 with --localhost; try every loopback form.
  for (const host of ['localhost', '::1', '127.0.0.1']) {
    if (await metroAt(host, port)) return true;
  }
  return false;
}

async function ensureMetro() {
  if (!(await metroRunning())) {
    throw new Error(
      'Metro is not running on http://localhost:8081/status. Start it with ' +
        '`npx expo start --dev-client --host lan` and rerun.'
    );
  }
  adb('reverse', 'tcp:8081', 'tcp:8081');
}

function openDevClient() {
  // The emulator's 10.0.2.2 alias reaches the host Metro server even when adb
  // reverse is unavailable; physical devices use the reverse tunnel.
  const isEmulator = shell('getprop', 'ro.kernel.qemu').trim() === '1';
  const host = isEmulator ? '10.0.2.2' : 'localhost';
  const bundleUrl = `http://${host}:8081`;
  console.log(`Dev client → ${bundleUrl}`);
  return shell(
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encodeURIComponent(bundleUrl)}`,
    PKG
  );
}

function openAuditRoute(route) {
  return shell(
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `${ROUTE_SCHEME}://${route}?narratorAudit=1`,
    PKG
  );
}

function logcat() {
  const result = adbRaw([
    ...(TARGET_SERIAL ? ['-s', TARGET_SERIAL] : []),
    'logcat',
    '-d',
    '-b',
    'main,crash',
  ]);
  return result.status === 0 ? result.stdout : '';
}

function probeFor(log, surface) {
  const prefix = `${LOG_PREFIX} surface=${surface} event=playing`;
  for (const line of log.split(/\r?\n/)) {
    if (!line.includes(prefix)) continue;
    const position = Number(/position=([\d.]+)/.exec(line)?.[1] ?? NaN);
    const duration = Number(/duration=([\d.]+)/.exec(line)?.[1] ?? NaN);
    if (Number.isFinite(position) && position >= 0.25 && Number.isFinite(duration) && duration > 0) {
      return { position, duration, line: line.trim() };
    }
  }
  return null;
}

function narratorLogTail(log) {
  return log
    .split(/\r?\n/)
    .filter((line) => line.includes(LOG_PREFIX) || /FATAL EXCEPTION|ReactNativeJS.*Error/i.test(line))
    .slice(-8)
    .join('\n');
}

async function waitForMain(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (/Running "main"/.test(logcat())) return;
    await sleep(1000);
  }
  throw new Error('The development build never started its JS bundle. Check Metro and the dev client.');
}

async function waitForProbeWithRetry(surface, route, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastLog = '';

  while (Date.now() < deadline) {
    attempt += 1;
    if (attempt > 1) console.log(`[${surface}] route not ready yet; retrying (${attempt}).`);
    // A cold dev client can ignore the first deep link before the router mounts;
    // deliver the audit route again until the screen reports playback.
    openAuditRoute(route);
    const attemptDeadline = Math.min(deadline, Date.now() + 12_000);
    while (Date.now() < attemptDeadline) {
      lastLog = logcat();
      const evidence = probeFor(lastLog, surface);
      if (evidence) return evidence;
      await sleep(700);
    }
  }

  const tail = narratorLogTail(lastLog);
  throw new Error(
    `No ${surface} playback evidence in logcat. Expected ` +
      `"${LOG_PREFIX} surface=${surface} event=playing position=…".` +
      (tail ? `\nRecent audio log:\n${tail}` : '')
  );
}

async function testSurface(surface, route, options) {
  console.log(`\n[${surface}] opening ${route}…`);
  shell('am', 'force-stop', PKG);
  adb('logcat', '-c');
  openDevClient();
  await waitForMain(options.timeoutMs);

  const evidence = await waitForProbeWithRetry(surface, route, options.timeoutMs);
  console.log(
    `[${surface}] player advanced to ${evidence.position.toFixed(2)}s of ` +
      `${evidence.duration.toFixed(2)}s; the player reported decoded progress.`
  );
  shell('am', 'force-stop', PKG);
  return evidence;
}

function staticChecks() {
  assert.ok(fs.existsSync(SAMPLE_AUDIO), 'The bundled narrator MP3 is missing.');
  assert.ok(fs.statSync(SAMPLE_AUDIO).size > 10_000, 'The bundled narrator MP3 looks empty.');

  const component = read(SAMPLE_COMPONENT);
  assert.match(component, /PREMIUM_NARRATOR_SAMPLE_TEST_ID/, 'The sample lost its stable test id.');
  assert.match(
    component,
    /onPress=\{\(\) => void onToggle\(\)\}/,
    'The sample button no longer calls the caller-owned toggle.'
  );

  const paywall = read(PAYWALL);
  const settings = read(SETTINGS);
  for (const [name, source] of [
    ['Paywall', paywall],
    ['Settings', settings],
  ]) {
    assert.match(
      source,
      /onToggle=\{toggleNarratorSample\}/,
      `${name}'s Play button is no longer wired to toggleNarratorSample.`
    );
    assert.match(
      source,
      /narratorAuditRequested\(narratorAudit\)/,
      `${name}'s device-audit hook is missing.`
    );
    assert.match(
      source,
      /useNarratorSampleProbe\('(paywall|settings)'/,
      `${name} no longer reports sample playback.`
    );
    assert.match(source, /PREMIUM_NARRATOR_SAMPLE/, `${name} no longer loads the bundled sample.`);
  }
  assert.match(paywall, /useNarratorSampleProbe\('paywall'/, 'Paywall probe surface changed.');
  assert.match(settings, /useNarratorSampleProbe\('settings'/, 'Settings probe surface changed.');

  const pkg = JSON.parse(read(PACKAGE_JSON));
  assert.equal(
    pkg.scripts['test:narrator-sample:device'],
    'node scripts/test-narrator-sample-device.cjs',
    'package.json is missing the device test script.'
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  staticChecks();
  console.log('Static wiring OK — both screens call the same Play handler and probe.');

  const serial = await ensureDevice(options);
  TARGET_SERIAL = serial;
  console.log(`Device: ${serial}`);
  ensurePackage(options);
  await ensureMetro();

  const paywall = await testSurface('paywall', 'paywall', options);
  const settings = await testSurface('settings', 'settings', options);

  const model = shell('getprop', 'ro.product.model').trim() || 'Android device';
  const version = shell('getprop', 'ro.build.version.release').trim() || '?';

  const report = [
    '# Bundled narrator playback — Android device',
    `# Date: ${new Date().toISOString()}`,
    `# Device: ${model} / Android ${version} (${serial})`,
    `# Paywall: PASS · position ${paywall.position.toFixed(2)}s · duration ${paywall.duration.toFixed(2)}s`,
    `# Settings: PASS · position ${settings.position.toFixed(2)}s · duration ${settings.duration.toFixed(2)}s`,
    '',
    paywall.line,
    settings.line,
  ].join('\n');

  console.log('\nPASS — bundled narrator played on Paywall and Settings.');
  console.log(report);

  if (options.report) {
    fs.mkdirSync(path.dirname(options.report), { recursive: true });
    fs.writeFileSync(options.report, `${report}\n`, 'utf8');
    console.log(`Report written to ${options.report}`);
  }
}

main().catch((error) => {
  console.error(`\nFAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
