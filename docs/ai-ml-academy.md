# AI & ML Academy — course pack

Three seeded courses built from the AI/ML blueprint, wired into the same path,
quiz engine, SRS and guidebook as every other course.

| Course id | Name | Ages | Units | Modules | Banks |
|---|---|---|---|---|---|
| `aiml-explorer` | Course 7 · AI & ML Academy · Explorer | 10–18 | 4 | 20 | 80 |
| `aiml-launcher` | Course 8 · AI & ML Academy · Launcher | 19–25 | 4 | 20 | 80 |
| `aiml-leader` | Course 9 · AI & ML Academy · Leader | 26–40 | 4 | 20 | 80 |

Every tier covers the blueprint's 20 modules × 10 submodules. That is **600
submodule notes**, 240 lesson banks and **840 questions** (14 per module: 3
notes, 3 workshop, 3 lab, 5 quiz), all authored in this repository — nothing is
fetched at runtime.

## Shape of a module

Each module compiles to four sequential path blocks:

```
notes → workshop → lab → quiz
```

| Block | Bank id | What the learner does |
|---|---|---|
| Notes | `<module>-notes` | Reads ten submodule notes in syllabus order, answers two questions, then pairs five terms. The module project is stated on the same screen. |
| Workshop | `<module>-workshop` | Builds three ordering decisions token by token (e.g. *collect → fit → evaluate*). |
| Lab | `<module>-lab` | Writes a real JavaScript function; three assertions grade it in the sandbox. Includes two concept questions. |
| Quiz | `<module>-quiz` | Four resurfaced items plus one typed production task — the blueprint's spaced-repetition requirement, done deliberately. |

The quiz re-asks the module's own core items on purpose: retrieval now, not
rereading. Each tier's four units are five modules each, so a unit is 20 blocks.

## Where the content lives

```
lib/tracks/ai-ml/
  build.ts        module record → four banks (the only compiler)
  explorer-a/b/c  20 Explorer modules
  launcher-a/b    20 Launcher modules
  leader-a/b      20 Leader modules
  index.ts        tier registry + course metadata
lib/aiMlUnits.ts  blueprint tiers → CurriculumUnit[] (4 units per tier)
```

`lib/courses.ts` spreads `AI_ML_COURSES`; `lib/curriculum.ts` pushes
`AI_ML_UNITS` and lists the three course cards. `lib/spaceAllocation.ts` places
each tier first in its own learning space.

## Adding or editing a module

Edit the module record only. A record needs:

- `notes` — exactly 10 strings (build fails otherwise);
- `terms` — 4–6 pairs;
- `quiz` — 4 items with `q`, `a`, `options`, `why`;
- `workshop.steps` — 3+ token builds whose `chain` tokens exist in `bank`;
- `lab` — `intro`, `prompt`, `starter`, `solution`, `tests` (2+);
- `text` — prompt, accepted answers, explanation.

The compiler asserts these invariants at import time, and the curriculum gate
re-checks the compiled banks, so a malformed module fails the bundle rather
than a learner's session.

## Verification

Covered automatically by the existing gates — no new gate needed:

```bash
node scripts/check-curriculum-quality.cjs   # notes length, question mix, blocks resolve
node scripts/check-exercise-solutions.cjs   # every lab solution passes, every starter fails
node scripts/check-adaptive-ai.cjs          # space allocation for every course id
node scripts/check-quality-ops.cjs          # gate and course registration
npx tsc --noEmit && npx expo lint
```

## Labs are real algorithms

The labs are not quizzes in disguise. Examples: least-squares slope, Gini
impurity, k-NN nearest centroid, ReLU neuron, sigmoid, softmax, convolution,
tokenisation, moving average, Q-learning update, min-max scaling, quantisation,
Gini/Jaccard similarity, cosine similarity, MAPE, NDCG-style top-k, z-scores,
matrix multiply, F1, NPV, OEE, break-even, shard, two-sum, log parsing.

## 3D visuals: not shipped

The blueprint asks for 3D environments and avatars. This app has no WebGL/3D
runtime (`three`, `expo-gl` or `@react-three/*` are not dependencies), and
adding one for a course pack would be a large, unrequested platform change that
also breaks the existing web/Expo build budget. The course therefore ships
text + diagrams-in-words + runnable labs, and states that limitation rather
than faking a 3D scene with flat images.
