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

- 420 lessons and 2,269 questions;
- 446 path blocks;
- 77 workshops, 31 labs, and 28 quizzes/checkpoints/finals;
- 20 runnable code exercises, 95 listening, 95 speaking, and 49 typed production exercises.

Run the gate alone with:

```bash
npm run check:curriculum
```

It runs inside `npm test`. Adding a new lesson without an explanation, adding an
unsolvable token, thinning the theory, or dropping a capstone fails the suite.
