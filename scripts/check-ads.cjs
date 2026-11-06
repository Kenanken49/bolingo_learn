#!/usr/bin/env node
/**
 * Guard the AdMob rewarded-diamond rail.
 *
 * The rail is the only place in the app that shows an ad, and it is the one
 * feature that can cost the owner money (invalid traffic) or get the app
 * rejected from a store (ads before consent). So the checks are:
 *
 *   1. Behaviour — the real `lib/adPolicy.ts` runs under Node: unit ids are
 *      per platform, a missing id falls back to Google's sample (never a live
 *      unit), Premium is never offered an ad, and retries are bounded.
 *   2. Safety — no live unit id is hardcoded anywhere in the app, the native
 *      hook creates exactly one ad instance and only after consent, and a
 *      reward is granted only from Google's `earnedReward`.
 *   3. Wiring — wrong answers are always free, a failed lesson spends one
 *      diamond, zero diamonds pauses the lesson behind the refill sheet, and
 *      the sheet's "watch" path persists the diamond through `lib/progress.ts`
 *      (never a local-only counter for signed-in learners).
 *
 * No network call, no device, no AdMob account needed.
 */

'use strict';

/* global __dirname, console, process -- Node provides these to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const POLICY = path.join(ROOT, 'lib', 'adPolicy.ts');
const ADS = path.join(ROOT, 'lib', 'ads.ts');
const HOOK = path.join(ROOT, 'lib', 'rewarded', 'index.native.ts');
const STUB = path.join(ROOT, 'lib', 'rewarded', 'index.ts');
const WEB_STUB = path.join(ROOT, 'lib', 'rewarded', 'index.web.ts');
const RUNTIME = path.join(ROOT, 'lib', 'adsRuntime.native.ts');
const RUNTIME_STUB = path.join(ROOT, 'lib', 'adsRuntime.ts');
const SHEET = path.join(ROOT, 'components', 'OutOfDiamondsSheet.tsx');
const PLAYER = path.join(ROOT, 'components', 'GamifiedCodePlayer.tsx');
const REFILL = path.join(ROOT, 'components', 'RefillContent.tsx');
const QUIZ = path.join(ROOT, 'src', 'app', 'quiz', '[lessonId].tsx');
const LAYOUT = path.join(ROOT, 'src', 'app', '_layout.tsx');
const SETTINGS = path.join(ROOT, 'src', 'app', 'settings.tsx');
const CONFIG = path.join(ROOT, 'app.config.js');
const PRIVACY = path.join(ROOT, 'privacy-policy.md');
const DOCS = path.join(ROOT, 'docs', 'admob.md');
const GATES = path.join(ROOT, 'content', 'quality', 'gates.json');
const PACKAGE = path.join(ROOT, 'package.json');

let failures = 0;
const queue = [];

function check(name, fn) {
  queue.push({ name, fn });
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function exists(file) {
  return fs.existsSync(file);
}

/** Transpile the real policy module so the checks exercise shipped code. */
function loadTs(file) {
  const { outputText, diagnostics } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length) {
    throw new Error(
      `${path.relative(ROOT, file)} has syntax errors:\n${diagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n')}`
    );
  }
  const module = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(module.exports, require, module);
  return module.exports;
}

const policy = loadTs(POLICY);
const TEST_ANDROID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_IOS = 'ca-app-pub-3940256099942544/1712485313';

// --- 1. Policy behaviour --------------------------------------------------

check('Google sample units are the fallback on both platforms', () => {
  assert(policy.rewardedUnitFor('android', {}) === TEST_ANDROID, 'android must fall back to the sample unit');
  assert(policy.rewardedUnitFor('ios', {}) === TEST_IOS, 'iOS must fall back to the sample unit');
  assert(policy.isTestUnit(TEST_ANDROID) && policy.isTestUnit(TEST_IOS), 'both sample units must be recognised');
});

