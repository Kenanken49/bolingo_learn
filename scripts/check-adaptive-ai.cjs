#!/usr/bin/env node
/**
 * Guard the adaptive UI engine, the free/premium feature list and the
 * offline-first AI stack.
 *
 *   1. Behaviour — the real pure modules run under Node: age → stage mapping,
 *      hub honesty (only "live" items link anywhere), feature gating, the
 *      free daily AI allowance, the tutor router, the local vector search over
 *      the real lesson content, the RAG prompt, the sync queue (dedupe,
 *      back-off, network-only queueing) and the pinned model catalog.
 *   2. Wiring — every screen that should use the stack does: home hub, paywall
 *      table, Ask Bingo, quiz/project offline-safe saves, root-layout boot,
 *      Settings stage card and the Offline AI screen.
 *   3. Safety — llama.rn is only reachable from the native runtime file (the
 *      web bundle never references it), the config plugin is registered,
 *      downloads verify exact size and clean up partial files, and the lesson
 *      index is never written to device storage.
 *
 * No network, no device. Usage: node scripts/check-adaptive-ai.cjs
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */


const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const rel = (...p) => path.join(ROOT, ...p);
const read = (file) => fs.readFileSync(file, 'utf8');

// Compile .ts on demand so the checks exercise shipped code, not a copy.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

