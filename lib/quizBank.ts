/**
 * Quiz bank primitives — one owner for question shape.
 * courses.ts (code curriculum) and languages.ts (World Languages & Chess)
 * both build banks with these helpers; the quiz engine, SRS, and guidebook
 * only ever see CourseLesson via getCourseLesson().
 *
 * Three exercise kinds share one envelope:
 *   tokens (default) — tap tokens into the right order (MCQ is a 1-token chain)
 *   code             — write JS in an editor; graded by real assertions in a sandbox
 *   text             — free response; graded by accepted answers + misconception map
 * Every kind keeps correctChain as the canonical answer (one entry for code and
 * text) so results, XP and the SRS snapshot stay uniform.
 */

export type QuestionKind = 'tokens' | 'code' | 'text' | 'terminal' | 'guided';

export interface CodeTest {
  id: string;
  /** Learner-facing assertion, e.g. "double(2) returns 4". */
  label: string;
  /** Expression evaluated after the learner's code; truthy means pass. */
  run: string;
  /** Shown while this test fails — never prints the full solution. */
  hint?: string;
  /**
   * Offline fallback for HTML/CSS exercises: a regex over the learner's
   * markup and styles. Only used when a build has no browser/WebView runtime;
   * the live DOM assertion (`run`) always wins when a runtime exists.
   */
  pattern?: string;
}

export interface CodeExercise {
  /** Runtime used to grade the exercise. */
  language: 'js' | 'html' | 'css';
  /** Editable starting point; must be valid syntax on its own. */
  starter: string;
  /** HTML/CSS exercises render this fixture; CSS starters style it. */
  fixture?: { html?: string; css?: string };
  tests: CodeTest[];
}

export interface TerminalExercise {
  /** Key in the scenario registry — validated by scripts/check-vm.cjs. */
  scenarioId: string;
}

export interface GuidedSnippet {
  /** Fence language from the source lab, e.g. python, js, bash. */
  lang: string;
  text: string;
}

export interface GuidedStep {
  title: string;
  /** Plain-text paragraphs and bullets, already stripped of markup. */
  body: string[];
  code?: GuidedSnippet[];
}

/**
 * A read-only walkthrough for labs that need a runtime this build does not
 * ship (Python, Go, Rust, data science). The content is derived from the
 * licensed lab's own steps and reference files — never invented — and is
 * labelled “Guided — no execution” everywhere it renders.
 */
export interface GuidedLab {
  intro: string;
  steps: GuidedStep[];
  /** Shell lines from the lab, shown in a read-only terminal. */
  commands: string[];
  /** Reference files (solutions or the lab's final code block). */
  reference: { path: string; text: string }[];
  source: string;
}

export interface TextAnswerSpec {
  /** Accepted answers, compared after normalizeAnswer(). First entry is canonical. */
  answers: string[];
  placeholder?: string;
  /** Normalized wrong answer → targeted reteach ("matched the verb, not the tense"). */
  misconceptions?: Record<string, string>;
}

export interface CourseQuestion {
  prompt: string;
  correctChain: string[];
  scrambledTokens: string[];
  explain?: string;
  kind?: QuestionKind;
  code?: CodeExercise;
  text?: TextAnswerSpec;
  terminal?: TerminalExercise;
  guided?: GuidedLab;
}

export interface CourseLesson {
  id: string;
  title: string;
  theory: string[];
  questions: CourseQuestion[];
}

export const MCQ = (prompt: string, answer: string, options: string[], explain: string): CourseQuestion => ({
  prompt,
  correctChain: [answer],
  scrambledTokens: options,
  explain,
});

export const BUILD = (prompt: string, chain: string[], bank: string[], explain: string): CourseQuestion => ({
  prompt,
  correctChain: chain,
  scrambledTokens: bank,
  explain,
});

/** Runnable exercise: the learner writes code, the harness runs `tests`. */
export const CODE = (
  prompt: string,
  exercise: CodeExercise,
  solution: string,
  explain: string
): CourseQuestion => ({
  kind: 'code',
  prompt,
  correctChain: [solution],
  scrambledTokens: [],
  explain,
  code: exercise,
});

