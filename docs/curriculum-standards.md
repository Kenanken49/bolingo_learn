# Curriculum standards

Bolingo Learn paths are no longer measured by “I clicked through the node.” Every
quiz-shaped session now has a written standard for scaffolding, attempt policy,
and mastery. The rules live in
[`lib/learningStandards.ts`](../lib/learningStandards.ts) and are enforced by
[`scripts/check-curriculum-quality.cjs`](../scripts/check-curriculum-quality.cjs).

## The four practice modes

| Block | Mode | Live checklist | What counts | Order |
| --- | --- | --- | --- | --- |
| Lesson | Guided | Yes | Corrected final answer | Teaching order |
| Workshop | Guided build | Yes | Corrected final answer | Step order |
| Lab | Independent | No | First attempt | Shuffled |
| Quiz / checkpoint / final | Mastery check | No | First attempt | Shuffled |
| Daily review | Retrieval | No | First attempt | Shuffled |
| Capstone project | Build | No | Every user story passes | Project stories |

The mastery mark is **80%**. A failed mastery check does **not** unlock the next
path node and awards **0 XP**; the results screen keeps a “Review & retry”
button. Guided lessons and workshops let learners retry until the corrected
answer is solid, but a retry never changes the first-attempt record used by
labs, reviews, and exams.

Diamonds stay live around the quiz player: wrong answers are always free, a
failed lesson costs one diamond, and the next lesson waits at zero behind the
refill sheet (rewarded video, 4-hour regen, Premium — see [admob.md](admob.md)).
Running tests and typing answers stay free, and a spent diamond never changes
the mastery record: first attempts are still what labs, reviews and exams count.

## Why first-try mastery

Previously, a learner could miss every item, tap “Continue,” retry until green,
and finish with a 100% result because every correct retry counted. That made
the path unlock meaningless. Now:

- `first` is recorded once per item and never overwritten.
- `final` records the last practice response.
- Guided sessions count `final`; assessed sessions count `first`.
- SRS and the Kiki learner model receive only the first response.
- Results show the counted score, plus first-try accuracy when it differs.

This is deliberately stricter than completion-based edtech. It also makes the
feedback honest: a retry says “Correct on retry” and explains that mastery is
already recorded.

## Content rules enforced by `npm run check:curriculum`

Every lesson in `lib/courses.ts` (including language, certification, and Linux
banks) and every published transcript lesson must satisfy:

- at least 3 questions; quizzes/checkpoints/finals need at least 5;
- theory of at least 40 characters — a lesson must teach before it tests;
- a non-empty explanation on every question;
- no duplicate prompts in the same lesson;
- a solvable `correctChain` against its token bank;
- no duplicate options for single-answer questions;
- code tasks with a starter, at least one test, unique test ids, and runnable
  assertions;
- text tasks with accepted answers whose first entry matches `correctChain[0]`;
- unique normalized accepted answers.

At the path level:

- every block has a positive XP value, minute estimate, title, and lesson title;
- every lesson/lab/workshop/quiz block resolves to real content;
- block ids are unique;
- every course card has at least one curriculum unit;
- HTML, RWD, Design, and the certification tracks have a capstone project;
- every language final has at least 6 questions and at least one typed
  production task;
- Complete HTML has both `html-final` and the `html-project` capstone on-path.

## Authoring a new exercise

Use the helpers in [`lib/quizBank.ts`](../lib/quizBank.ts):

```ts
MCQ(prompt, answer, [answer, ...distractors], explain);
BUILD(prompt, correctChain, tokenBank, explain);
CODE(prompt, { language: 'js', starter, tests }, referenceSolution, explain);
TEXT(prompt, acceptedAnswers, explain, { misconceptions });
```

`TEXT` should accept the natural variants a learner may produce. Put the
canonical form first. `CODE` runs in the JS sandbox on web and in a dev build;
Expo Go falls back to a reference-solution comparison and says so.

A language final should include an applied scenario and a typed production item,
not only recognition. A code checkpoint should include at least one executable
or free-response task alongside its token questions.

## Current coverage

The guard currently reports:

- 704 lessons and 3,500 questions;
- 730 path blocks;
- 144 workshops, 96 labs, and 103 quizzes/checkpoints/finals;
- 2,714 token questions, 83 runnable code exercises, 337 matching, 95 listening, 96 speaking, 164 typed production exercises, and 11 exercises graded by the offline Git VM.

Run the gate alone with:

```bash
npm run check:curriculum
npm run check:courses
```

It runs inside `npm test`. Adding a new lesson without an explanation, adding an
unsolvable token, thinning the theory, or dropping a capstone fails the suite.

### Course floors — `npm run check:courses`

`check:courses` (the `course-score` gate) walks the path of each course and checks
seven floors. The release bar is that every course clears every one:

| floor | requirement |
| --- | --- |
| `teach` | 2+ theory lines and 25+ words in every lesson |
| `produce` | a production item in every lesson — an assembled token chain of 2+, or a kind in `PRODUCTION_KINDS` ([`lib/quizBank.ts`](../lib/quizBank.ts)) |
| `runs` | every build block executes something on the device, or its title **and** blurb say plainly that it is a paper exercise |
| `explain` | 20+ characters of explanation on every question |
| `units` | a build block (workshop, lab, or project) and a graded quiz block in every unit |
| `session` | every graded quiz fills a session (6 items) with at least 2 production items |
| `finisher` | the last unit's last block closes the course: project, final, checkpoint, or capstone |

A graded block means a block with `kind: 'quiz'`, and the finisher has to be
*positionally* last: naming a lab `…-checkpoint` no longer counts as assessing or
finishing a course. A block that points at missing content fails outright.

`produce` asks whether a lesson makes the learner build something; `runs` asks
whether a build block actually executes, and it is the stricter question. A block
runs when the app grades real state — the offline Git VM, a `code` question whose
test carries a `run`, a `speak` question scored by on-device recognition, or a
capstone story with a live `check` in the preview frame. Assembled tokens, `match`,
`text` and `listen` are graded against strings, so a workshop whose tokens happen
to spell `git status` has not run git: it either gains an item that executes or
says in its own words that the work is on paper (see
[`docs/hands-on-labs.md`](hands-on-labs.md)).

That test lives in `lib/execution.ts` because the learner has to be able to read
it too: the same function drives the **NO EXECUTION** badge on the path card and
on the lesson and project headers, so a block this floor counts is a block the
app labels out loud rather than a number in a file.

Nothing is exempt from it: no ledger of deferred blocks and no per-course cap.
The blocks the ledger used to forgive either run in an engine now or say plainly,
in both title and blurb, that they are a paper exercise. The floor measures all
278 build blocks across the 13 courses, so a block that runs nothing without
saying so fails the day it is written, and `--why <course>` prints a line per
shortfall naming the block and quoting its title and blurb. Copy that promises a
run the block does not have is caught by `scripts/check-curriculum-quality.cjs`.

There is no weighted score any more. The gate always required every dimension to
be complete, so 30/25/20/25 arithmetic only dressed up a pass/fail verdict; the
table prints `met/total` per floor.

What the floors still cannot see, so it is reviewed by hand instead: a question
repeated from an earlier lesson counts as new material (the AI/ML tier finals are
assembled that way, deliberately, as retrieval practice), `match` and `listen`
count as production although pairing and hearing are closer to recognition, a
`speak` item scores recognised audio rather than a produced meaning, and 20
characters of explanation is a floor, not a quality bar.
