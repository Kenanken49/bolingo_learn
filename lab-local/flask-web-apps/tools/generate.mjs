#!/usr/bin/env node
/*
 * Builds the local LabEx lab from two inputs:
 *   tools/source-corpus.json  - the licensed distillation already in the app
 *                               (lib/labex/guided/flask), step by step
 *   tools/course.json         - the reverse-engineered filesystem spec:
 *                               goals, files, expected states, graded checks
 *
 * Emits, relative to this directory's parent (lab-local/flask-web-apps/):
 *   .labex/config.json        - metadata + the 84-step sequence
 *   .labex/verify_step<N>.sh  - the "Check" button for step N
 *   lab_content/step<N>.md    - the instructions for step N
 *   .labex/run-all.sh         - runs every grader against the current tree
 *
 * Run: node tools/generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const course = JSON.parse(fs.readFileSync(path.join(root, "tools/course.json"), "utf8"));
const corpus = JSON.parse(fs.readFileSync(path.join(root, "tools/source-corpus.json"), "utf8"));

const WP = course.course.web_port;
const CSP = course.course.code_server_port;
const PRIVATE = Number(process.env.LAB_PRIVATE_PORT || 18080);

/** Quote for bash inside single quotes: ' -> '\'' */
function sh(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function fenceBlock(code) {
  const lang = code.lang === "shell" || code.lang === "bash" ? "bash" : code.lang;
  return "```" + lang + "\n" + code.text.replace(/\s+$/, "") + "\n```";
}

function moduleOf(stepNumber) {
  return course.modules.find((m) => stepNumber >= m.step_from && stepNumber <= m.step_to);
}

function labDirOf(mod) {
  return mod.dir.replace(/^workspace\//, "");
}

/** Path the student works in, as shown in the markdown (relative to repo root). */
function workspacePath(mod, file) {
  return file.startsWith("workspace/") ? file : "workspace/" + file;
}

function markdownFor(step, mod, cStep) {
  const dir = labDirOf(mod);
  const files = step.files.map((f) => workspacePath(mod, f));
  const relIn = (f) => {
    const raw = f.replace(/^workspace\//, "");
    return raw.startsWith(dir + "/") ? raw.slice(dir.length + 1) : raw;
  };
  const kindNote = {
    build: null,
    run: "This step is about **running** something. Do not expect the checker to start your server: " +
      "start it yourself exactly as described below, leave it running, then run `./lab check " + step.n + "` " +
      "from a second terminal.",
    test: "This step runs a test suite. The checker executes it for real and reads the results.",
    read: "**This step has nothing to grade.** It is the end of module " + mod.n + ": the work was done by " +
      "hand on the LabEx VM and the original lab recorded it as an observation, so the honest local check " +
      "is `SKIP` with exit code 0. Do the reading, then move on.",
  }[step.kind];

  const lines = [];
  lines.push("# Step " + step.n + " · " + cStep.title);
  lines.push("");
  lines.push("**Module " + mod.n + " of " + course.modules.length + " — " + mod.title + "**");
  lines.push("");
  lines.push("**Goal:** " + step.goal);
  lines.push("");
  if (step.n === mod.step_from) {
    lines.push("## About this module");
    lines.push("");
    lines.push(corpus[mod.corpus].intro.trim());
    lines.push("");
    lines.push("Work in `workspace/" + dir + "/`. `./lab check " + step.n + "` grades this step.");
    lines.push("");
  }
  lines.push("## Instructions");
  lines.push("");
  for (const para of cStep.body) {
    lines.push(para.trim());
    lines.push("");
  }
  for (const code of cStep.code) {
    lines.push(fenceBlock(code));
    lines.push("");
  }
  if (step.note) {
    lines.push("> " + step.note);
    lines.push("");
  }
  if (kindNote) {
    lines.push(kindNote);
    lines.push("");
  }
  lines.push("## Expected filesystem state afterwards");
  lines.push("");
  lines.push("```");
  lines.push("workspace/" + dir + "/          (as it should look after step " + step.n + ")");
  for (const f of files)  lines.push("├── " + relIn(f) + "   (this step)");
  const earlier = [];
  for (const other of course.steps) {
    if (other.n >= step.n) break;
    for (const f of other.files) {
      if (f.startsWith(dir + "/") && !files.includes(workspacePath(mod, f)) && !earlier.includes(f)) earlier.push(f);
    }
  }
  for (const f of earlier) lines.push("├── " + relIn(f) + "   (earlier step)");
  if (!files.length) lines.push("└── unchanged - this step produces no files");
  lines.push("```");
  lines.push("");
  if (files.length) {
    lines.push("## Files this step touches");
    lines.push("");
    for (const f of files) lines.push("- `" + f + "`");
    lines.push("");
  }
  if (step.state) {
    lines.push("This step replaces configuration written by an earlier step: `solutions/" + step.state + "/` " +
      "holds that exact tree, and `./lab solve --step " + step.n + "` applies it.");
    lines.push("");
  }
  const runCmds = corpus[mod.corpus].commands || [];
  if (runCmds.length && step.kind === "run") {
    lines.push("## Commands for this module (from the original lab)");
    lines.push("");
    lines.push("```bash");
    for (const c of runCmds) lines.push(c);
    lines.push("```");
    lines.push("");
  }
  lines.push("## Verify");
  lines.push("");
  lines.push("```bash");
  lines.push("./lab check " + step.n);
  lines.push("```");
  lines.push("");
  lines.push("Exit code `0` means the step passed. The checker inspects the real files, imports the real " +
    "code and talks to the real server on port " + WP + " — it never grades you on matching text. " +
    "On a `build` step the checker may start a private copy of your app on port " + PRIVATE +
    " so your own server on " + WP + " is never disturbed.");
  if (step.checks.length) {
    lines.push("");
    lines.push("What this step checks:");
    lines.push("");
    for (const c of step.checks) {
    const target = c.f || c.target || (c.cmd ? c.cmd.join(" ") : "") || c.name || c.import || c.dir || c.path || c.port || "";
    lines.push("- `" + c.t + "` on `" + target + "` — " + describeCheck(c));
  }
  }
  lines.push("");
  lines.push("Stuck? `./lab solve --step " + step.n + "` lays down the finished code up to this step, " +
    "`./lab reset --module " + mod.n + "` puts the module back to its starter state.");
  lines.push("");
  return lines.join("\n");
}

/** Human-readable summary of one graded check, in the engine's own schema. */
function describeCheck(c) {
  const join = (arr) => (Array.isArray(arr) ? arr.join(", ") : String(arr));
  let label;
  switch (c.t) {
    case "pkg": label = "importable package " + c.import; break;
    case "pkgmin": label = "importable package " + c.import + " (minimum version)"; break;
    case "pkgpath": label = "imported " + c.import + " must resolve under " + c.contains; break;
    case "ast": label = "Python AST of " + c.f; break;
    case "file": label = "file " + c.f; break;
    case "dir": label = "directory " + c.f; break;
    case "cli": label = "command " + join(c.cmd); break;
    case "http": label = (c.method || "GET") + " http://" + (c.host || "localhost") + ":" + (c.port || WP) + c.path; break;
    case "running": label = "live process on port " + c.port; break;
    case "db": label = "SQLite " + c.f; break;
    case "sql": label = "schema " + c.f + " executed against real SQLite"; break;
    case "css": label = "CSS rules in " + c.f; break;
    case "pytest": label = "pytest " + c.file; break;
    case "app": label = "application factory " + c.target; break;
    case "script": label = "probe script " + c.name; break;
    default: label = c.t;
  }
  const detail = [];
  if (c.contains) detail.push("must contain " + JSON.stringify(c.contains));
  if (c.matches) detail.push("must match /" + c.matches + "/");
  if (c.imports) detail.push("imports " + join(c.imports));
  if (c.assigns) detail.push("assigns " + join(c.assigns));
  if (c.funcs) detail.push("defines " + join(c.funcs));
  if (c.calls) detail.push("calls " + join(c.calls));
  if (c.routes) detail.push("routes " + join(c.routes));
  if (c.tables) detail.push("tables " + join(c.tables));
  if (c.min) detail.push("at least " + c.min + " bytes");
  if (c.min_rules) detail.push(c.min_rules + "+ real rules");
  if (c.selectors) detail.push("selectors " + join(c.selectors));
  if (c.columns) detail.push("columns " + Object.keys(c.columns).map((k) => k + "(" + join(c.columns[k]) + ")").join(" "));
  if (c.expect_config) detail.push("config " + JSON.stringify(c.expect_config));
  if (c.blueprint) detail.push("blueprint " + JSON.stringify(c.blueprint));
  if (c.blueprint_registered) detail.push("registers blueprint " + JSON.stringify(c.blueprint_registered));
  if (c.url_rule) detail.push("url rule " + JSON.stringify(c.url_rule));
  if (c.endpoints) detail.push("endpoints " + join(c.endpoints));
  if (c.get) detail.push("in-process GET " + c.get);
  if (c.expect_headers) detail.push("response headers " + join(c.expect_headers));
  if (c.expect_cookie) detail.push("cookie " + JSON.stringify(c.expect_cookie));
  if (c.min_passed) detail.push(c.min_passed + " passed / " + c.min_collected + " collected");
  if (c.status) detail.push("HTTP " + c.status);
  if (c.ctype) detail.push("content-type " + c.ctype);
  if (c.headers) detail.push("headers " + join(c.headers));
  if (c.cookie_flags) detail.push("cookie flags " + join(c.cookie_flags));
  if (c.min_version) detail.push("version >= " + c.min_version);
  return (label || c.t) + (detail.length ? " — " + detail.join(", ") : "");
}

function verifyScriptFor(step, mod) {
  const dir = labDirOf(mod);
  const body = [];
  body.push("#!/usr/bin/env bash");
  body.push("# Step " + step.n + " — " + corpus[mod.corpus].steps[step.n - mod.step_from].title);
  body.push("# Generated by tools/generate.mjs from tools/course.json + tools/source-corpus.json.");
  body.push("# Do not edit: change the spec and re-run the generator.");
  body.push("");
  body.push("set -uo pipefail");
  body.push("cd \"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/..\" && pwd)\"");
  body.push("export LAB_DIR=\"" + dir + "\"");
  body.push("export LAB_STEP_N=" + step.n);
  body.push("export LAB_STEP_TITLE=" + sh(corpus[mod.corpus].steps[step.n - mod.step_from].title));
  body.push("export LAB_STEP_GOAL=" + sh(step.goal));
  body.push("export LAB_STEP_KIND=" + sh(step.kind));
  body.push("source .labex/lib/verify.sh");
  body.push("");
  if (step.checks.length === 0) {
    // A `read` step has nothing to grade: an empty queue is what makes the
    // harness print SKIP instead of FAIL.
    body.push("queue() { :; }");
  } else {
    body.push("queue() {");
    for (const check of step.checks) body.push("  v " + sh(JSON.stringify(check)));
    body.push("}");
  }
  body.push("");
  body.push("run_checks");
  body.push("");
  return body.join("\n");
}

function configJson() {
  return {
    lab: course.course.id,
    display_name: course.course.title,
    subtitle: course.course.subtitle,
    attribution: course.course.attribution,
    language: course.course.language,
    framework: course.course.framework,
    image: course.course.base_image,
    time_limit_minutes: 0,
    workspace: course.course.workspace_root,
    ports: {
      web_app: WP,
      code_server: CSP,
      private_check_server: PRIVATE,
    },
    verify: {
      engine: ".labex/lib/verify.sh",
      checks: ".labex/lib/checks.py",
      probes: ".labex/probes",
      run_all: ".labex/run-all.sh",
      graders_total: course.steps.reduce((n, s) => n + s.checks.length, 0),
    },
    honesty: {
      graded_by_filesystem_and_live_state: true,
      autostarts_servers_only_on_private_port: PRIVATE,
      ungradeable_steps: course.steps.filter((s) => s.kind === "read").map((s) => s.n),
    },
    steps: course.steps.map((s) => {
      const mod = moduleOf(s.n);
      const cStep = corpus[mod.corpus].steps[s.n - mod.step_from];
      return {
        name: cStep.title,
        display_name: cStep.title,
        instruction: "lab_content/step" + s.n + ".md",
        solution: s.kind === "read" ? "" : "lab_content/step" + s.n + ".md",
        verify: ".labex/verify_step" + s.n + ".sh",
        step: s.n,
        module: mod.n,
        module_title: mod.title,
        lab_dir: labDirOf(mod),
        kind: s.kind,
        goal: s.goal,
        files: s.files,
        expected_state: s.state || null,
        note: s.note || null,
        checks: s.checks.length,
        check_targets: s.checks.map((c) => `${c.t}:${c.f ?? c.path ?? c.dir ?? c.import ?? c.name ?? (c.cmd ? c.cmd.join(' ') : '')}`),
      };
    }),
    modules: course.modules.map((m) => ({
      n: m.n,
      title: m.title,
      slug: m.slug,
      dir: labDirOf(m),
      steps: [m.step_from, m.step_to],
      solution: m.solution,
      corpus: m.corpus,
      corpus_title: corpus[m.corpus].source,
      summary: m.summary,
    })),
  };
}

function runAllScript() {
  const lines = [];
  lines.push("#!/usr/bin/env bash");
  lines.push("# Run every step grader against the current tree. Generated by tools/generate.mjs.");
  lines.push("#");
  lines.push("#   .labex/run-all.sh            every step, in order");
  lines.push("#   .labex/run-all.sh 1 20       steps 1..20");
  lines.push("# With ./lab solve --step N applied first, steps that are build/run/test pass;");
  lines.push("# steps that need a live server or process report FAIL truthfully.");
  lines.push("set -uo pipefail");
  lines.push("cd \"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/..\" && pwd)\"");
  lines.push("first=${1:-1}");
  lines.push("last=${2:-" + course.steps.length + "}");
  lines.push("pass=0; fail=0; skip=0");
  lines.push("for n in $(seq \"$first\" \"$last\"); do");
  lines.push("  if ./.labex/verify_step\"$n\".sh >/tmp/lab-step-\"$n\".log 2>&1; then");
  lines.push("    if grep -q 'nothing to grade' /tmp/lab-step-\"$n\".log; then");
  lines.push("      printf '%3d SKIP  %s\\n' \"$n\" \"$(head -2 /tmp/lab-step-\"$n\".log | tail -1)\"");
  lines.push("      skip=$((skip + 1))");
  lines.push("    else");
  lines.push("      printf '%3d PASS  %s\\n' \"$n\" \"$(head -2 /tmp/lab-step-\"$n\".log | tail -1)\"");
  lines.push("      pass=$((pass + 1))");
  lines.push("    fi");
  lines.push("  else");
  lines.push("    printf '%3d FAIL  %s\\n' \"$n\" \"$(head -2 /tmp/lab-step-\"$n\".log | tail -1)\"");
  lines.push("    fail=$((fail + 1))");
  lines.push("  fi");
  lines.push("done");
  lines.push("echo \"---- $pass passed, $fail failed, $skip skipped (steps $first-$last)\"");
  lines.push("[ \"$fail\" -eq 0 ]");
  lines.push("");
  return lines.join("\n");
}

fs.mkdirSync(path.join(root, ".labex"), { recursive: true });
fs.mkdirSync(path.join(root, "lab_content"), { recursive: true });

let count = 0;
for (const step of course.steps) {
  const mod = moduleOf(step.n);
  if (!mod) throw new Error("step " + step.n + " has no module range");
  const entry = corpus[mod.corpus].steps[step.n - mod.step_from];
  if (!entry) throw new Error("no corpus step for module " + mod.n + " step " + step.n);
  fs.writeFileSync(path.join(root, "lab_content", "step" + step.n + ".md"), markdownFor(step, mod, entry), "utf8");
  fs.writeFileSync(path.join(root, ".labex", "verify_step" + step.n + ".sh"), verifyScriptFor(step, mod), "utf8");
  count += 1;
}

fs.writeFileSync(path.join(root, ".labex", "config.json"), JSON.stringify(configJson(), null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(root, ".labex", "run-all.sh"), runAllScript(), "utf8");

console.log("generated " + count + " markdown files and " + count + " graders");
console.log("course: " + course.course.title + " — " + course.modules.length + " modules, " +
  count + " steps, " + course.steps.reduce((n, s) => n + s.checks.length, 0) + " graded checks");
