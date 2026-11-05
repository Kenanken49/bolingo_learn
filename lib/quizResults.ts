/** Transient per-lesson breakdown, set on finish and read by /results. Not persisted. */
export interface QuestionResult {
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  correct: boolean;
  /** Assessment sessions keep the first response; this records whether it was right. */
  firstTryCorrect?: boolean;
}

export interface LessonResult {
  lessonId: string;
  title: string;
  xpEarned: number;
  streak: number;
  correctCount: number;
  total: number;
  results: QuestionResult[];
  /** Whether the counted score cleared the session's mastery standard. */
  mastered?: boolean;
  /** First-try correct count, useful when guided retries are allowed. */
  firstTryCorrect?: number;
  /** Level-up celebration: set when the lesson's XP crossed a threshold. */
  leveledUp?: boolean;
  newLevel?: number;
  /** Lifetime XP after this lesson (drives the level-up progress bar). */
  totalXp?: number;
  /** Best consecutive-correct streak this lesson (combo loop glory). */
  bestCombo?: number;
  /** Saved on the device while offline; Smart Sync uploads it later. */
  pendingSync?: boolean;
  /** Time from the first question to submit (the Climber "Done · 4 min 12 s"). */
  durationMs?: number;
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
