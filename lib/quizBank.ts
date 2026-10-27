/**
 * Quiz bank primitives — one owner for question shape.
 * courses.ts (code curriculum) and languages.ts (World Languages & Chess)
 * both build banks with these helpers; the quiz engine, SRS, and guidebook
 * only ever see CourseLesson via getCourseLesson().
 */

export interface CourseQuestion {
  prompt: string;
  correctChain: string[];
  scrambledTokens: string[];
  explain?: string;
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
    const bank = [...q.scrambledTokens];
    for (const t of q.correctChain) {
      const k = bank.indexOf(t);
      if (k === -1) throw new Error(`${tag}: chain token ${JSON.stringify(t)} missing from bank — unsolvable.`);
      bank.splice(k, 1);
    }
    if (typeof q.explain !== 'string' || q.explain.trim().length === 0) {
      throw new Error(`${tag}: missing explain (every answer must teach).`);
    }
  });
}
