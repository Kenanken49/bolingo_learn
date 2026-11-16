# Runnable labs: offline VM, sandbox editors and guided fallback

Every lab in the library runs, or says plainly that it cannot. A learner never
sees a fake terminal, a quiz dressed up as an exercise, or a silent "not
supported yet".

Three engines cover the library, chosen per lesson at load time in
[src/app/quiz/[lessonId].tsx](../src/app/quiz/%5BlessonId%5D.tsx):

| Stage | Kind | Engine | What the learner does |
| --- | --- | --- | --- |
| Offline VM | `terminal` | [lib/vm/](../lib/vm/) + [components/TerminalPlayer.tsx](../components/TerminalPlayer.tsx) | Types real `git`/shell commands against an in-memory repository on the device. |
| Sandbox editor | `code` | [lib/codeSandbox.ts](../lib/codeSandbox.ts) + [components/CodeExercise.tsx](../components/CodeExercise.tsx) | Writes JavaScript, CSS or HTML in an editor and runs the lab's own assertions. |
| Guided walkthrough | `guided` | [lib/labex/guided/](../lib/labex/guided/) + [components/GuidedLabPlayer.tsx](../components/GuidedLabPlayer.tsx) | Reads the real steps, commands and reference files in a read-only terminal, labelled **GUIDED — NO EXECUTION**. |

A lesson that already runs here never also gets the walkthrough: `runsHere` is
true when the lesson has a Git scenario or at least one `code` question, and the
guided stage is only appended when nothing executes. Within a session the
interactive stage is always last — recall questions shuffle, hands-on stages keep
their place — so a session never ends on a soft note.

## Offline VM (Git labs)

`lib/vm/fs.ts` is a POSIX-like in-memory filesystem, `lib/vm/git.ts` implements
the Git object model and the porcelain the labs actually use (`init`, `clone`,
`add`, `commit`, `branch`, `checkout`, `switch`, `merge`, `rebase`, `remote`,
`fetch`, `push`, `pull`, `stash`, `reset`, `restore`, `revert`, `cherry-pick`,
`apply`, `rm`, `tag`, `config`, `log`, `status`, `diff`), `lib/vm/shell.ts` glues
them to a command line with `cd`, `pwd`, `ls`, `cat`, `echo`, `touch`, `mkdir`,
`cp`, `mv`, `rm`, `grep`, `head`, `tail`, `wc`, `test`, `env`, `export`, quoting,
`&&`/`||`/`;`, pipelines and redirects, and `lib/vm/scenario.ts` declares each
lab's starting repository, tasks and reference solution.
`lib/vm/playground.ts` seeds the forkable `git-playground` remotes so
`clone`/`push` have somewhere to go.

Grading is state-based, not text-matching: every task carries a check that runs
against the repository the learner built, so `git status` and a five-line
workaround both pass only when the repo is actually in the required state.
`Check my work` reports the first unfinished task with the command's own output;
`Reveal reference` shows the solution after the attempt is recorded. Nothing
leaves the device — there is no network in the shell, and the UI says so.

Current coverage: **59 scenarios, 59 of 63 Git labs runnable**
(`npm run check:vm`).

A path lesson can drive one of these scenarios directly: author the question with
`kind: 'terminal'` and `terminal: { scenarioId }`, and the quiz screen swaps the
token taps for the real VM player. `npm run check:curriculum` refuses a terminal
item whose `scenarioId` is not in the registry, whose scenario has no graded
task, or that still ships token options — the VM grades the repository, so there
is nothing to tap. Five path lessons drive it today: the branching, stashing and reverting
labs, plus both Git workshops, whose graded steps now bind four scenarios each.

## Sandbox editors (JS / CSS / HTML)

`buildSandboxDoc()` compiles the learner's source plus every assertion into one
function body, with `__record(id, fn)` collecting outcomes, and runs it inside a
`<webview>`/iframe that has no network access; `buildWebSandboxDoc()` does the
same for HTML/CSS labs against the real DOM and CSSOM. `SANDBOX_TIMEOUT_MS`
(5 000 ms) bounds a runaway loop and the UI reports a timeout instead of
hanging. The starter fails, the reference passes, and the learner sees per-test
results plus the run time.

