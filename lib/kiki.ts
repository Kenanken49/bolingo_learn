/**
 * Kiki v3 — Bolingo's Birdbrain: adaptive difficulty + memory model.
 *
 * Five roles, one tiny online learner (no servers, no batch jobs):
 *  1. Predicting Exercise Difficulty — p(correct) = sigmoid(skill - difficulty),
 *     estimated BEFORE the learner attempts the exercise.
 *  2. The "Goldilocks" Challenge — recommendNext() picks the candidate whose
 *     predicted success is closest to 79%: engaging, never boring or crushing.
 *  3. Real-Time Profile Updates — every graded answer moves BOTH the skill
 *     estimate and that exercise's difficulty estimate, immediately.
 *  4. Memory Tracking (Half-Life Regression) — per-item half-life h (days):
 *     recall(t) = 2^(-t/h). Correct recalls stretch h, misses shrink it, so
 *     reviews land right before the memory fades.
 *  5. A 40-Dimensional Profile — 10 skills × 4 facets (accuracy, retention,
 *     consistency, growth) instead of one flat score.
 *
 * Pure functions + plain JSON state: runs on device, in tests, anywhere.
 * Persistence (device + Supabase sync) lives in lib/kikiStore.ts.
 */

export const KIKI_VERSION = 3;
/** Sweet spot of difficulty: ~79% predicted chance of success. */
export const GOLDILOCKS_P = 0.79;

export const SKILLS = [
  'html',
  'css',
  'js',
  'fed',
  'db',
  'be',
  'py',
  'secml',
  'lang',
  'core',
] as const;
export type SkillId = (typeof SKILLS)[number];

export const FACETS = ['accuracy', 'retention', 'consistency', 'growth'] as const;
export type Facet = (typeof FACETS)[number];