let failures = 0;
let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`[ok] ${name}`);
  } catch (e) {
    failures++;
    console.error(`[FAIL] ${name}\n       ${e instanceof Error ? e.message : e}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const stage = require(rel('lib', 'lifeStage.ts'));
const ent = require(rel('lib', 'entitlements.ts'));
const retrieval = require(rel('lib', 'edgeAI', 'retrieval.ts'));
const router = require(rel('lib', 'edgeAI', 'router.ts'));
const queue = require(rel('lib', 'sync', 'syncQueue.ts'));
const engine = require(rel('lib', 'edgeAI', 'edgeEngine.ts'));
const lease = require(rel('lib', 'edgeAI', 'premiumLease.ts'));

// --- 1. Behaviour -----------------------------------------------------------

check('Ages map to the three life stages, with safe edges', () => {
  const cases = [[10, 'explorer'], [18, 'explorer'], [19, 'launcher'], [25, 'launcher'], [26, 'climber'], [40, 'climber'], [9, 'explorer'], [55, 'climber']];
  for (const [age, want] of cases) assert(stage.stageForAge(age) === want, `age ${age} → ${stage.stageForAge(age)}, want ${want}`);
  assert(stage.stageForAge(3) === null && stage.stageForAge(NaN) === null, 'nonsense ages must be rejected');
  assert(stage.stageForAgeInput(' 17 ') === 'explorer', 'typed age with spaces must parse');
  assert(stage.stageForAgeInput('17a') === null && stage.stageForAgeInput('') === null, 'non-numeric input must be rejected');
  assert(stage.stageProfile('bogus').id === 'launcher', 'unknown ids fall back to a sane default');
});

check('Each stage has a distinct UX profile from the blueprint', () => {
  const { explorer, launcher, climber } = stage.LIFE_STAGES;
  assert(explorer.tier === 1 && launcher.tier === 2 && climber.tier === 3, 'tiers 1–3');
  assert(explorer.ux.gamification === 'high' && climber.ux.gamification === 'low', 'gamification high → low');
  assert(climber.ux.audioFirst === true && explorer.ux.audioFirst === false, 'climbers are audio-first');
  assert(climber.hub[0].id === 'audio', 'commute (audio) mode leads the climber hub');
  assert(climber.ux.sessionMinutes < launcher.ux.sessionMinutes, 'climbers get bite-sized sessions');
});

check('Hub items are honest: only live items link, and every link is a real route', () => {
  const appDir = rel('src', 'app');
  for (const s of Object.values(stage.LIFE_STAGES)) {
    for (const item of s.hub) {
      if (item.status === 'soon') assert(!item.href, `${s.id}/${item.id} is "soon" but links somewhere`);
      if (item.status === 'live') {
        assert(item.href, `${s.id}/${item.id} is live without a route`);
        const route = item.href === '/' ? 'index' : item.href.slice(1);
        assert(fs.existsSync(path.join(appDir, `${route}.tsx`)), `${s.id}/${item.id} links to missing route ${item.href}`);
      }
    }
    assert(stage.liveHubItems(s.id).length >= 3, `${s.id} needs at least three live hub items`);
  }
});

check('Feature list: core stays free, unbuilt features never gate anyone', () => {
  assert(ent.canUse('core_curriculum', false), 'core curriculum must be free');
  assert(ent.canUse('ai_tutor_text', false) && ent.canUse('offline_tutor', false), 'text + offline tutor are free');
  assert(!ent.canUse('offline_model', false) && ent.canUse('offline_model', true), 'on-device model is Premium');
  for (const f of ent.FEATURES.filter((x) => x.status === 'soon')) {
    assert(!ent.canUse(f.id, true) && !ent.canUse(f.id, false), `${f.id} is unbuilt but usable`);
  }
  const rows = ent.paywallRows();
  assert(rows.live.length + rows.soon.length === ent.FEATURES.length, 'paywall rows must cover the whole list');
  assert(rows.soon.every((f) => f.status === 'soon'), 'only unbuilt features are listed as coming soon');
  assert(new Set(ent.FEATURES.map((f) => f.id)).size === ent.FEATURES.length, 'feature ids are unique');
});

check('Free daily AI allowance: counts, caps, resets at midnight, Premium unlimited', () => {
  const today = ent.budgetDay(new Date(2026, 10, 4, 23, 59));
  const tomorrow = ent.budgetDay(new Date(2026, 10, 5, 0, 1));
  assert(today !== tomorrow, 'local midnight must start a new day');
  let s = ent.normalizeBudget(null, today);
  s = ent.spendBudget(s, ent.FREE_DAILY_AI_TOKENS - 1);
  assert(!ent.budgetView(s, false).exhausted, 'one token left is not exhausted');
  s = ent.spendBudget(s, 5);
  assert(ent.budgetView(s, false).exhausted && ent.budgetView(s, false).remaining === 0, 'over the cap is exhausted');
  assert(!ent.budgetView(s, true).exhausted && ent.budgetView(s, true).unlimited, 'Premium is never exhausted');
  assert(ent.normalizeBudget(s, tomorrow).used === 0, "yesterday's usage must not carry over");
  assert(ent.spendBudget(s, -50).used === s.used && ent.spendBudget(s, NaN).used === s.used, 'bad spends are ignored');
});

check('Tutor router: cloud only when online and within allowance', () => {
  const base = { online: true, isPremium: false, budgetExhausted: false, edgeModelReady: false };
  assert(router.chooseRoute(base).route === 'cloud', 'online free learner with allowance → cloud');
  assert(router.chooseRoute({ ...base, online: false }).route === 'edge-retrieval', 'offline, no model → lesson search');
  assert(router.chooseRoute({ ...base, online: false, edgeModelReady: true }).route === 'edge-model', 'offline with model → on-device');
  const budget = router.chooseRoute({ ...base, budgetExhausted: true });
  assert(budget.route === 'edge-retrieval' && budget.reason === 'budget', 'spent allowance → local, labelled budget');
  assert(router.chooseRoute({ ...base, budgetExhausted: true, isPremium: true }).route === 'cloud', 'Premium ignores the allowance');
  assert(router.chooseRoute({ ...base, preferOffline: true }).reason === 'preference', '"always offline" wins');
  assert(router.fallbackRoute(false, false).reason === 'cloud-error', 'non-network cloud failure is labelled');
  assert(/offline/.test(router.routeLabel(router.fallbackRoute(true, true))), 'network failure label says offline');
});

check('Local vector search finds the right lesson in the real course content', () => {
  const { COURSES } = require(rel('lib', 'courses.ts'));
  const passages = [];
  for (const lesson of Object.values(COURSES)) {
    (lesson.theory || []).forEach((text, i) => {
      if (typeof text === 'string' && text.trim().length >= 20) passages.push({ id: `${lesson.id}#${i}`, source: lesson.title, text });
    });
  }
  assert(passages.length >= 50, `expected a real lesson pack, got ${passages.length} passages`);
  const index = retrieval.buildIndex(passages);
  const html = retrieval.search(index, 'what does the h1 heading tag do', 3);
  assert(html.length > 0, 'an HTML heading question must find something');
  assert(html.some((h) => /<h1>|heading/i.test(h.passage.text)), `heading question matched: ${html.map((h) => h.passage.source).join(', ')}`);
  assert(retrieval.search(index, 'zzqx vlorp', 3).length === 0, 'gibberish must find nothing');
  const again = retrieval.buildIndex(passages);
  assert(JSON.stringify(again.passages[0].vector) === JSON.stringify(index.passages[0].vector), 'embeddings are deterministic');
});

