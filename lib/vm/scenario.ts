/**
 * A Git lab as a runnable, offline scenario: the repo the upstream lab starts
 * from, the tasks it asks for, and shell checks that prove each task landed.
 * Checks run against a cloned terminal, so grading can never alter the lab.
 */

import { Terminal } from './shell';
import { playgroundRemotes } from './playground';

export interface LabTask {
  id: string;
  /** Learner-facing instruction, adapted from the lab's own step. */
  text: string;
  /** Shell check: exit 0 means this task is done. */
  check: string;
  hint?: string;
}

export interface LabScenario {
  /** Matches the LabEx lesson id so the quiz route can attach it. */
  id: string;
  title: string;
  /** One-paragraph mission statement, adapted from the lab brief. */
  brief: string;
  /** Commands that build the starting state, run once when the lab opens. */
  setup?: string;
  /** Working directory for the learner once setup has run. */
  cwd?: string;
  tasks: LabTask[];
  /** Reference walkthrough, revealed only on request. */
  solution: string[];
}

export interface CheckOutcome {
  id: string;
  pass: boolean;
  out: string;
  err: string;
}

export function openScenario(scenario: LabScenario): Terminal {
  const terminal = new Terminal({
    remotes: playgroundRemotes(),
    cwd: '/home/labex/project',
    seed: scenario.setup,
  });
  if (scenario.cwd) {
    const moved = terminal.run(`cd ${scenario.cwd}`);
    if (moved.code !== 0) terminal.cwd = scenario.cwd;
  }
  return terminal;
}

/** Grade every task against the terminal's current state. */
export function evaluateTasks(terminal: Terminal, tasks: LabTask[]): CheckOutcome[] {
  return tasks.map((task) => {
    const result = terminal.check(task.check);
    return { id: task.id, pass: result.pass, out: result.out, err: result.err };
  });
}

/** Build a scenario from scratch and replay its reference solution. */
export function replayScenario(scenario: LabScenario): { terminal: Terminal; failures: string[] } {
  const terminal = openScenario(scenario);
  const failures: string[] = [];
  for (const line of scenario.solution) {
    const result = terminal.run(line);
    if (result.code !== 0) failures.push(`solution "${line}" exited ${result.code}: ${result.err.trim()}`);
  }
  return { terminal, failures };
}