/** Dominant-skill routing: every lesson feeds exactly one skill. */
export function skillOfLesson(lessonId: string): SkillId {
  const id = lessonId.toLowerCase();
  if (/(^|-)html/.test(id)) return 'html';
  if (/(^|-)css/.test(id) || /(^|-)rwd/.test(id)) return 'css';
  if (/(^|-)js/.test(id)) return 'js';
  if (/(^|-)fed/.test(id)) return 'fed';
  if (/(^|-)db/.test(id)) return 'db';
  if (/(^|-)be/.test(id)) return 'be';
  if (/(^|-)py/.test(id)) return 'py';
  if (/(^|-)sec/.test(id) || /(^|-)ml/.test(id)) return 'secml';
  if (/spanish|french|german|swahili|english|chess|lang/.test(id)) return 'lang';
  return 'core';
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Predicted probability the learner answers correctly — BEFORE attempting. */
export function predict(skill: number, difficulty: number): number {
  return sigmoid(skill - difficulty);
}

export interface KikiMemory {
  skill: SkillId;
  /** Half-life in days: recall(t) = 2^(-daysSince/h). */
  h: number;
  lastSeen: number;
  views: number;
  hits: number;
}

export interface KikiState {
  skills: Record<string, number>;
  diffs: Record<string, number>;
  mem: Record<string, KikiMemory>;
  log: Record<string, Array<{ t: number; c: 0 | 1 }>>;
  savedAt?: number;
}

export function blankState(): KikiState {
  return { skills: {}, diffs: {}, mem: {}, log: {} };
}

const K_SKILL = 0.25;
const K_DIFF = 0.06;
const DAY_MS = 86400 * 1000;

/**
 * Grade one attempt: returns the prediction made BEFORE seeing the outcome,
 * then updates skill + difficulty + memory in place. Never throws.
 */
export function recordAttempt(
  s: KikiState,
  skill: SkillId,
  key: string,
  correct: boolean,
  now = Date.now(),
): { p: number } {
  try {
    const sk = s.skills[skill] ?? 0;
    const d = s.diffs[key] ?? 0;
    const p = predict(sk, d);
    const err = (correct ? 1 : 0) - p;
    s.skills[skill] = clamp(sk + K_SKILL * err, -4, 4);
    s.diffs[key] = clamp(d - K_DIFF * err, -4, 4);
    const m: KikiMemory = s.mem[key] ?? { skill, h: 1, lastSeen: now, views: 0, hits: 0 };
    m.views += 1;
    if (correct) {
      m.hits += 1;
      m.h = Math.min(90, m.h * 1.7);
    } else {
      m.h = Math.max(0.2, m.h * 0.35);
    }
    m.lastSeen = now;
    s.mem[key] = m;
    const arr = (s.log[skill] ??= []);
    arr.push({ t: now, c: correct ? 1 : 0 });
    if (arr.length > 60) arr.splice(0, arr.length - 60);
    return { p };
  } catch {
    return { p: 0.5 };
  }
}

/** Predicted recall right now for one memory (half-life decay). */
export function recallAt(m: KikiMemory, now = Date.now()): number {
  const days = Math.max(0, (now - m.lastSeen) / DAY_MS);
  return Math.pow(2, -days / Math.max(0.05, m.h));
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5);

/** One facet value in [0,1] for a skill (0.5 = no data yet). */
export function facetValue(s: KikiState, skill: SkillId, facet: Facet, now = Date.now()): number {
  try {
    const events = s.log[skill] ?? [];
    if (facet === 'accuracy') return events.length ? mean(events.slice(-20).map((e) => e.c)) : 0.5;
    if (facet === 'retention') {
      const items = Object.values(s.mem).filter((m) => m.skill === skill);
      return items.length ? mean(items.map((m) => recallAt(m, now))) : 0.5;
    }
    if (facet === 'consistency') {
      const last = events.slice(-10).map((e) => e.c);
      if (last.length < 3) return 0.5;
      const m = mean(last);
      const variance = mean(last.map((c) => (c - m) * (c - m)));
      return clamp(1 - Math.sqrt(variance) * 1.4, 0, 1);
    }
    // growth: recent accuracy minus older accuracy, centered at 0.5
    const recent = mean(events.slice(-10).map((e) => e.c));
    const older = events.length > 10 ? mean(events.slice(-20, -10).map((e) => e.c)) : 0.5;
    return events.length < 4 ? 0.5 : clamp(0.5 + (recent - older), 0, 1);
  } catch {
    return 0.5;
  }
}

/** Full 40-dimensional profile: 10 skills × 4 facets, all in [0,1]. */
export function profile40(s: KikiState, now = Date.now()): { dims: number[]; labels: string[] } {
  const dims: number[] = [];
  const labels: string[] = [];
  for (const skill of SKILLS) {
    for (const facet of FACETS) {
      dims.push(facetValue(s, skill, facet, now));
      labels.push(`${skill}:${facet}`);
    }
  }
  return { dims, labels };
}

export interface Candidate {
  id: string;
  /** Current difficulty estimate (0 = unseen). */
  diff: number;
}

/**
 * Goldilocks pick: the candidate whose predicted success is closest to 79%.
 * Ties break toward the easier item (confidence first).
 */
export function recommendNext(
  s: KikiState,
  skill: SkillId,
  candidates: Candidate[],
): { id: string; p: number } | null {
  if (!candidates.length) return null;
  const sk = s.skills[skill] ?? 0;
  let best = candidates[0];
  let bestScore = Math.abs(predict(sk, best.diff) - GOLDILOCKS_P);
  for (const c of candidates.slice(1)) {
    const score = Math.abs(predict(sk, c.diff) - GOLDILOCKS_P);
    if (score < bestScore - 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && c.diff < best.diff)) {
      best = c;
      bestScore = score;
    }
  }
  return { id: best.id, p: predict(sk, best.diff) };
}

/** Least-recalled items first — the smart-review shortlist. */
export function reviewShortlist(s: KikiState, limit = 5, now = Date.now()): string[] {
  return Object.entries(s.mem)
    .map(([key, m]) => ({ key, r: recallAt(m, now) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map((e) => e.key);
}