check('A configured unit wins, and ids never cross platforms', () => {
  const live = 'ca-app-pub-1111111111111111/2222222222';
  assert(policy.rewardedUnitFor('android', { android: live }) === live, 'an env Android id must be used');
  assert(policy.rewardedUnitFor('ios', { android: live }) === TEST_IOS, 'an Android id must never reach iOS');
  assert(policy.rewardedUnitFor('ios', { ios: '  ' }) === TEST_IOS, 'blank configuration must fall back');
  assert(!policy.isTestUnit(live), 'a live unit must not be reported as a test unit');
});

check('Web and desktop cannot request a rewarded ad', () => {
  assert(policy.rewardedUnitFor('web', {}) === null, 'web has no unit');
  assert(policy.rewardedUnitFor('other', {}) === null, 'unknown platforms have no unit');
  assert(policy.adPlatform('web') === 'web' && policy.adPlatform('android') === 'android', 'platform mapping');
});

check('Premium learners and missing consent are never offered an ad', () => {
  const base = { platform: 'android', isPremium: false, consent: true };
  assert(policy.shouldOfferRewardedAd(base) === true, 'a free learner with consent may watch');
  assert(policy.shouldOfferRewardedAd({ ...base, isPremium: true }) === false, 'Premium must never see an ad');
  assert(policy.shouldOfferRewardedAd({ ...base, consent: false }) === false, 'no consent, no ad');
  assert(policy.shouldOfferRewardedAd({ ...base, platform: 'web' }) === false, 'no ad on web');
});

check('Load retries are bounded and back off', () => {
  assert(policy.MAX_LOAD_RETRIES === 3, 'retries must stay bounded at three');
  assert(policy.retryDelayMs(1) === 2000, 'first retry waits 2s');
  assert(policy.retryDelayMs(2) === 4000, 'second retry waits 4s');
  assert(policy.retryDelayMs(3) === 8000, 'third retry waits 8s');
  assert(policy.retryDelayMs(99) === 60000, 'the delay is capped');
  assert(policy.retryDelayMs(0) === 2000 && policy.retryDelayMs(NaN) === 2000, 'bad input is clamped');
});

check('One ad yields one diamond, the same as a regen tick', () => {
  assert(policy.DIAMONDS_PER_REWARDED_AD === 1, 'reward size must stay one diamond');
});

// --- 2. Safety ------------------------------------------------------------

check('lib/ads.ts reads one env var per platform', () => {
  const source = read(ADS);
  assert(source.includes('EXPO_PUBLIC_ADMOB_REWARDED_ANDROID'), 'Android unit env var missing');
  assert(source.includes('EXPO_PUBLIC_ADMOB_REWARDED_IOS'), 'iOS unit env var missing');
  assert(source.includes('rewardedUnitFor'), 'the platform-aware resolver must be used');
  assert(!/ANDROID\s*\|\|/.test(source), 'a single OR chain would send Android ids to iOS');
  assert(source.includes('export const isTestAd'), 'the UI needs to know it is a test unit');
});

check('No live ad unit id is hardcoded in the app', () => {
  const roots = [path.join(ROOT, 'lib'), path.join(ROOT, 'components'), path.join(ROOT, 'src')];
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        for (const match of read(full).matchAll(/ca-app-pub-\d+\/\d+/g)) {
          if (match[0] !== TEST_ANDROID && match[0] !== TEST_IOS) offenders.push(`${path.relative(ROOT, full)} → ${match[0]}`);
        }
      }
    }
  };
  roots.forEach(walk);
  assert(offenders.length === 0, `live unit ids must come from env:\n${offenders.join('\n')}`);
});

