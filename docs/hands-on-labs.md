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

## Guided fallback

Labs in languages this build cannot execute on-device (Go, Python, Rust, React,
Flask, NumPy, pandas, matplotlib, scikit-learn) keep their knowledge check and
gain one read-only walkthrough: the lab's real steps, the commands it prints, and
its reference files, exactly as the source material states them. The stage is
explicit about what it is not — *"This build does not run this language. Follow
the steps on your own machine."* Walkthroughs are split into lazy chunks per
category (40 labs each) so opening one lab costs one small chunk, resolved by
`getGuidedLab(id)` in [lib/labex/guided/index.ts](../lib/labex/guided/index.ts).

Current coverage: **1 842 walkthroughs, 1 783 of them guided-only**
(`npm run check:guided`).

## Where the material comes from

The library is distilled from official public source repositories by
[scripts/import-labex.cjs](../scripts/import-labex.cjs) — never scraped from a
hosted lab product — and only permissive licences are imported (CC-BY, MIT, BSD,
Apache). Prose is rewritten, not copied; VM-only noise (`ssh`, container
boilerplate) is stripped; the attribution line (`source · author · licence`)
renders in the lab header. Regenerate with `npm run import:labex` and read
[docs/content-rights.md](content-rights.md) before adding a new upstream.

Library size today: **1 842 labs, 6 580 questions, 12 categories**
(`npm run check:labex`).

## Gates

| Gate | Command | Fails when |
| --- | --- | --- |
| `labex` | `npm run check:labex` | A lesson is malformed, unlicensed, unsolvable, or a `code`/`terminal` question loses its exercise payload. |
| `sandbox-labs` | `npm run check:sandbox` | Any generated exercise stops executing honestly (see above). |
| `vm-labs` | `npm run check:vm` | A scenario's reference solution no longer passes its own task checks. |
| `guided-labs` | `npm run check:guided` | A lab has neither a runnable stage nor a walkthrough, or content health drops. |

All four are `required` in [content/quality/gates.json](../content/quality/gates.json),
so `npm run gate` and CI block on them.

## Telemetry

The engines report usage so a broken engine shows up in the owner console rather
than in a support message: `terminal_command` (verb and ok flag only — arguments
can name paths and file contents), `terminal_tasks_progress`, `terminal_check`,
`terminal_lab_completed`, `code_sandbox_result` (language, mode, passed, total,
ms — never the code) and `code_sandbox_timeout`. See
[docs/quality-operations.md](quality-operations.md#telemetry--privacy).
