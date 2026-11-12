/* global process, require, __dirname, console */
/**
 * Gate for `scripts/clean-abi.sh`, the tool that reclaims the ~2.1 GB per Android
 * ABI that a device build leaves behind in `.cxx` and `build/intermediates`.
 *
 * The script deletes. A delete tool with no gate is a tool somebody is afraid to
 * run, so this builds disposable fixture trees and proves the guard rails hold:
 *
 *   1. a report run deletes nothing and names only non-pinned ABI folders;
 *   2. `--delete` clears exactly those, and nothing under `src/` — a
 *      `jniLibs/<abi>/` folder is shipped code, and losing it breaks the link;
 *   3. the ABI pinned in `$GRADLE_USER_HOME/gradle.properties` is refused unless
 *      `--force` is passed, because clearing it means recompiling it;
 *   4. a target reached through a symlink or junction that points outside its own
 *      root is skipped — this project runs `node_modules` as a junction onto
 *      another volume, so containment is checked after full resolution;
 *   5. a second run finds nothing (idempotent), and bad arguments are refused
 *      before any file is touched;
 *   6. a partial delete inside a task's own output directory is labelled `heals`
 *      rather than widened: the sibling folder holding the pinned ABI's objects
 * *must survive*, because deleting the whole owning task directory would take it
 *      with it (proved against a real `assembleDebug`, which re-ran the owning
 *      task and wrote the deleted bytes back — README: "Partial deletes, checked
 *      against Gradle's up-to-date checks");
 *   7. a folder whose name merely equals an ABI, sitting deeper inside a
 *      single-ABI tree, is dropped and never deleted — llama.rn keeps object dirs
 *      at `.../ggml-cpu/arch/x86`, inside the pinned `x86_64` tree;
 *   8. with `--real`, a read-only survey of this checkout, asserting only that the
 *      script runs and deletes nothing in report mode.
 *
 * The assertions are about the script's own behaviour on fixtures, so the gate
 * passes on a fresh clone with no native build, and on Linux CI as well as Git
 * Bash. Nothing here ever deletes from the real project.
 *
 * The real survey is opt-in because it sizes every artifact folder before saying a
 * number: measured here it took 64 s with a warm disk cache and 186 s cold, which
 * is far too slow to sit in front of every release. `npm run android:clean-abi`
 * reports the same thing on its own, so the gate stays a fixture test.
 *
 *   node scripts/check-abi-clean.cjs
 *   node scripts/check-abi-clean.cjs --real        # also survey this checkout
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join('scripts', 'clean-abi.sh');
const ARM = 'arm64-v8a';
const X64 = 'x86_64';

const problems = [];
const notes = [];

function check(name, ok, detail) {
  if (ok) {
    console.log(`[ok] ${name}`);
    return;
  }
  const extra = detail ? ` — ${detail}` : '';
  problems.push(`${name}${extra}`);
  console.log(`[FAIL] ${name}${extra}`);
}

function bash() {
  const candidates = [process.env.BASH, 'bash'];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

/** Files the fixture writes; every one is a marker for "must still exist later". */
function makeFixture(label) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), `abi-clean-${label}-`));
  const project = path.join(base, 'project');
  const gradleHome = path.join(base, 'gradle-home');
  const moduleAndroid = path.join(project, 'node_modules', 'demo', 'android');
  const app = path.join(project, 'android', 'app');

  const files = [
    // arm64-v8a artifacts in every generated shape the script claims to know
    path.join(moduleAndroid, '.cxx', 'Debug', 'hashA', ARM, 'a.o'),
    path.join(moduleAndroid, '.cxx', 'Debug', 'hashA2', ARM, 'a2.o'),
    path.join(moduleAndroid, '.cxx', 'tools', 'debug', ARM, 'compile_commands.json'),
    path.join(moduleAndroid, '.cxx', 'RelWithDebInfo', 'hashR', ARM, 'r.o'),
    path.join(moduleAndroid, 'build', 'intermediates', 'cxx', 'Debug', 'hashA', 'obj', ARM, 'libdemo.so'),
    path.join(moduleAndroid, 'build', 'intermediates', 'merged_native_libs', 'debug', 'out', 'lib', ARM, 'libdemo.so'),
    path.join(app, '.cxx', 'Debug', 'hashB', ARM, 'app.o'),
    path.join(app, 'build', 'intermediates', 'stripped_native_libs', 'debug', 'out', 'lib', ARM, 'libdemo.so'),
    // a *sibling* of the pinned ABI inside the very task output being cleared: if
    // the target were widened to the owning task directory, this object would go
    path.join(moduleAndroid, 'build', 'intermediates', 'merged_native_libs', 'debug', 'out', 'lib', X64, 'libdemo64.so'),
    // a directory named like the x86 ABI that is NOT a per-ABI artifact: it sits
    // deep inside one ABI's object tree, exactly where llama.rn puts its own
    path.join(moduleAndroid, '.cxx', 'Debug', 'hashA', X64, 'rnllama', 'CMakeFiles', 'rnllama.dir', 'vendor', 'arch', 'x86', 'arch_x86.o'),
    // the ABI a build pinned to this one needs, plus files that must survive
    path.join(moduleAndroid, '.cxx', 'Debug', 'hashA', X64, 'b.o'),
    path.join(app, '.cxx', 'Debug', 'hashB', X64, 'd.o'),
    path.join(app, 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    // shipped code that lives in a folder named after the very ABI being cleared
    path.join(moduleAndroid, 'src', 'main', 'jniLibs', ARM, 'libshipped.so'),
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'fixture\n');
  }
  fs.mkdirSync(gradleHome, { recursive: true });
  fs.writeFileSync(path.join(gradleHome, 'gradle.properties'), `reactNativeArchitectures=${X64}\norg.gradle.caching=true\n`);

  return { base, project, gradleHome, moduleAndroid, app, files };
}