check('RAG prompt carries the retrieved lesson text and the question', () => {
  const hit = { passage: { id: 'x', source: 'Basic HTML tags', text: 'Headings run from <h1> to <h6>.' }, score: 0.9 };
  const prompt = retrieval.ragPrompt('Which heading is biggest?', [hit]);
  assert(prompt.includes('Headings run from <h1> to <h6>.') && prompt.includes('Which heading is biggest?'), 'prompt must embed both');
  assert(/only from the lesson extracts/i.test(prompt), 'prompt must pin the model to the extracts');
});

check('Sync queue: dedupes per day, backs off, only queues network failures', () => {
  const now = Date.UTC(2026, 10, 4, 10);
  let q = queue.enqueue([], { userId: 'u', lessonId: 'html-tags', xp: 10 }, now);
  q = queue.enqueue(q, { userId: 'u', lessonId: 'html-tags', xp: 15 }, now + 1000);
  assert(q.length === 1 && q[0].payload.xp === 15, 'same lesson, same day → one item, higher XP');
  q = queue.enqueue(q, { userId: 'u', lessonId: 'html-tags', xp: 5 }, now + 86400000);
  assert(q.length === 2, 'a new day queues again');
  const failed = queue.markFailed(q, q[0].id, now);
  assert(failed[0].attempts === 1 && failed[0].nextAttemptAt === now + 5000, 'first retry waits 5s');
  assert(queue.backoffMs(99) === 30 * 60 * 1000, 'back-off is capped at 30 minutes');
  let dying = q;
  for (let i = 0; i < queue.MAX_ATTEMPTS; i++) dying = queue.markFailed(dying, q[0].id, now);
  assert(!dying.some((i) => i.id === q[0].id), 'items are dropped after MAX_ATTEMPTS');
  assert(queue.markDone(q, q[0].id).length === 1, 'done items leave the queue');
  for (const e of [new TypeError('Network request failed'), { message: 'TypeError: Failed to fetch' }, new Error('Failed to send a request to the Edge Function')]) {
    assert(queue.isNetworkError(e), `must queue on: ${e.message}`);
  }
  for (const e of [new Error('Profile not found.'), { message: 'duplicate key value violates unique constraint' }]) {
    assert(!queue.isNetworkError(e), `must not queue (risk of double XP) on: ${e.message}`);
  }
});

check('Model catalog is pinned and verifiable', () => {
  for (const m of engine.EDGE_MODELS) {
    assert(/^[0-9a-f]{40}$/.test(m.revision), `${m.id}: revision must be a full commit hash`);
    assert(m.url.includes(`/resolve/${m.revision}/`), `${m.id}: URL must use the pinned revision, not main`);
    assert(m.url.endsWith(`/${m.fileName}`) && m.format === 'GGUF', `${m.id}: file name/format mismatch`);
    assert(Number.isInteger(m.bytes) && m.bytes > 5e8, `${m.id}: exact byte size required`);
    assert(Math.abs(m.bytes / 1e6 - m.sizeMb) < 20, `${m.id}: display size drifts from real size`);
    assert(/^[0-9a-f]{64}$/.test(m.sha256), `${m.id}: sha256 required`);
    assert(m.license, `${m.id}: licence must be shown`);
  }
  const spec = engine.EDGE_MODELS[0];
  assert(engine.installIsCurrent(spec, { revision: spec.revision, bytes: spec.bytes }), 'exact install is current');
  assert(!engine.installIsCurrent(spec, { revision: 'old', bytes: spec.bytes }), 'old revision → update available');
  assert(!engine.installIsCurrent(spec, { revision: spec.revision, bytes: spec.bytes - 1 }), 'truncated file is never current');
});