/** Free-response exercise: type the answer; misconceptions reteach near-misses. */
export const TEXT = (
  prompt: string,
  answers: string[],
  explain: string,
  opts: { placeholder?: string; misconceptions?: Record<string, string> } = {}
): CourseQuestion => ({
  kind: 'text',
  prompt,
  correctChain: [answers[0]],
  scrambledTokens: [],
  explain,
  text: { answers, placeholder: opts.placeholder, misconceptions: opts.misconceptions },
});

/** Fold case, apostrophe flavor, punctuation edges, and repeated whitespace. */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '')
    .toLowerCase();
}

/**
 * Fail loudly on malformed banks: empty prompts, empty chains, banks that
 * can't produce the chain, or missing teaching notes. Run once at module
 * load so a bad seed breaks the bundle, not a learner's session.
 */
export function validateBank(lesson: CourseLesson): void {
  if (!lesson.id || !lesson.title) throw new Error(`Bank missing id/title: ${JSON.stringify(lesson).slice(0, 80)}`);
  if (!Array.isArray(lesson.questions) || lesson.questions.length === 0) {
    throw new Error(`Bank ${lesson.id} has no questions.`);
  }
  lesson.questions.forEach((q, i) => {
    const tag = `${lesson.id} Q${i + 1}`;
    if (typeof q.prompt !== 'string' || q.prompt.trim().length === 0) throw new Error(`${tag}: empty prompt.`);
    if (!Array.isArray(q.correctChain) || q.correctChain.length === 0) throw new Error(`${tag}: empty correctChain.`);
    if (typeof q.explain !== 'string' || q.explain.trim().length === 0) {
      throw new Error(`${tag}: missing explain (every answer must teach).`);
    }
    if (q.kind === 'code') {
      const code = q.code;
      if (!code || !['js', 'html', 'css'].includes(code.language)) {
        throw new Error(`${tag}: code kind needs a js, html, or css exercise.`);
      }
      if (typeof code.starter !== 'string') throw new Error(`${tag}: code starter must be a string.`);
      if (!Array.isArray(code.tests) || code.tests.length === 0) throw new Error(`${tag}: code exercise needs at least one test.`);
      const ids = new Set<string>();
      code.tests.forEach((t) => {
        if (!t.id || ids.has(t.id)) throw new Error(`${tag}: code test ids must be unique (${t.id || 'empty'}).`);
        ids.add(t.id);
        if (!t.label?.trim() || !t.run?.trim()) throw new Error(`${tag}: code test ${t.id} needs label and run.`);
      });
      return;
    }
    if (q.kind === 'terminal') {
      if (!q.terminal?.scenarioId?.trim()) throw new Error(`${tag}: terminal kind needs a scenarioId.`);
      return;
    }
    if (q.kind === 'text') {
      const text = q.text;
      if (!text || !Array.isArray(text.answers) || text.answers.length === 0) {
        throw new Error(`${tag}: text kind needs at least one accepted answer.`);
      }
      const seen = new Set<string>();
      text.answers.forEach((a) => {
        const key = normalizeAnswer(a);
        if (!key) throw new Error(`${tag}: blank accepted answer.`);
        if (seen.has(key)) throw new Error(`${tag}: duplicate accepted answer ${JSON.stringify(a)}.`);
        seen.add(key);
      });
      if (normalizeAnswer(q.correctChain[0]) !== seen.values().next().value) {
        throw new Error(`${tag}: correctChain[0] must be the first accepted answer.`);
      }
      return;
    }
    const bank = [...q.scrambledTokens];
    for (const t of q.correctChain) {
      const k = bank.indexOf(t);
      if (k === -1) throw new Error(`${tag}: chain token ${JSON.stringify(t)} missing from bank — unsolvable.`);
      bank.splice(k, 1);
    }
  });
}
