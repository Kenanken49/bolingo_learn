/**
 * Quiz bank primitives — one owner for question shape.
 * courses.ts (code curriculum) and languages.ts (World Languages & Chess)
 * both build banks with these helpers; the quiz engine, SRS, and guidebook
 * only ever see CourseLesson via getCourseLesson().
 *
 * Exercise kinds share one envelope and follow a difficulty gradient, hardest
 * last: recognise (mcq) → choose → pair (match) → hear (listen) → say (speak)
 * → build (tokens) → produce (text) → run (code/terminal) → walk (guided).
 *   tokens (default) — tap tokens into the right order (MCQ is a 1-token chain)
 *   match            — tap the pairs that go together, one screen, no typing
 *   listen           — audio only; the phrase is never shown while they type
 *   speak            — say it out loud; graded by real recognised speech
 *   code             — write JS in an editor; graded by real assertions in a sandbox
 *   text             — free response; graded by accepted answers + misconception map
 * Every kind keeps correctChain as the canonical answer (one entry for code and
 * text) so results, XP and the SRS snapshot stay uniform.
 */

export type QuestionKind =
  | 'tokens'
  | 'match'
  | 'listen'
  | 'speak'
  | 'code'
  | 'text'
  | 'terminal'
  | 'guided';

/** A matched pair in a tap-the-pairs exercise. `left` is the cue, `right` the answer. */
export interface MatchPair {
  left: string;
  right: string;
}

export interface MatchSpec {
  /** 4-6 pairs. Fewer is a coin flip, more stops being a memory task. */
  pairs: MatchPair[];
}

/**
 * Audio-only recall. `phrase` is what the learner hears (spoken in the
 * lesson's own voice); `answers` are the accepted typed forms. The phrase is
 * never rendered while the attempt is open, so this tests hearing rather than
 * reading — which is why `answers` must contain what a correct transcription
 * actually looks like.
 */
export interface ListenSpec {
  phrase: string;
  answers: string[];
  placeholder?: string;
  /** Wrong typed answer → targeted reteach, same shape as a text exercise. */
  misconceptions?: Record<string, string>;
}

/**
 * Production through the microphone. Graded by the recogniser score in
 * `lib/speakBack.ts`; a build with no capture path says so plainly instead of
 * pretending to have listened.
 */
export interface SpeakSpec {
  phrase: string;
  /** Recognised score needed to pass. Defaults to 75 ("good"). */
  passScore?: number;
}

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
  match?: MatchSpec;
  listen?: ListenSpec;
  speak?: SpeakSpec;
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

/** Tap-the-pairs: match every cue to its partner. One wrong link still teaches. */
export const MATCH = (prompt: string, pairs: MatchPair[], explain: string): CourseQuestion => ({
  kind: 'match',
  prompt,
  correctChain: [`${pairs.length} pairs`],
  scrambledTokens: pairs.map((pair) => `${pair.left} → ${pair.right}`),
  explain,
  match: { pairs },
});

/**
 * Listen and type what you hear. `phrase` is spoken by the lesson's own voice;
 * `accepted` are the typed forms that count, first one canonical.
 */
export const LISTEN = (
  prompt: string,
  phrase: string,
  accepted: string[],
  explain: string,
  opts: { placeholder?: string; misconceptions?: Record<string, string> } = {}
): CourseQuestion => ({
  kind: 'listen',
  prompt,
  correctChain: [accepted[0]],
  scrambledTokens: [],
  explain,
  listen: { phrase, answers: accepted, placeholder: opts.placeholder, misconceptions: opts.misconceptions },
});

/** Say it out loud. Graded by the recogniser, never by a tap. */
export const SPEAK = (prompt: string, phrase: string, explain: string, passScore = 75): CourseQuestion => ({
  kind: 'speak',
  prompt,
  correctChain: [phrase],
  scrambledTokens: [],
  explain,
  speak: { phrase, passScore },
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
    if (q.kind === 'match') {
      const pairs = q.match?.pairs;
      if (!Array.isArray(pairs) || pairs.length < 4 || pairs.length > 6) {
        throw new Error(`${tag}: match needs 4-6 pairs (fewer is a coin flip, more is a chore).`);
      }
      const lefts = new Set<string>();
      const rights = new Set<string>();
      for (const pair of pairs) {
        if (!pair.left?.trim() || !pair.right?.trim()) throw new Error(`${tag}: match pair needs both sides.`);
        if (normalizeAnswer(pair.left) === normalizeAnswer(pair.right)) {
          throw new Error(`${tag}: match pair ${JSON.stringify(pair.left)} is identical on both sides — passable without knowing anything.`);
        }
        if (lefts.has(normalizeAnswer(pair.left)) || rights.has(normalizeAnswer(pair.right))) {
          throw new Error(`${tag}: duplicate match term on one side (${pair.left} / ${pair.right}).`);
        }
        lefts.add(normalizeAnswer(pair.left));
        rights.add(normalizeAnswer(pair.right));
      }
      return;
    }
    if (q.kind === 'listen') {
      const listen = q.listen;
      if (!listen?.phrase?.trim()) throw new Error(`${tag}: listen needs a phrase to speak.`);
      if (!Array.isArray(listen.answers) || listen.answers.length === 0) {
        throw new Error(`${tag}: listen needs at least one accepted transcription.`);
      }
      if (!listen.answers.map(normalizeAnswer).includes(normalizeAnswer(listen.phrase))) {
        throw new Error(`${tag}: listen must accept the phrase exactly as heard (${JSON.stringify(listen.phrase)}).`);
      }
      if (normalizeAnswer(q.correctChain[0]) !== normalizeAnswer(listen.answers[0])) {
        throw new Error(`${tag}: correctChain[0] must be the first accepted answer.`);
      }
      return;
    }
    if (q.kind === 'speak') {
      if (!q.speak?.phrase?.trim()) throw new Error(`${tag}: speak needs a phrase to say.`);
      const pass = q.speak.passScore ?? 75;
      if (!(pass >= 50 && pass <= 100)) throw new Error(`${tag}: speak passScore must sit between 50 and 100.`);
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