function cleanup(fixture) {
  try {
    fs.rmSync(fixture.base, { recursive: true, force: true });
  } catch (error) {
    notes.push(`temp fixture left behind at ${fixture.base}: ${error.message}`);
  }
}

/** Git Bash reads `C:\Users\...` as one literal name, so hand it slashes. */
function toPosix(p) {
  return process.platform === 'win32' ? p.replace(/\\/g, '/') : p;
}

function run(shell, fixture, args) {
  const result = spawnSync(shell, [SCRIPT, '--project', toPosix(fixture.project), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GRADLE_USER_HOME: fixture.gradleHome, ANDROID_ARCHS: '' },
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const summary = /SUMMARY targets=(\d+) size_kb=(\d+) deleted=(\d+) skipped_links=(\d+) mode=(\w+) heals=(\d+) durable=(\d+) dropped=(\d+)/.exec(stdout + stderr);
  if (result.status === null && result.signal) {
    problems.push(`clean-abi.sh was killed by ${result.signal} running with ${args.join(' ')}`);
  }
  return {
    status: result.status,
    stdout,
    stderr,
    targets: summary ? Number(summary[1]) : -1,
    sizeKb: summary ? Number(summary[2]) : -1,
    deleted: summary ? Number(summary[3]) : -1,
    skipped: summary ? Number(summary[4]) : -1,
    mode: summary ? summary[5] : '',
    heals: summary ? Number(summary[6]) : -1,
    durable: summary ? Number(summary[7]) : -1,
    dropped: summary ? Number(summary[8]) : -1,
    listed: (stdout.match(/ +target +\S+ +\d+ KB +.*$/gm) || []).map((line) => line.split(/ +/).pop()),
  };
}

const existsAll = (fixture, subset) => subset.every((file) => fs.existsSync(file));
const missingAll = (fixture, subset) => subset.every((file) => !fs.existsSync(file));

const shell = bash();
if (!shell) {
  console.error('[FAIL] no bash on PATH — scripts/clean-abi.sh is a bash tool, so this gate cannot grade it. Set BASH=/path/to/bash.');
  process.exit(1);
}

/* ---- 1. a report run deletes nothing and lists only what is safe -------- */
{
  const fixture = makeFixture('report');
  const result = run(shell, fixture, []);
  const arm = fixture.files.filter((f) => f.split(path.sep).includes(ARM) && !f.includes(`${path.sep}src${path.sep}`));
  const src = path.join(fixture.moduleAndroid, 'src', 'main', 'jniLibs', ARM, 'libshipped.so');
  // three per-ABI pinned folders: two .cxx object trees plus the x86_64 sibling
  // that shares a task output with a cleared ABI (case 6 proves it survives).
  // The fourth file lives under an x86_64 component too, but deep inside that
  // one ABI's tree, where it is not a pinned ABI folder (case 7 covers it).
  const pinned = fixture.files.filter((f) => f.split(path.sep).includes(X64));
  const pinnedFolders = pinned.filter((f) => !f.split(path.sep).includes('arch'));
  const listedSrc = result.listed.filter((p) => p.split('/').includes('src'));
  check(
    'report mode finds every arm64-v8a artifact and nothing else',
    result.status === 0 && result.mode === 'report' && result.deleted === 0 &&
      result.targets === arm.length &&
      listedSrc.length === 0 && !result.listed.some((p) => p.includes(X64)),
    `status=${result.status} mode=${result.mode} targets=${result.targets} expected=${arm.length} deleted=${result.deleted}`
  );
  check('report mode deletes nothing at all', existsAll(fixture, fixture.files), 'a fixture file vanished during a report run');
  check('the pinned ABI is not queued for deletion', !result.listed.some((p) => p.includes(X64)) && pinnedFolders.length === 3, `listed ${result.listed.length} folder(s)`);
  check('shipped jniLibs code is never a target', listedSrc.length === 0 && fs.existsSync(src));
  check('the active pin is read from gradle.properties', result.stdout.includes(`active pin : ${X64}`) && result.stdout.includes('reactNativeArchitectures'), 'the run did not say where the pin came from');
  cleanup(fixture);
}

/* ---- 2. --delete clears exactly the non-pinned artifacts ---------------- */
{
  const fixture = makeFixture('delete');
  const arm = fixture.files.filter((f) => f.split(path.sep).includes(ARM) && !f.split(path.sep).includes('src'));
  const survivors = fixture.files.filter((f) => !arm.includes(f));
  const result = run(shell, fixture, ['--delete']);
  check(
    '--delete removes every artifact it listed',
    result.status === 0 && result.mode === 'delete' && result.deleted === arm.length && !result.stdout.includes('could not delete'),
    `status=${result.status} deleted=${result.deleted}/${arm.length}`
  );
  check('the listed arm64-v8a folders are gone', missingAll(fixture, arm), 'a listed folder survived the delete run');
  check(
    '--delete leaves the pinned ABI, the APK and jniLibs alone',
    existsAll(fixture, survivors),
    survivors.filter((f) => !fs.existsSync(f)).join(', ')
  );
  const emptyTools = path.join(fixture.moduleAndroid, '.cxx', 'tools', 'debug');
  check('an emptied .cxx configuration folder is pruned', !fs.existsSync(emptyTools) || fs.readdirSync(emptyTools).length > 0, `${emptyTools} left behind empty`);
  cleanup(fixture);
}

/* ---- 3. the pinned ABI is refused, and --force is the only override ----- */
{
  const fixture = makeFixture('refuse');
  const result = run(shell, fixture, ['--abi', X64, '--delete']);
  check(
    'clearing the pinned ABI without --force exits before deleting anything',
    result.status === 2 && result.mode === 'refused' && result.deleted === 0 && existsAll(fixture, fixture.files),
    `status=${result.status} mode=${result.mode} deleted=${result.deleted}`
  );
  check('the refusal says what to do instead', /--force/.test(result.stdout + result.stderr), 'no --force hint in the output');
  cleanup(fixture);
}
{
  const fixture = makeFixture('force');
  const pinned = fixture.files.filter((f) => f.split(path.sep).includes(X64));
  const pinnedFolders = pinned.filter((f) => !f.split(path.sep).includes('arch'));
  const deepObj = pinned.find((f) => f.split(path.sep).includes('arch'));
  const src = path.join(fixture.moduleAndroid, 'src', 'main', 'jniLibs', ARM, 'libshipped.so');
  const result = run(shell, fixture, ['--abi', X64, '--force', '--delete']);
  check(
    '--force clears the pinned ABI when told to',
    result.status === 0 && result.deleted === pinnedFolders.length &&
      pinnedFolders.every((f) => !fs.existsSync(f)) && !fs.existsSync(deepObj),
    `status=${result.status} deleted=${result.deleted} expected=${pinnedFolders.length}`
  );
  // dropped stays 0 here: the arch/x86 folder is only a candidate when x86 is
  // asked for (case 7). One of the three is a task output, two are .cxx trees.
  check(
    '--force targets only the three pinned per-ABI folders, split by durability',
    result.targets === pinnedFolders.length && result.dropped === 0 &&
      result.heals === 1 && result.durable === 2,
    `targets=${result.targets} dropped=${result.dropped} heals=${result.heals} durable=${result.durable}`
  );
  check('--force still spares src/', fs.existsSync(src), 'a jniLibs file was deleted');
  cleanup(fixture);
}

/* ---- 4. nothing is followed out through a link -------------------------- */
{
  const fixture = makeFixture('escape');
  const outside = path.join(path.dirname(fixture.base), `abi-clean-outside-${path.basename(fixture.base)}`);
  const victim = path.join(outside, 'do-not-touch.o');
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(victim, 'not this project\n');
  const link = path.join(fixture.moduleAndroid, '.cxx', 'Debug', 'hashL', ARM);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  try {
    fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    check('a link out of the module can be created for the escape test', false, error.message);
  }
  if (fs.existsSync(link)) {
    const result = run(shell, fixture, ['--delete']);
    check(
      'a target resolving outside its root is skipped, not deleted',
      result.skipped >= 1 && fs.existsSync(victim) && fs.existsSync(outside),
      `skipped=${result.skipped} victim exists=${fs.existsSync(victim)}`
    );
    check('the skip is reported to the operator', /skip /.test(result.stdout), 'no skip line printed');
    fs.rmSync(outside, { recursive: true, force: true });
  }
  cleanup(fixture);
}

/* ---- 5. idempotent, and bad input refused before any damage ------------- */
{
  const fixture = makeFixture('twice');
  const first = run(shell, fixture, ['--delete']);
  const second = run(shell, fixture, ['--delete']);
  const armFiles = fixture.files.filter((f) => !f.split(path.sep).includes('src') && !f.split(path.sep).includes(X64));
  check('a second run finds nothing to clear', second.status === 0 && second.targets === 0 && second.deleted === 0, `targets=${second.targets} deleted=${second.deleted} (first run deleted ${first.deleted} of ${armFiles.length})`);
  check('the second run leaves the survivors alone', existsAll(fixture, fixture.files.filter((f) => !armFiles.includes(f))), 'files disappeared on a run that found nothing');
  cleanup(fixture);
}
{
  const fixture = makeFixture('badargs');
  const unknownAbi = run(shell, fixture, ['--abi', 'mips', '--delete']);
  const unknownFlag = run(shell, fixture, ['--wat', '--delete']);
  const badProject = run(shell, fixture, ['--project', toPosix(path.join(fixture.base, 'nowhere')), '--delete']);
  check(
    'unsupported ABI, unknown option and a missing project are all refused',
    unknownAbi.status === 2 && unknownFlag.status === 2 && badProject.status === 2 && existsAll(fixture, fixture.files),
    `abi=${unknownAbi.status} flag=${unknownFlag.status} project=${badProject.status}`
  );
  cleanup(fixture);
}

/* ---- 6/7. a partial delete is labelled, not widened --------------------- */
// A minimal tree of one shape, kept separate from makeFixture so the counts here
// mean exactly what they say. Measured against a real assembleDebug: clearing an
// ABI folder out of a shared task output makes the owning task re-run and write
// the same bytes back, so the target is labelled `heals` rather than the scope
// being widened to the whole task directory — widening would also delete the
// pinned ABI sitting beside it, which is the one folder the pin protects.
function makeSharedTaskFixture(label) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), `abi-clean-${label}-`));
  const project = path.join(base, 'project');
  const gradleHome = path.join(base, 'gradle-home');
  const moduleAndroid = path.join(project, 'node_modules', 'demo', 'android');
  const lib = path.join(moduleAndroid, 'build', 'intermediates', 'merged_native_libs', 'debug', 'out', 'lib');
  const arch = path.join(moduleAndroid, '.cxx', 'Debug', 'hashA', X64, 'rnllama', 'CMakeFiles', 'rnllama.dir', 'vendor', 'arch');

  const files = [
    path.join(lib, ARM, 'libdemo.so'),
    path.join(lib, X64, 'libdemo64.so'),
    path.join(lib, 'x86', 'libdemo32.so'),
    // a CMake object directory named like the x86 ABI, inside the *pinned* ABI's
    // own tree: exactly the llama.rn shape the any-depth search used to hit
    path.join(arch, 'x86', 'arch_x86.o'),
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'fixture\n');
  }
  fs.mkdirSync(gradleHome, { recursive: true });
  fs.writeFileSync(path.join(gradleHome, 'gradle.properties'), `reactNativeArchitectures=${X64}\n`);

  return { base, project, gradleHome, moduleAndroid, files };
}
{
  const fixture = makeSharedTaskFixture('partial');
  const armDir = path.dirname(fixture.files[0]);
  const pinnedDir = path.dirname(fixture.files[1]);
  const result = run(shell, fixture, ['--abi', ARM, '--delete']);
  check(
    'clearing one ABI out of a shared task output removes only that ABI',
    result.status === 0 && !fs.existsSync(armDir) &&
      fs.existsSync(path.join(pinnedDir, 'libdemo64.so')) && fs.existsSync(path.dirname(fixture.files[2])),
    `arm gone=${!fs.existsSync(armDir)} pinned object=${fs.existsSync(path.join(pinnedDir, 'libdemo64.so'))} x86 sibling=${fs.existsSync(path.dirname(fixture.files[2]))}`
  );
  check(
    'the task-output target is counted as self-healing, not as durable space',
    result.targets === 1 && result.deleted === 1 && result.heals === 1 && result.durable === 0 && result.dropped === 0,
    `targets=${result.targets} deleted=${result.deleted} heals=${result.heals} durable=${result.durable} dropped=${result.dropped}`
  );
  check(
    'the self-heal is explained to the operator',
    /next build/.test(result.stdout) && /\.cxx/.test(result.stdout),
    'no note line telling the operator the owning task writes the files back'
  );
  cleanup(fixture);
}

