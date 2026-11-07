/**
 * AI & ML Academy — module compiler.
 *
 * The blueprint authors one entry per module (10 submodule notes, four
 * questions, a workshop, a runnable lab and one typed production task). This
 * file turns each entry into the four banks the app already knows how to play:
 *
 *   <id>-notes     theory = the ten submodule notes, then a matching drill
 *   <id>-workshop  guided token builds, one per workshop step
 *   <id>-lab       the module's runnable JavaScript exercise
 *   <id>-quiz      mastery check; it resurfaces the module's own items,
 *                  which is the blueprint's spaced-repetition requirement
 *
 * Nothing is invented at build time: every question, note and test comes from
 * the authored module record, so the curriculum gate can audit the real text.
 */

import { MCQ, BUILD, CODE, MATCH, TEXT, type CourseLesson } from '../../quizBank';

export interface AiQuizItem {
  q: string;
  a: string;
  options: string[];
  why: string;
}

export interface AiWorkshopStep {
  prompt: string;
  chain: string[];
  bank: string[];
  why: string;
}

export interface AiLabTest {
  id: string;
  label: string;
  run: string;
  hint?: string;
}

export interface AiLab {
  /** One line of orientation shown above the editor. */
  intro: string;
  prompt: string;
  starter: string;
  solution: string;
  tests: AiLabTest[];
}

export interface AiModule {
  /** Stable bank prefix, e.g. aiml1-m01. */
  id: string;
  title: string;
  /** One sentence: what the module earns the learner. */
  goal: string;
  /** Ten notes, one per blueprint submodule, in syllabus order. */
  notes: string[];
  /** 4-6 term/definition pairs for the recall drill. */
  terms: [string, string][];
  quiz: AiQuizItem[];
  workshop: { title: string; steps: AiWorkshopStep[] };
  lab: AiLab;
  text: { prompt: string; answers: string[]; why: string; hint?: string };
  /** The blueprint's module project, shown on the notes screen. */
  project: string;
}

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(`AI/ML module: ${message}`);
};

/** Compile one authored module into its four lesson banks. */
export function buildModule(mod: AiModule): Record<string, CourseLesson> {
  assert(mod.notes.length === 10, `${mod.id} needs exactly 10 submodule notes, has ${mod.notes.length}`);
  assert(mod.quiz.length >= 4, `${mod.id} needs 4+ authored questions`);
  assert(mod.workshop.steps.length >= 3, `${mod.id} needs 3+ workshop steps`);
  assert(mod.lab.tests.length >= 2, `${mod.id} lab needs 2+ tests`);
  assert(mod.text.answers.length >= 1, `${mod.id} needs an accepted answer for its production task`);

  const [q1, q2, q3, q4] = mod.quiz;
  const notes: CourseLesson = {
    id: `${mod.id}-notes`,
    title: `${mod.title} — notes`,
    theory: [
      `${mod.goal} Read the ten notes in order; each one is a submodule you will be tested on.`,
      ...mod.notes,
      `Project: ${mod.project}`,
    ],
    questions: [
      MCQ(q1.q, q1.a, q1.options, q1.why),
      MCQ(q2.q, q2.a, q2.options, q2.why),
      MATCH(
        `${mod.title}: pair each term with what it does`,
        mod.terms.map(([left, right]) => ({ left, right })),
        mod.notes[0]
      ),
    ],
  };

  const workshop: CourseLesson = {
    id: `${mod.id}-workshop`,
    title: `${mod.workshop.title} — workshop`,
    theory: [
      `Workshop: ${mod.workshop.title}. Build the steps in order — each one is a decision a real pipeline makes.`,
    ],
    questions: mod.workshop.steps.map((step) => BUILD(step.prompt, step.chain, step.bank, step.why)),
  };

  const lab: CourseLesson = {
    id: `${mod.id}-lab`,
    title: `${mod.title} — lab`,
    theory: [
      mod.lab.intro,
      'The editor runs real JavaScript and grades your function against the assertions on the right. A starter that already passes would teach nothing, so every lab begins unsolved.',
    ],
    questions: [
      CODE(mod.lab.prompt, { language: 'js', starter: mod.lab.starter, tests: mod.lab.tests }, mod.lab.solution, mod.lab.tests[0]?.hint ?? 'Run the tests and read the failing label — it names the exact gap.'),
      MCQ(q3.q, q3.a, q3.options, q3.why),
      MCQ(q4.q, q4.a, q4.options, q4.why),
    ],
  };

  const quiz: CourseLesson = {
    id: `${mod.id}-quiz`,
    title: `${mod.title} — quiz`,
    theory: [
      `Checkpoint for ${mod.title}. The first four items resurface this module's core decisions — retrieval now, not rereading — and the last one asks you to produce the rule in your own words.`,
    ],
    questions: [
      MCQ(q1.q, q1.a, q1.options, q1.why),
      MCQ(q2.q, q2.a, q2.options, q2.why),
      MCQ(q3.q, q3.a, q3.options, q3.why),
      MCQ(q4.q, q4.a, q4.options, q4.why),
      TEXT(mod.text.prompt, mod.text.answers, mod.text.why, { placeholder: mod.text.hint }),
    ],
  };

  return {
    [notes.id]: notes,
    [workshop.id]: workshop,
    [lab.id]: lab,
    [quiz.id]: quiz,
  };
}

/** Merge every module of a tier, failing loudly on a duplicate id. */
export function buildTier(modules: AiModule[]): Record<string, CourseLesson> {
  const out: Record<string, CourseLesson> = {};
  for (const mod of modules) {
    for (const [id, lesson] of Object.entries(buildModule(mod))) {
      if (out[id]) throw new Error(`AI/ML duplicate lesson id: ${id}`);
      out[id] = lesson;
    }
  }
  return out;
}
