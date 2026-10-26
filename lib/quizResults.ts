/** Transient per-lesson breakdown, set on finish and read by /results. Not persisted. */
export interface QuestionResult {
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  correct: boolean;
}

export interface LessonResult {
  lessonId: string;
  title: string;
  xpEarned: number;
  streak: number;
  correctCount: number;
  total: number;
  results: QuestionResult[];
}

let current: LessonResult | null = null;

export function setLessonResult(r: LessonResult): void {
  current = r;
}

export function getLessonResult(): LessonResult | null {
  return current;
}

export function clearLessonResult(): void {
  current = null;
}