Tests are generated, so they are checked twice: once by the importer against the
licensed reference implementation, and once per release by
[scripts/check-labex-sandbox.cjs](../scripts/check-labex-sandbox.cjs), which
re-executes every stored exercise in `node:vm` with harness-identical semantics.
The gate fails if a reference does not pass, a starter passes as written, an
assertion is trivial (`typeof x === 'function'`, `true`), a test reaches for
`fetch`/`XMLHttpRequest`/`import`, a fixture smuggles a `<script>`, an inline
`style`, an `@import` or a remote URL, or a CSS/HTML `pattern` matches the
comment-stripped starter.

Current coverage: **308 runnable exercises — 226 JavaScript and 82 CSS, both
from the `javascript` and `css` banks** (`npm run check:sandbox`).

To see why a lab did not get an exercise, re-run the importer with
`LABEX_SANDBOX_STATS=1`: it prints the drop reasons per language instead of
guessing.

## Guided fallback

Labs in languages this build cannot execute on-device (Go, Python, Rust, React,
Flask, NumPy, pandas, matplotlib, scikit-learn) keep their knowledge check and
gain one read-only walkthrough: the lab's real steps, the commands it prints, and
its reference files, exactly as the source material states them. The stage is
explicit about what it is not — *"This build does not run this language. Follow
the steps on your own machine."* Walkthroughs are split into lazy chunks per
category (40 labs each) so opening one lab costs one small chunk, resolved by
`getGuidedLab(id)` in [lib/labex/guided/index.ts](../lib/labex/guided/index.ts).

Current coverage: **1 893 walkthroughs, 1 834 of them guided-only**
(`npm run check:guided`).

## Where the material comes from

The library is distilled from official public source repositories by
[scripts/import-labex.cjs](../scripts/import-labex.cjs) — never scraped from a
hosted lab product — and only permissive licences are imported (CC-BY, MIT, BSD,
Apache). Prose is rewritten, not copied; VM-only noise (`ssh`, container
boilerplate) is stripped; the attribution line (`source · author · licence`)
renders in the lab header. Regenerate from a local clone of the upstream
repository:

```bash
git clone --depth 1 https://github.com/labex-labs/open-source-labs "$HOME/open-source-labs"
npm run import:labex -- "$HOME/open-source-labs"   # defaults to ~/open-source-labs
npm run check:labex && npm run check:sandbox && npm run check:guided
```

Read [docs/content-rights.md](content-rights.md) before adding a new upstream.

Library size today: **1 893 labs, 6 734 questions, 12 categories**
(`npm run check:labex`).

## Gates

| Gate | Command | Fails when |
| --- | --- | --- |
| `labex` | `npm run check:labex` | A lesson is malformed, unlicensed, unsolvable, or a `code`/`terminal` question loses its exercise payload. |
| `sandbox-labs` | `npm run check:sandbox` | Any generated exercise stops executing honestly (see above). |
| `vm-labs` | `npm run check:vm` | A scenario's reference solution no longer passes its own task checks. |
| `guided-labs` | `npm run check:guided` | A lab has neither a runnable stage nor a walkthrough, or content health drops. |
| `course-score` | `npm run check:courses` | A workshop, lab or capstone block runs nothing and its title and blurb do not say plainly that it is a paper exercise. |

All five are `required` in [content/quality/gates.json](../content/quality/gates.json),
so `npm run gate` and CI block on them.

### The runs floor takes no exemptions

The `runs` floor of `scripts/score-courses.cjs` asks the question that
[lib/execution.ts](../lib/execution.ts) answers, in one place the app can read
too: is there an engine here — the Git VM, a `code` question whose test carries
a `run`, a `speak` question graded by on-device recognition, or a capstone story
with a live `check`? Token chains, `match`, `text` and `listen` grade strings
the learner typed or tapped, so a block built only from them does not execute
however hands-on its copy sounds — and the guided walkthrough is the honest
fallback for exactly those, labelled NO EXECUTION.

