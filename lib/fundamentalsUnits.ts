/**
 * Developer-fundamentals courses: Git, Testing and Debugging, TypeScript, and
 * Applied Cryptography. Authored lesson banks live in lib/tracks/; this module
 * only wires them into the path, following the same unit shape as the rest of
 * the catalog — theory lessons, a workshop, a checkpoint quiz, and a final exam
 * that closes each course.
 */

import type { BlockKind, CurriculumBlock, CurriculumUnit } from './curriculum';

type BlockSeed = [id: string, kind: BlockKind, title: string, blurb: string, lessonId: string, minutes: number, xp: number];

function block([id, kind, title, blurb, lessonId, minutes, xp]: BlockSeed): CurriculumBlock {
  return { id, kind, title, blurb, minutes, xp, lessonId, lessonTitle: title };
}

function unit(
  id: string,
  course: string,
  section: string,
  title: string,
  goal: string,
  color: string,
  icon: string,
  seeds: BlockSeed[]
): CurriculumUnit {
  return { id, course, section, title, goal, color, icon, blocks: seeds.map(block) };
}

export const FUNDAMENTALS_UNITS: CurriculumUnit[] = [
  /* ---------------- Course 10 · Git and Version Control ---------------- */
  unit(
    'git-model',
    'git',
    'Section 1 · Git',
    'How Git stores your project',
    'Snapshots, the index, branches, and a clean commit',
    'bg-rose-500',
    '\u{1F500}',
    [
      ['git-l-repos', 'lesson', 'Snapshots, the index, and HEAD', 'Theory first: what a commit really stores and where your files sit.', 'git-repositories', 4, 10],
      ['git-l-branches', 'lesson', 'Branches, merges, and conflicts', 'Branches are pointers, merges are three-way, conflicts are text.', 'git-branching', 4, 10],
      ['git-lab-branch', 'lab', 'Lab: branch, publish, and prove it', 'Runs in the offline Git VM: create feature-1, push it with its upstream, and have the repository confirm all three.', 'git-lab-branch', 7, 25],
      ['git-w-commit', 'workshop', 'Workshop: a clean commit, staged in the VM', 'Runs in the offline Git VM: stage six real files by name and glob, unstage the accident, then write and amend the subject on a real commit.', 'git-workshop-history', 7, 20],
      ['git-q-1', 'quiz', 'Checkpoint: how Git works', 'Mastery check on the model before you touch a remote.', 'git-quiz-1', 3, 30],
    ]
  ),
  unit(
    'git-team',
    'git',
    'Section 1 · Git',
    'Working with others and with trouble',
    'Remotes, pull requests, and recovery without losing work',
    'bg-rose-500',
    '\u{1F500}',
    [
      ['git-l-remotes', 'lesson', 'Remotes, fetch, pull, and push', 'Remote-tracking refs, why fetch is the safe half, and tags.', 'git-remotes', 4, 10],
      ['git-l-recovery', 'lesson', 'Undoing things without losing work', 'Revert versus rewrite, reset scopes, reflog, and bisect.', 'git-recovery', 5, 10],
      ['git-lab-stash', 'lab', 'Lab: park unfinished work and bring it back', 'Runs in the offline Git VM: stash a named change, switch branches, and prove the content comes back.', 'git-lab-stash', 7, 25],
      ['git-lab-undo', 'lab', 'Lab: undo a commit other people can see', 'Runs in the offline Git VM: revert the newest commit and leave the tree clean, graded from git log and the files.', 'git-lab-undo', 7, 25],
      ['git-w-recovery', 'workshop', 'Workshop: putting a mess right in the VM', 'Runs in the offline Git VM: untrack a committed file, rewrite and force-publish its subject, and undo two mistakes without rewriting history.', 'git-workshop-recovery', 7, 20],
      ['git-q-2', 'quiz', 'Checkpoint: remotes and recovery', 'Mastery check on the collaborative half of the course.', 'git-quiz-2', 3, 30],
      ['git-q-final', 'quiz', 'Git final exam', 'The closing exam: every item restates the two units.', 'git-final', 8, 80],
    ]
  ),

  /* ---------------- Course 11 · Testing and Debugging ---------------- */
  unit(
    'test-basis',
    'testing',
    'Section 1 · Testing',
    'Tests that carry weight',
    'What a test proves, which layer proves it, and red-green-refactor',
    'bg-teal-500',
    '\u{1F41E}',
    [
      ['test-l-value', 'lesson', 'What a test actually proves', 'Arrange-Act-Assert, why flaky tests hurt, and what coverage misses.', 'test-what-tests-do', 4, 10],
      ['test-l-pyramid', 'lesson', 'Unit, integration, end-to-end', 'Match the layer to the risk, from pure logic to a real device.', 'test-pyramid', 4, 10],
      ['test-lab-boundary', 'lab', 'Lab: the boundary that breaks it', 'Runs in the JavaScript sandbox: five edge assertions on pageCount, red until you fix the implementation.', 'test-lab-boundary', 7, 25],
      ['test-w-first', 'workshop', 'Paper workshop: write the failing test first', 'Paper exercise, nothing runs here: predict the failure, then assemble the test that names it.', 'test-workshop-first', 5, 20],
      ['test-q-1', 'quiz', 'Checkpoint: tests that carry weight', 'Mastery check on value, layer, and assertion strength.', 'test-quiz-1', 3, 30],
    ]
  ),
  unit(
    'test-doubles',
    'testing',
    'Section 1 · Testing',
    'Doubles, and finding the real cause',
    'What to fake, what never to mock, and how to locate a cause',
    'bg-teal-500',
    '\u{1F41E}',
    [
      ['test-l-doubles', 'lesson', 'Mocks, stubs, and what not to fake', 'Stub, spy, mock, fake, fixture — and the cost of each.', 'test-doubles', 4, 10],
      ['test-l-debug', 'lesson', 'Finding the real cause', 'Reproduce, reduce, bisect, and read a stack trace in the right order.', 'test-debugging', 5, 10],
      ['test-lab-regression', 'lab', 'Lab: pin the bug with a failing test', 'Runs in the JavaScript sandbox: make parsePrice pass a five-case regression suite.', 'test-lab-regression', 7, 25],
      ['test-w-debug', 'workshop', 'Paper workshop: from report to regression test', 'Paper exercise, nothing runs here: reduce a bug report to the test case that pins it.', 'test-workshop-debug', 6, 20],
      ['test-q-2', 'quiz', 'Checkpoint: doubles and diagnosis', 'Mastery check on fakes and on search technique.', 'test-quiz-2', 3, 30],
      ['test-q-final', 'quiz', 'Testing and debugging final', 'The closing exam across both units and both workshops.', 'test-final', 8, 80],
    ]
  ),

  /* ---------------- Course 12 · TypeScript and Type Systems ---------------- */
  unit(
    'ts-shapes',
    'typescript',
    'Section 1 · TypeScript',
    'Types describe shapes',
    'Annotation, structural typing, unions, and honest narrowing',
    'bg-indigo-500',
    '\u{1F537}',
    [
      ['ts-l-annotations', 'lesson', 'Annotations, inference, and structure', 'Where types pay, what erasure means, and how shapes are matched.', 'ts-annotations', 4, 10],
      ['ts-l-narrowing', 'lesson', 'Unions, unknown, and narrowing', 'Check instead of assert, and why ?? is not ||.', 'ts-narrowing', 5, 10],
      ['ts-w-shapes', 'workshop', 'Paper workshop: type a real module', 'Paper exercise, nothing compiles here: annotate a session store and predict its three compiler errors.', 'ts-workshop-shapes', 6, 20],
      ['ts-q-1', 'quiz', 'Checkpoint: shapes and narrowing', 'Mastery check on boundaries and checks.', 'ts-quiz-1', 3, 30],
    ]
  ),
  unit(
    'ts-reuse',
    'typescript',
    'Section 1 · TypeScript',
    'Reuse, configuration, and migration',
    'Generics, utility types, and what your tsconfig actually enforces',
    'bg-indigo-500',
    '\u{1F537}',
    [
      ['ts-l-generics', 'lesson', 'Generics and utility types', 'Type parameters with constraints, and derived shapes.', 'ts-generics', 5, 10],
      ['ts-l-config', 'lesson', 'Strict mode, configuration, migration', 'The flags that decide what is checked, and gradual adoption.', 'ts-strict-config', 4, 10],
      ['ts-w-migrate', 'workshop', 'Paper workshop: convert one file honestly', 'Paper exercise, nothing compiles here: plan the renames and annotations, and keep the findings.', 'ts-workshop-migrate', 6, 20],
      ['ts-q-2', 'quiz', 'Checkpoint: reuse and enforcement', 'Mastery check on generics and compiler options.', 'ts-quiz-2', 3, 30],
      ['ts-q-final', 'quiz', 'TypeScript final exam', 'The closing exam across both units of the course.', 'ts-final', 8, 80],
    ]
  ),

  /* ---------------- Course 13 · Applied Cryptography ---------------- */
  unit(
    'crypto-primitives',
    'crypto',
    'Section 1 · Cryptography',
    'Pick the primitive',
    'Cipher choice, key custody, and the difference between a hash, a MAC and a signature',
    'bg-slate-600',
    '\u{1F510}',
    [
      ['crypto-l-symmetric', 'lesson', 'Secrets at rest: cipher choice and key custody', 'Authenticated modes, nonces, and who really holds the key.', 'crypto-symmetric', 5, 10],
      ['crypto-l-hashing', 'lesson', 'Hashing, MACs, and signatures', 'Three jobs, three tools — and picking by who must verify.', 'crypto-hashing', 5, 10],
      ['crypto-w-keys', 'workshop', 'Paper workshop: design the protection for four columns', 'Paper exercise, nothing runs here: write the requirements first, then pick the primitives.', 'crypto-workshop-keys', 7, 20],
      ['crypto-q-1', 'quiz', 'Checkpoint: cipher choice and key custody', 'Mastery check on modes, nonces, and key locations.', 'crypto-quiz-1', 3, 30],
    ]
  ),
  unit(
    'crypto-trust',
    'crypto',
    'Section 1 · Cryptography',
    'Passwords, TLS, and trust',
    'Slow hashes and salts, certificates, and auditing a real login endpoint',
    'bg-slate-600',
    '\u{1F510}',
    [
      ['crypto-l-passwords', 'lesson', 'Password storage, salts, and slow hashes', 'Salt, pepper, cost parameters, and the migration path off MD5.', 'crypto-passwords', 5, 10],
      ['crypto-l-tls', 'lesson', 'TLS, certificates, and trusting a key', 'What a certificate binds, and what HTTPS does not promise.', 'crypto-tls', 5, 10],
      ['crypto-w-audit', 'workshop', 'Paper workshop: audit a login endpoint', 'Paper exercise, nothing runs here: read the endpoint and record findings on transport, comparison and limits.', 'crypto-workshop-audit', 7, 20],
      ['crypto-q-2', 'quiz', 'Checkpoint: passwords and trust', 'Mastery check on storage, TLS, and signed values.', 'crypto-quiz-2', 3, 30],
      ['crypto-q-final', 'quiz', 'Cryptography final exam', 'The closing decision test across all four lessons.', 'crypto-final', 8, 80],
    ]
  ),
];
