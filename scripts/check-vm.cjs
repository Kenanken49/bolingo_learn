/**
 * Runs every authored terminal lab exactly as a learner would.
 *
 * For each scenario:
 *   1. open the seeded terminal and confirm at least one task is still unmet
 *   2. replay the reference solution and require every task check to pass
 *   3. reset the terminal and confirm the starting state is restored
 *   4. require the scenario to match a real LabEx lesson id
 *
 * A scenario that fails any of these never ships — this is the gate behind
 * "fully functional VM steps", not eyeballing output.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

require.extensions['.ts'] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};

const root = path.join(__dirname, '..');
const { GIT_SCENARIOS } = require(path.join(root, 'lib/labex/gitScenarios.ts'));
const { LABEX_GIT } = require(path.join(root, 'lib/labex/lessons/git.ts'));
const { openScenario, replayScenario, evaluateTasks } = require(path.join(root, 'lib/vm/scenario.ts'));

const problems = [];
const ids = Object.keys(GIT_SCENARIOS);
const seen = new Set();

function fail(id, message) {
  problems.push(`${id}: ${message}`);
}

for (const id of ids) {
  const scenario = GIT_SCENARIOS[id];
  if (seen.has(scenario.id)) fail(id, 'duplicate scenario id');
  seen.add(scenario.id);
  if (scenario.id !== id) fail(id, `scenario.id "${scenario.id}" does not match the lesson key`);
  if (!LABEX_GIT[id]) fail(id, 'no LabEx lesson with this id');
  if (!Array.isArray(scenario.tasks) || scenario.tasks.length === 0) fail(id, 'has no tasks');
  if (!Array.isArray(scenario.solution) || scenario.solution.length === 0) fail(id, 'has no reference solution');
  if (!scenario.brief || scenario.brief.length < 40) fail(id, 'brief is missing or too thin');
  const taskIds = new Set();
  for (const task of scenario.tasks ?? []) {
    if (!task.id || taskIds.has(task.id)) fail(id, `duplicate or empty task id ${task.id || '""'}`);
    taskIds.add(task.id);
    if (!task.text || !task.check) fail(id, `task ${task.id} needs text and check`);
  }

  const fresh = openScenario(scenario);
  const before = evaluateTasks(fresh, scenario.tasks);
  if (before.every((outcome) => outcome.pass)) {
    fail(id, 'every check already passes before the learner does anything');
  }

  const { terminal, failures } = replayScenario(scenario);
  if (failures.length) fail(id, `reference solution failed:\n  ${failures.join('\n  ')}`);
  const after = evaluateTasks(terminal, scenario.tasks);
  for (const outcome of after) {
    if (!outcome.pass) {
      fail(id, `task ${outcome.id} still fails after the reference solution: ${(outcome.err || outcome.out).trim()}`);
    }
  }

  terminal.reset();
  const reset = evaluateTasks(terminal, scenario.tasks);
  if (reset.every((outcome) => outcome.pass)) fail(id, 'reset did not restore the starting state');
}

const covered = Object.keys(GIT_SCENARIOS).filter((id) => LABEX_GIT[id]).length;
console.log(`check-vm: ${ids.length} scenario(s), ${covered}/${Object.keys(LABEX_GIT).length} Git labs runnable.`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}\n`);
  process.exit(1);
}
console.log('check-vm: every reference solution passes its own checks.');