/* ---- 7. an ABI-shaped folder that is not an ABI artifact ---------------- */
{
  const fixture = makeSharedTaskFixture('deepname');
  const deepX86 = path.dirname(fixture.files[3]);
  const result = run(shell, fixture, ['--abi', 'x86', '--delete']);
  check(
    'a folder named x86 inside one ABI object tree is dropped, never deleted',
    result.status === 0 && result.targets === 1 && result.dropped === 1 && result.deleted === 1 &&
      fs.existsSync(path.join(deepX86, 'arch_x86.o')),
    `status=${result.status} targets=${result.targets} dropped=${result.dropped} deleted=${result.deleted} object still there=${fs.existsSync(path.join(deepX86, 'arch_x86.o'))}`
  );
  check(
    'only the real per-ABI folder was taken from that tree',
    !fs.existsSync(path.dirname(fixture.files[2])) && fs.existsSync(deepX86) &&
      fs.existsSync(path.join(path.dirname(fixture.files[1]), 'libdemo64.so')),
    `real x86 gone=${!fs.existsSync(path.dirname(fixture.files[2]))} arch/x86 kept=${fs.existsSync(deepX86)} pinned kept=${fs.existsSync(path.join(path.dirname(fixture.files[1]), 'libdemo64.so'))}`
  );
  check(
    'the drop is reported, with the parent that disqualified it',
    / +drop +.*arch\/x86/.test(result.stdout) && /not an ABI artifact/.test(result.stdout),
    'no drop line naming arch as the disqualified parent'
  );
  cleanup(fixture);
}