check('Study rooms: shared wall-clock timer, fixed vocab only, safe presence parsing', () => {
  const rooms = require(rel('lib', 'studyRooms.ts'));
  const t0 = Date.UTC(2026, 10, 4, 10, 0, 0);
  assert(rooms.pomodoro(t0).phase === 'focus' && rooms.pomodoro(t0).remainingSec === 25 * 60, 'focus starts on the half hour');
  assert(rooms.pomodoro(t0 + 25 * 60e3).phase === 'break', 'break follows 25 minutes of focus');
  assert(rooms.pomodoro(t0 + 30 * 60e3).phase === 'focus', 'focus resumes after the break');
  assert(rooms.formatClock(65) === '01:05', 'clock formats mm:ss');
  assert(rooms.sanitizeMember('k', { name: 'Amani<script>', room: 'js', status: 'Focusing' }).name === 'Amaniscript', 'names are stripped to safe characters');
  assert(rooms.sanitizeMember('k', { name: 'A', room: 'js', status: 'free text here' }) === null, 'unknown statuses are rejected (no free text)');
  assert(rooms.sanitizeMember('k', { name: 'A', room: 'nope', status: 'Focusing' }) === null, 'unknown rooms are rejected');
  const counts = rooms.roomCounts([{ key: 'a', name: 'A', room: 'js', status: 'Focusing' }, { key: 'b', name: 'B', room: 'js', status: 'Revising' }]);
  assert(counts.js === 2, 'room counts add up');
});

check('Squad Cup: same seed → same round, fair scoring, host election, team averages', () => {
  const cup = require(rel('lib', 'squadCup.ts'));
  const { COURSES } = require(rel('lib', 'courses.ts'));
  const { LANGUAGE_COURSES } = require(rel('lib', 'languages.ts'));
  const pool = [...Object.values(COURSES), ...Object.values(LANGUAGE_COURSES)].flatMap((l) => l.questions);
  const eligible = pool.filter(cup.isCupEligible);
  assert(eligible.length >= 100, `need a deep multiple-choice pool, got ${eligible.length}`);
  const a = cup.pickCupQuestions(pool, 12345), b = cup.pickCupQuestions(pool, 12345), c = cup.pickCupQuestions(pool, 999);
  assert(a.length === cup.CUP_QUESTIONS && JSON.stringify(a) === JSON.stringify(b), 'a seed must give every device the same round');
  assert(JSON.stringify(a) !== JSON.stringify(c), 'different seeds give different rounds');
  assert(a.every((q) => q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length >= 3), 'every question keeps its answer among distinct options');
  assert(cup.scoreAnswer(false, 20000) === 0 && cup.scoreAnswer(true, 0) === 100 && cup.scoreAnswer(true, 20000) === 150, 'scoring: 100 + up to 50 speed');
  const players = [
    { key: 'z', name: 'Z', team: 'A', joinedAt: 5, score: 300 },
    { key: 'y', name: 'Y', team: 'B', joinedAt: 2, score: 200 },
    { key: 'x', name: 'X', team: 'A', joinedAt: 9, score: 100 },
  ];
  assert(cup.cupHost(players) === 'y', 'earliest joiner hosts');
  const t = cup.teamTotals(players);
  assert(t.A.average === 200 && t.B.average === 200, 'team score is the per-player average');
  assert(cup.cupClock(1000, 500).index === -1 && cup.cupClock(1000, 1000 + 20000 * 3 + 5).index === 3, 'clock picks the live question');
  assert(cup.cupClock(0, 20000 * 8).done, 'round ends after the last question');
  assert(cup.isCupCode(cup.makeCupCode()) && cup.normalizeCupCode(' ab-c12x9 ') === 'ABC12X', 'codes are six safe characters');
});

check('Avatar studio: unlocks come from real progress, saved looks cannot cheat', () => {
  const av = require(rel('lib', 'avatar.ts'));
  const newbie = { level: 1, streak: 0, certs: 0 };
  const pro = { level: 12, streak: 30, certs: 2 };
  assert(av.AVATAR_ITEMS.filter((i) => av.isUnlocked(i, newbie)).length >= 5, 'a new learner starts with a real wardrobe');
  assert(av.AVATAR_ITEMS.every((i) => av.isUnlocked(i, pro)), 'everything is earnable by learning (nothing paid)');
  const forged = av.resolveLook({ hat: 'hat-crown', outfit: 'fit-kente', skin: 'skin-9', eyes: 'bg-dawn' }, newbie);
  assert(forged.hat === 'hat-none' && forged.outfit === av.DEFAULT_LOOK.outfit, 'locked items in a saved look fall back');
  assert(forged.skin === av.DEFAULT_LOOK.skin && forged.eyes === av.DEFAULT_LOOK.eyes, 'unknown or wrong-slot items fall back');
  assert(av.resolveLook({ hat: 'hat-crown' }, pro).hat === 'hat-crown', 'unlocked items are kept');
});