Every build block has to pass one of two tests, with nothing in between: an
engine runs what the learner writes, or the block's own title and blurb say
plainly that it is paper. There used to be a third answer — a ledger of
per-course counts of blocks allowed to do neither, which kept those blocks out of
the floor's total. Every block it forgave — the AI/ML and
certification workshops and capstones, the html/rwd/design workshops and
capstones, and four chess labs — has now been relabelled instead, and the file is
deleted. Scoring it against the engines that really exist left 118 blocks running
nothing, which are the 118 that were relabelled, and the floor now measures all
278 build blocks in all 13 courses. A block that runs nothing and does not say so
is new debt the day it is written, and no number anywhere makes that legal again.

The wording the relabel settled on, which is the wording the gate searches for,
by the kind of block: `Paper workshop: <task>` for a workshop, `Paper lab:
<task>` for a lab, and `On paper: <name>` for a capstone or project.

The blurb is the same sentence every time:
`Paper exercise, nothing runs here: <what you actually do>; nothing executes —
your text is matched.` That last clause is what it is scored against.

The two Git workshops took the other road and must not be relabelled. Every step the VM can grade
now binds a shipped scenario and is graded from repository state: `git-workshop-history` runs
`labex-git-add-files-to-the-staging-area`, `labex-git-remove-files-from-the-staging-area`,
`labex-git-configure-the-git-text-editor` and `labex-git-edit-the-last-commit`; `git-workshop-recovery`
runs `labex-git-remove-a-file-from-the-last-commit`, `labex-git-update-remote-branch-after-rewriting-history`,
`labex-git-discard-uncommitted-changes` and `labex-git-restore-a-deleted-file`. The two steps no scenario
can check — staging one hunk with `git add -p`, and an ignore rule — say so inside the step itself.
Their titles and blurbs say "Runs in the offline Git VM" — and `scripts/check-curriculum-quality.cjs`
fails if copy like that ever drifts from an engine in either direction.

### What the learner sees

A block that runs nothing without saying so is a promise this build cannot keep,
so the app says it out loud.
[components/lesson/NoExecutionBadge.tsx](../components/lesson/NoExecutionBadge.tsx)
renders **NO EXECUTION** wherever `defersExecution` holds — no engine behind the
block *and* no paper wording in its own title and blurb — using the helper the
floor grades, not a summary of it.

| Where it shows | What the learner gets |
| --- | --- |
| The path card, `src/app/curriculum/[unitId].tsx` | a chip beside `WORKSHOP`, `LAB` or `CAPSTONE` |
| The lesson header, `src/app/quiz/[lessonId].tsx` | a line above the questions naming what is graded instead |
| The project header, `src/app/project/[lessonId].tsx` | the chip beside `Certification project`, for a capstone with no live check |

No block carries it today: of the 278 build blocks, 151 run in an engine and 127
say plainly in their own title and blurb that they are paper, so for every one of
them the badge would be either a lie or an echo. It is the label, not the debt,
that has gone — a workshop whose copy says nothing runs here still grades matched
text, and the sentence in the blurb is what the learner was owed either way.
`scripts/check-curriculum-quality.cjs` keeps the two readers joined: it fails if
the scorer stops requiring `lib/execution.ts` or keeps a copy of the test of its
own, if any of the three screens stops rendering the badge, if the app badges a
block the floor does not count or the floor counts one the app stays quiet about,
and if the copy and the engine drift in either direction — a block whose own title
or blurb promises "runs in the …" has to clear `executionEngine`, and a block an
engine does run may not keep calling itself paper.

## Telemetry

The engines report usage so a broken engine shows up in the owner console rather
than in a support message: `terminal_command` (verb and ok flag only — arguments
can name paths and file contents), `terminal_tasks_progress`, `terminal_check`,
`terminal_lab_completed`, `code_sandbox_result` (language, mode, passed, total,
ms — never the code) and `code_sandbox_timeout`. See
[docs/quality-operations.md](quality-operations.md#telemetry--privacy).