check('The app id and the unit id are separate config values', () => {
  const config = read(CONFIG);
  assert(/react-native-google-mobile-ads/.test(config), 'the config plugin must stay registered');
  assert(config.includes('ADMOB_ANDROID_APP_ID'), 'Android app id env var missing');
  assert(config.includes('ADMOB_IOS_APP_ID'), 'iOS app id env var missing');
  const appIds = [...config.matchAll(/ca-app-pub-\d+~\d+/g)].map((m) => m[0]);
  assert(appIds.length === 2, 'exactly the two sample app ids must be the fallback');
  const liveAppId = [...config.matchAll(/(?<!')ca-app-pub-\d+~\d+/g)];
  assert(liveAppId.length === 0, 'sample app ids only');
});

check('A production build without real AdMob ids fails fast instead of earning nothing', () => {
  const config = read(CONFIG);
  assert(/EAS_BUILD_PROFILE === 'production'/.test(config), 'the guard must key on the production profile');
  assert(/ADMOB_ANDROID_APP_ID/.test(config) && /EXPO_PUBLIC_ADMOB_REWARDED_ANDROID/.test(config), 'the guard must require all four real ids');
  assert(/throw new Error/.test(config), 'the guard must throw, not warn');
  assert(/ADMOB_ALLOW_TEST_IN_PRODUCTION/.test(config), 'the deliberate sample-unit escape hatch must be explicit');
});

check('The native hook owns exactly one ad and grants only on earnedReward', () => {
  const source = read(HOOK);
  const creates = [...source.matchAll(/useRewardedAd\(/g)].length;
  assert(creates === 1, `expected one useRewardedAd() instance, found ${creates}`);
  assert(!/RewardedAd\.createForAdRequest/.test(source), 'hand-created instances bypass the hook lifecycle');
  assert(source.includes('earnedReward'), 'the reward must come from earnedReward');
  assert(/if \(earnedReward && !grantedRef\.current\)/.test(source), 'the grant must be idempotent');
  assert(source.includes('MAX_LOAD_RETRIES'), 'retries must be bounded by policy');
  assert(source.includes('retryDelayMs'), 'retries must use the backoff policy');
  assert(source.includes("status === 'closed'"), 'the next ad must be warmed after a close');
});

check('No ad instance is created before consent resolves', () => {
  const source = read(HOOK);
  assert(/adUnitId: ready && adsSupported \? REWARDED_AD_UNIT_ID : null/.test(source), 'the unit must stay null until ready');
  assert(source.includes('startAds()'), 'the hook must wait for the consent boot');
  assert(source.includes('autoLoad: ready && adsSupported'), 'autoload must wait for consent too');
});

check('Consent is gathered before the SDK is initialised', () => {
  const source = read(RUNTIME);
  const consentAt = source.indexOf('AdsConsent.gatherConsent');
  const initAt = source.indexOf('MobileAds().initialize');
  assert(consentAt > -1, 'UMP consent must be gathered');
  assert(initAt > -1, 'the SDK must be initialised');
  assert(consentAt < initAt, 'consent must be gathered before initialisation');
  assert(source.includes('if (!consent) return \'denied\''), 'a denied learner must not get ads');
  assert(source.includes('EMULATOR'), 'emulators must be declared test devices to avoid invalid traffic');
});

check('Web builds never touch the native SDK', () => {
  for (const file of [STUB, WEB_STUB]) {
    const source = read(file);
    assert(!source.includes('react-native-google-mobile-ads'), `${path.relative(ROOT, file)} must not import the SDK`);
    assert(source.includes("status: 'unavailable'"), `${path.relative(ROOT, file)} must report itself unavailable`);
  }
  assert(read(RUNTIME_STUB).includes("Promise.resolve('unavailable')"), 'the web runtime stub must resolve unavailable');
});

// --- 3. Wiring ------------------------------------------------------------

check('Wrong answers never cost a diamond', () => {
  const source = read(PLAYER);
  assert(!/onHeartLost|onHeartsChange|onOutOfHearts|loseDiamond|diamonds\s*<=\s*0/.test(source), 'the player must not spend, gate on, or track diamonds');
  assert(!source.includes('loseDiamond'), 'only a failed lesson may spend a diamond');
  assert(source.includes('Wrong answers are free'), 'the player must say so in a comment');
});

check('A failed lesson spends exactly one diamond', () => {
  const source = read(QUIZ);
  assert(source.includes('loseDiamond(userId)'), 'a failed lesson must persist the lost diamond');
  assert(source.includes('if (userId && !isPremium)'), 'guests and Premium must never lose a diamond');
  assert(source.includes('diamondLost'), 'the results screen must be told about the lost diamond');
  const failBlock = source.slice(source.indexOf('if (!mastered)'));
  assert((source.match(/loseDiamond\(/g) || []).length === 1, 'exactly one call site may spend a diamond');
  assert(failBlock.includes('loseDiamond(userId)'), 'the spend must live in the failed-lesson branch');
});

check('The quiz screen persists diamonds and pauses at zero', () => {
  const source = read(QUIZ);
  assert(source.includes('await grantDiamonds(userId, 1)'), 'a rewarded diamond must be persisted');
  assert(
    /const outOfDiamonds = \(questions\?\.length \?\? 0\) > 0 && diamonds <= 0;/.test(source),
    'the sheet must be derived from the diamond count, not duplicated in state'
  );
  assert(source.includes('diamonds_depleted'), 'depletion must be measured');
  assert(source.includes('<OutOfDiamondsSheet'), 'the quiz screen must render the sheet');
  assert(source.includes('visible={outOfDiamonds}'), 'the sheet is driven by the diamond count');
});

check('The sheet grants the diamond through the caller', () => {
  const source = read(SHEET);
  assert(source.includes('useRewardedDiamond('), 'the sheet must own the rewarded flow');
  assert(source.includes('earnedRef.current()'), 'the reward must be handed to the caller');
  assert(source.includes('visible={visible}'), 'the sheet must be controllable');
  assert(source.includes('Wait for a free diamond'), 'the non-ad path must be offered');
  assert(source.includes('Go Premium'), 'the non-ad path must be offered');
  assert(source.includes('Test ad'), 'a test build must say so on screen');
  assert(source.includes('testAd'), 'telemetry must record test vs live inventory');
});

check('Consent and the ad SDK start with the app', () => {
  const source = read(LAYOUT);
  assert(source.includes("from '../../lib/adsRuntime'"), 'the layout must import the ads runtime');
  assert(/startAds\(\)/.test(source), 'the ads runtime must be started once at startup');
});

check('The refill screen speaks the same language as the sheet', () => {
  const source = read(REFILL);
  assert(source.includes("from '../lib/rewarded/types'"), 'the refill screen must share the reward type');
  assert(source.includes('reward.testAd'), 'the refill screen must label test inventory');
  assert(source.includes('free refill timer still works'), 'a no-fill must offer the timer');
});

check('Privacy policy names AdMob and consent', () => {
  const source = read(PRIVACY);
  assert(/AdMob/.test(source), 'the policy must name the ad network');
  assert(/consent/i.test(source), 'the policy must describe the consent choice');
});

check('Learners can change their ad consent later', () => {
  assert(read(RUNTIME).includes('showPrivacyOptionsForm'), 'the UMP privacy form must be reachable');
  assert(read(RUNTIME_STUB).includes('showAdPrivacyOptions'), 'the web stub must expose the same function');
  const settings = read(SETTINGS);
  assert(settings.includes('showAdPrivacyOptions'), 'Settings must offer the consent form');
  assert(settings.includes('Ad privacy options'), 'the Settings row must be labelled honestly');
});

check('The rail is documented and gated', () => {
  assert(exists(DOCS), 'docs/admob.md is missing');
  const docs = read(DOCS);
  for (const needle of ['EXPO_PUBLIC_ADMOB_REWARDED_ANDROID', 'EXPO_PUBLIC_ADMOB_REWARDED_IOS', 'test ad', 'consent']) {
    assert(docs.toLowerCase().includes(needle.toLowerCase()), `docs/admob.md must document ${needle}`);
  }
  const gates = JSON.parse(read(GATES));
  assert(
    (gates.gates || []).some((g) => g.id === 'ads' && g.required === true),
    'gates.json must require the ads gate'
  );
  const pkg = JSON.parse(read(PACKAGE));
  assert(pkg.scripts['check:ads'] === 'node scripts/check-ads.cjs', 'package.json must expose check:ads');
  assert(String(pkg.scripts.test).includes('check-ads.cjs'), 'npm test must run the ads gate');
});

(async () => {
  for (const { name, fn } of queue) {
    try {
      await fn();
      console.log(`[ok] ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
    }
  }
  if (failures > 0) {
    console.error(`\nAdMob checks failed: ${failures}`);
    process.exit(1);
  }
  console.log('\nAdMob rail checks passed.');
})();