/* ---- 8. the real tree, read-only, on request ---------------------------- */
if (process.argv.includes('--real')) {
  const result = spawnSync(shell, [SCRIPT], { cwd: ROOT, encoding: 'utf8', env: process.env });
  const stdout = String(result.stdout || '');
  const summary = /SUMMARY targets=(\d+) size_kb=(\d+) deleted=(\d+) skipped_links=(\d+) mode=(\w+) heals=(\d+) durable=(\d+) dropped=(\d+)/.exec(stdout);
  check(
    'a report run against this repository deletes nothing',
    result.status === 0 && (!summary || (summary[3] === '0' && summary[5] === 'report')),
    `status=${result.status} summary=${summary ? summary[0] : 'none'}`
  );
  if (summary) {
    notes.push(
      `this machine holds ${summary[1]} non-pinned ABI folder(s), ${(Number(summary[2]) / 1024).toFixed(0)} MB, of which ${summary[6]} are task outputs the next build writes back — \`npm run android:clean-abi -- --delete\` clears them`
    );
  }
}

for (const note of notes) console.log(`     · ${note}`);
if (problems.length) {
  console.log('');
  console.log(`[FAIL] abi-clean: ${problems.length} problem(s) with scripts/clean-abi.sh`);
  for (const problem of problems) console.log(`     · ${problem}`);
  process.exit(1);
}
console.log('');
console.log('[ok] scripts/clean-abi.sh clears only what it should.');