check('Job matching counts only earned certifications', () => {
  const jm = require(rel('lib', 'jobMatch.ts'));
  const m = jm.matchJob(['rwd', 'js', 'rwd'], new Set(['rwd']));
  assert(m.score === 0.5 && m.have.join() === 'rwd' && m.missing.join() === 'js', 'half match, with the gap named');
  assert(jm.matchJob([], new Set(['rwd'])).score === 0, 'a listing with no requirements never claims a match');
  const ranked = jm.rankJobs(
    [
      { id: 1, requiredTracks: ['js'], postedAt: '2026-11-01' },
      { id: 2, requiredTracks: ['rwd'], postedAt: '2026-10-01' },
      { id: 3, requiredTracks: ['rwd'], postedAt: '2026-11-02' },
    ],
    new Set(['rwd'])
  );
  assert(ranked.map((j) => j.id).join() === '3,2,1', 'best match first, newest breaks ties');
});

check('Public credentials and jobs are server-checked', () => {
  const cred = read(rel('server', 'api', 'credentials.mjs'));
  assert(cred.includes('lesson_completions') && /ids\.every\(\(id\) => passed\.has\(id\)\)/.test(cred), 'issuing must re-check every project server-side');
  const router = read(rel('server', 'index.mjs'));
  assert(/credentials: \{ handler: credentials/.test(router) && /jobs: \{ handler: jobs/.test(router), 'credential and job routes');
  assert(!/service_role|SERVICE_ROLE/.test(cred + read(rel('server', 'lib', 'supabaseAuth.mjs'))), 'the API must not use a Supabase service-role key');
  const jobs = read(rel('server', 'api', 'jobs.mjs'));
  assert(jobs.includes('isAdmin(user)') && jobs.includes("https:\\/\\/"), 'only admins post, and apply links must be https');
  assert(fs.readdirSync(rel('db', 'migrations')).some((f) => f.endsWith('.sql')), 'a migration must exist for the new tables');
  assert(fs.existsSync(rel('src', 'app', 'verify', '[code].tsx')), 'public /verify/<code> page');
});

// --- 2. Wiring --------------------------------------------------------------

const src = {
  home: read(rel('src', 'app', 'index.tsx')),
  paywall: read(rel('src', 'app', 'paywall.tsx')),
  askBingo: read(rel('components', 'AskBingo.tsx')),
  quiz: read(rel('src', 'app', 'quiz', '[lessonId].tsx')),
  project: read(rel('src', 'app', 'project', '[lessonId].tsx')),
  results: read(rel('src', 'app', 'results.tsx')),
  layout: read(rel('src', 'app', '_layout.tsx')),
  settings: read(rel('src', 'app', 'settings.tsx')),
  offline: read(rel('src', 'app', 'offline-ai.tsx')),
  hub: read(rel('components', 'LifeStageHub.tsx')),
};

check('Home shows the learning-space picker', () => {
  // The dashboard hero carries the wireframe's Explorer / Launcher / Climber
  // tabs; they drive a persisted space that retargets resume + track order.
  assert(src.home.includes('useLearningSpace'), 'home must read the learning space');
  assert(src.home.includes('resumeForSpace'), 'home resume must adapt to the space');
  assert(src.home.includes('onSpace'), 'hero must expose the space tabs');
  assert(src.hub.includes('<StagePicker') && src.hub.includes("router.push('/offline-ai')"), 'hub needs the picker and the Offline AI link');
});

check('Paywall table is built from the feature list', () => {
  assert(src.paywall.includes('paywallRows().live') && src.paywall.includes('paywallRows().soon'), 'paywall must render paywallRows()');
  assert(!/\['heart', 'Hearts'/.test(src.paywall), 'the old hard-coded comparison rows must be gone');
});

check('Ask Bingo uses the offline-first tutor and shows the allowance', () => {
  assert(src.askBingo.includes('askTutor(') && !/\baskBingo\(/.test(src.askBingo), 'sheet must call askTutor, not askBingo directly');
  assert(src.askBingo.includes('<AllowanceMeter'), 'sheet must show the allowance meter');
});

check('Quiz and project completion are offline-safe', () => {
  for (const [name, code] of [['quiz', src.quiz], ['project', src.project]]) {
    assert(code.includes('completeLessonOfflineFirst('), `${name} must save through completeLessonOfflineFirst`);
    assert(!/\bcompleteLesson\(/.test(code), `${name} still calls the online-only completeLesson`);
    assert(code.includes('pendingSync'), `${name} must flag results waiting to sync`);
  }
  assert(src.project.includes('offlineUserId()'), 'project must find the learner offline from the saved session');
  assert(src.results.includes('result.pendingSync'), 'results screen must explain a pending sync');
});

check('Root layout boots Smart Sync and the on-device engine', () => {
  assert(src.layout.includes('startAutoSync()') && src.layout.includes('startEdgeEngine()'), 'both must start in the root layout');
  assert(src.layout.includes('name="offline-ai"'), 'Offline AI route must be registered');
  assert(src.paywall.includes('refreshEdgeEngine(true)'), 'a confirmed purchase must unlock the model immediately');
});

check('New community screens are wired and registered', () => {
  for (const route of ['study-rooms', 'squad-cup', 'avatar', 'jobs', 'verify/[code]']) {
    assert(src.layout.includes(`name="${route}"`), `route ${route} must be registered`);
  }
  const certs = read(rel('src', 'app', 'certifications.tsx'));
  assert(certs.includes('issueCredential(') && certs.includes('Share.share('), 'certified tracks must offer a shareable link');
  const rooms = read(rel('src', 'app', 'study-rooms.tsx'));
  assert(rooms.includes('sanitizeMember(') && !/<TextInput/.test(rooms), 'study rooms render sanitized presence and have no free-text input');
  const cupSrc = read(rel('src', 'app', 'squad-cup.tsx'));
  assert(cupSrc.includes('pickCupQuestions(') && cupSrc.includes('cupHost('), 'Squad Cup derives rounds from the seed and elects a host');
});

check('Settings and the Offline AI screen expose every control', () => {
  assert(src.settings.includes('Your space') && src.settings.includes('useLearningSpace()'), 'settings must let the learner change space');
  assert(src.settings.includes("router.push('/offline-ai')"), 'settings must link to Offline AI');
  for (const needle of ['Always use offline AI', 'Sync now', 'startModelDownload(', 'setActiveModel(', 'deleteModel(', 'flushSyncQueue(true)']) {
    assert(src.offline.includes(needle), `Offline AI screen is missing: ${needle}`);
  }
});

// --- 3. Safety --------------------------------------------------------------

check('llama.rn is native-only, and the config plugin is registered', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.native.ts')) {
        if (/(require|from)\s*\(?\s*['"]llama\.rn['"]/.test(read(p))) offenders.push(path.relative(ROOT, p));
      }
    }
  };
  ['lib', 'components', path.join('src', 'app')].forEach((d) => walk(rel(d)));
  assert(offenders.length === 0, `llama.rn imported outside a .native file: ${offenders.join(', ')}`);
  assert(read(rel('lib', 'edgeAI', 'llamaRuntime.native.ts')).includes("require('llama.rn')"), 'native runtime must load llama.rn lazily');
  assert(read(rel('lib', 'edgeAI', 'llamaRuntime.ts')).includes('return false'), 'web stub must report no runtime');
  assert(read(rel('app.config.js')).includes("'llama.rn'"), 'llama.rn config plugin must be registered');
  assert(JSON.parse(read(rel('package.json'))).dependencies['llama.rn'], 'llama.rn must be a dependency');
});

check('Model downloads verify size, stay Premium-only, and clean up', () => {
  const store = read(rel('lib', 'edgeAI', 'modelStore.ts'));
  assert(store.includes('size !== spec.bytes'), 'downloads must be checked against the exact byte size');
  assert(/canUse\('offline_model', isPremium\)/.test(store), 'downloads and activation must be Premium-gated');
  assert((store.match(/deleteAsync\(partUri/g) || []).length >= 3, 'failed, wrong-size and cancelled downloads must delete the partial file');
  assert(store.includes('getFreeDiskStorageAsync'), 'free disk space must be checked first');
});

check('Offline Premium is a lease: it ends at the paid-through date, 7 days at most', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 10, 4);
  assert(lease.OFFLINE_LEASE_MAX_MS === 7 * DAY, 'the offline cap must be 7 days');
  // Unknown end date (or lifetime) → the cap alone.
  assert(lease.leaseFromCheck(now, { until: null, willRenew: false }).validUntil === now + 7 * DAY, 'no end date → 7-day cap');
  // M-Pesa month ending in 3 days, no auto-renew → ends exactly then.
  const mpesa = lease.leaseFromCheck(now, { until: now + 3 * DAY, willRenew: false });
  assert(mpesa.validUntil === now + 3 * DAY, 'a non-renewing plan must end at its paid-through date');
  // Store plan renewing in 3 days → 2 days of slack for an offline renewal.
  assert(lease.leaseFromCheck(now, { until: now + 3 * DAY, willRenew: true }).validUntil === now + 5 * DAY, 'auto-renewing plans get the renewal slack');
  // A period paid well ahead is still capped.
  assert(lease.leaseFromCheck(now, { until: now + 30 * DAY, willRenew: true }).validUntil === now + 7 * DAY, 'long periods are capped at 7 days');
  // The lapse the fix is about: subscription ends while offline.
  assert(lease.leaseValid(mpesa, now + 3 * DAY - 1), 'valid until the last moment');
  assert(!lease.leaseValid(mpesa, now + 3 * DAY), 'a lapsed subscription must stop the model while still offline');
  assert(!lease.leaseValid(null, now), 'no lease, no offline Premium');
});

check('Offline Premium lease resists clock rollback and bad storage', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 10, 4);
  let l = lease.leaseFromCheck(now, { until: null, willRenew: false });
  l = lease.touchLease(l, now + 6 * DAY);
  assert(l.seenAt === now + 6 * DAY, 'touch must record the newest time seen');
  assert(lease.touchLease(l, now).seenAt === now + 6 * DAY, 'touch must never move backwards');
  assert(!lease.leaseValid(l, now + 1 * DAY), 'rewinding the clock after the lease was seen later must void it');
  assert(lease.leaseValid(l, now + 6 * DAY - lease.CLOCK_SKEW_MS + 1000), 'small clock corrections are tolerated');
  assert(lease.parseLease(JSON.stringify(l)).validUntil === l.validUntil, 'a stored lease must round-trip');
  for (const bad of [null, '', 'x', '1', 'true', '{"v":1}', JSON.stringify({ ...l, v: 2 }), JSON.stringify({ ...l, validUntil: 'soon' })]) {
    assert(lease.parseLease(bad) === null, `junk must not parse as a lease: ${bad}`);
  }
  // Across rails: the latest end wins; a lifetime rail leaves only the cap.
  const a = { until: now + DAY, willRenew: true }, b = { until: now + 3 * DAY, willRenew: false };
  assert(lease.latestPaidThrough([a, null, b]) === b, 'the latest paid-through date must win');
  assert(lease.latestPaidThrough([a, { until: null, willRenew: false }]).until === null, 'a rail with no end date means cap only');
  assert(lease.latestPaidThrough([null, null]).until === null, 'no answers means cap only');
});

check('The lease is wired: boot writes and honours it, the model checks it per answer', () => {
  const boot = read(rel('lib', 'edgeAI', 'edgeBoot.ts'));
  assert(/leaseFromCheck\(/.test(boot) && /premiumPaidThrough\(/.test(boot), 'online checks must write a lease from the paid-through date');
  assert(/leaseValid\(/.test(boot), 'offline plan resolution must go through the lease');
  assert(/removeItem\(K_LEGACY_LAST_PREMIUM\)/.test(boot), 'the old open-ended Premium flag must be cleared');
  assert(!/getItem\(K_LEGACY_LAST_PREMIUM\)/.test(boot), 'the old open-ended Premium flag must never grant anything');
  assert(/setOfflineLeaseUntil\(/.test(boot) && /setTimeout\(/.test(boot), 'boot must hand the deadline to the engine and re-check at the lease end');
  const store = read(rel('lib', 'edgeAI', 'modelStore.ts'));
  assert(/!leaseExpired\(\)/.test(store), 'activation must refuse an expired lease');
  const gen = store.slice(store.indexOf('async generate('));
  assert(gen.indexOf('leaseExpired()') !== -1 && gen.indexOf('leaseExpired()') < gen.indexOf('loadLlamaModel'), 'each answer must check the lease before loading or running the model');
  const screen = read(rel('src', 'app', 'offline-ai.tsx'));
  assert(screen.includes('offlineLeaseUntil()') && screen.includes('Works offline until'), 'the Offline AI screen must show the lease end date');
});

check('The on-device model never answers without lesson text to ground it', () => {
  const tutor = read(rel('lib', 'edgeAI', 'tutor.ts'));
  assert(/const grounded = hits\.length > 0 \|\| !!context\.theory/.test(tutor), 'tutor must compute grounding from retrieved lesson text');
  assert(/decision\.route === 'edge-model' && engine && grounded/.test(tutor), 'the model must only run when grounded');
});

check('Learner words reach lesson words (stemming + synonyms)', () => {
  for (const [a, b] of [['move', 'moving'], ['file', 'files'], ['class', 'classes'], ['heading', 'headings'], ['run', 'running'], ['copy', 'copies']]) {
    assert(retrieval.stem(a) === retrieval.stem(b), `${a}/${b} must stem alike (${retrieval.stem(a)} vs ${retrieval.stem(b)})`);
  }
  assert(retrieval.stem('habari') === 'habari' && retrieval.stem('css') === 'css', 'short and non-English words are left alone');
  assert(retrieval.queryTerms('copy a folder').includes('directory'), 'folder must reach directory');
  const index = retrieval.buildIndex([
    { id: 'mv', source: 'Mv Command', text: 'Or you can actually move a file to a different directory: mv file2 /home/pete/Documents' },
    { id: 'pwd', source: 'Pwd Command', text: 'Everything in Linux is a file. Every file is organized in a hierarchical directory tree.' },
    { id: 'css', source: 'CSS selectors', text: 'A class selector starts with a dot and styles every element with that class.' },
  ]);
  const top = retrieval.search(index, 'How do I move a file to another folder in Linux?', 1)[0];
  assert(top && top.passage.source === 'Mv Command', `natural phrasing must find mv first, got ${top && top.passage.source}`);
});

check('The lesson index is never written to device storage', () => {
  const knowledge = read(rel('lib', 'edgeAI', 'knowledge.ts'));
  assert(!/AsyncStorage|FileSystem|SecureStore/.test(knowledge), 'knowledge pack must stay in memory');
});

check('Course allocation: each space orders the real catalog its own way', () => {
  const alloc = require(rel('lib', 'spaceAllocation.ts'));
  const meta = ['html', 'rwd', 'design', 'lang', 'certs', 'linux'];
  for (const space of ['explorer', 'launcher', 'climber']) {
    const ordered = alloc.orderCourseIds(meta, space);
    assert(ordered.length === meta.length && new Set(ordered).size === meta.length, `${space}: allocation must cover every course exactly once`);
  }
  assert(alloc.orderCourseIds(meta, 'explorer')[0] === 'lang', 'explorers meet languages first');
  assert(alloc.orderCourseIds(meta, 'climber')[0] === 'certs', 'climbers meet certs first');
  assert(alloc.certsFirst('climber') && !alloc.certsFirst('explorer') && !alloc.certsFirst('launcher'), 'only climbers meet certs first');
  assert(alloc.spaceUx('climber').audioFirst === true && alloc.spaceUx('explorer').audioFirst === false, 'climbers are audio-first');
  assert(alloc.spaceUx('climber').sessionMinutes < alloc.spaceUx('launcher').sessionMinutes, 'climbers get bite-sized sessions');
  const dashSrc = read(rel('lib', 'dashboard.ts'));
  assert(dashSrc.includes('orderCourseIds(') && dashSrc.includes('certsFirst('), 'dashboard shelf must order through the allocation map');
});

check('Screen transitions: every tier steers through real routes only', () => {
  const alloc = require(rel('lib', 'spaceAllocation.ts'));
  const appDir = rel('src', 'app');
  for (const space of ['explorer', 'launcher', 'climber']) {
    const routes = alloc.transitionsFor(space);
    assert(routes.length >= 3, `${space} needs at least three primary destinations`);
    for (const r of routes) {
      const route = r.href === '/' ? 'index' : r.href.slice(1);
      assert(fs.existsSync(path.join(appDir, `${route}.tsx`)), `${space} links to missing route ${r.href}`);
    }
  }
});

console.log(`\n${passed} passed, ${failures} failed.`);
if (failures > 0) {
  console.error('Adaptive UI + offline AI gate FAILED.');
  process.exit(1);
}
console.log('Adaptive UI + offline AI gate OK — stages, feature list, tutor routing, local search, sync queue, pinned models and screen wiring verified.');
