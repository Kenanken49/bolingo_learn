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

/** Observable question features used for cold-start priors + guess rates. */
export interface ItemFeatures {
  /** Tokens to assemble (1 = single-tap MCQ). */
  chainLen: number;
  /** True for drag-and-drop BUILD, false for single-tap MCQ. */
  isBuild: boolean;
}

/** Cold-start difficulty prior: longer builds start harder, MCQs easier. */
export function priorDifficulty(f?: ItemFeatures): number {
  if (!f) return 0;
  const chain = Math.max(1, Math.floor(f.chainLen));
  return clamp(0.12 * (chain - 1) + (f.isBuild ? 0.2 : 0) - 0.15, -1.5, 1.5);
}

/** Lucky-guess rate: ~1-in-4+ on 4-option MCQ, near zero on builds. */
export function guessRate(f?: ItemFeatures): number {
  return f && f.isBuild ? 0.06 : 0.22;
}
/** Slip rate: even masters fat-finger ~8%. */
export function slipRate(): number {
  return 0.08;
}

/** Observed success probability after guess/slip (BKT-style). */
export function predictObserved(skill: number, difficulty: number, f?: ItemFeatures): number {
  const p = predict(skill, difficulty);
  const g = guessRate(f);
  const s = slipRate();
  return p * (1 - s) + (1 - p) * g;
}

/** Predicted probability the learner answers correctly — BEFORE attempting. */
export function predict(skill: number, difficulty: number): number {
  return sigmoid(skill - difficulty);
}

export interface KikiMemory {
  skill: SkillId;
  /** Stability in days (FSRS-lite): recall(t) = 2^(-daysSince/h). Hard-won recalls grow it fastest. */
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
  /** Attempts per skill (adaptive step sizes) + last-active timestamps (drift). */
  counts: Record<string, number>;
  seen: Record<string, number>;
  savedAt?: number;
}

export function blankState(): KikiState {
  return { skills: {}, diffs: {}, mem: {}, log: {}, counts: {}, seen: {} };
}

const DAY_MS = 86400 * 1000;

/* ---- v3.1 learning dynamics (locked by scripts/kiki-tune.cjs) ---- */
/** Base step sizes; decay toward asymptote as evidence accumulates. */
const SKILL_K0 = 0.9;
const SKILL_TAU = 8;
/** Prior strength: pseudo-observations anchoring a new skill to its prior. */
const PRIOR_N = 0;
const DIFF_K0 = 0.12;
const DIFF_TAU = 12;
/** Guess (MCQ 4-option slip of attention) / slip rates for BKT-style weighting. */
const GUESS = 0.2;
const SLIP = 0.08;
/** Skill prior: code skills start slightly productive, chess slightly sharp. */
function skillPrior(skill: string): number {
  return (skill === 'chess' ? 0.3 : 0.2) * 0.5;
}
/** Item prior: new exercises start a touch easier than average. */
function itemPrior(): number {
  return 0;
}
/** Idle drift: grace period before skills relax toward 0, and pull per idle month. */
const DRIFT_GRACE_DAYS = 7;
const DRIFT_PULL = 0.1;
/** FSRS-lite: stability growth per successful recall of a faint memory. */
const STAB_GAIN = 1.5;

/**
 * Idle drift: skills untouched for weeks relax toward 0 (forgetting). Applied
 * lazily on read/update — no timers, no background work. Bounded so a
 * returning learner never loses more than ~1 logit per idle month.
 */
export function applyDrift(s: KikiState, now = Date.now()): void {
  for (const k of Object.keys(s.skills)) {
    const last = s.seen[k] ?? now;
    const idleDays = Math.max(0, (now - last) / DAY_MS);
    if (idleDays > DRIFT_GRACE_DAYS) {
      const pull = Math.min(1, (idleDays - DRIFT_GRACE_DAYS) / 30) * DRIFT_PULL;
      const v = s.skills[k];
      s.skills[k] = v - Math.sign(v) * Math.min(Math.abs(v), pull);
    }
  }
}

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
    applyDrift(s, now);
    const sk = s.skills[skill] ?? skillPrior(skill);
    const d = s.diffs[key] ?? itemPrior();
    const pKnown = predict(sk, d);
    const p = pKnown;
    // Guess/slip-aware update: a miss on a near-certain item (slip) and a
    // hit on a near-impossible one (guess) carry little information.
    const g = GUESS;
    const sl = SLIP;
    const w = correct
      ? (pKnown * (1 - sl)) / Math.max(1e-6, pKnown * (1 - sl) + (1 - pKnown) * g)
      : ((1 - pKnown) * (1 - g)) / Math.max(1e-6, (1 - pKnown) * (1 - g) + pKnown * sl);
    const err = (correct ? 1 : 0) - pKnown;
    // Adaptive rate: fast for the first encounters, stable once established.
    // The prior counts as PRIOR_N pseudo-observations, so early updates stay
    // cautious and the estimate earns its confidence from real evidence.
    const n = (s.counts[skill] ?? PRIOR_N);
    const ks = SKILL_K0 / (1 + n / SKILL_TAU);
    const kd = DIFF_K0 / (1 + (s.counts['d:' + key] ?? 0) / DIFF_TAU);
    s.skills[skill] = clamp(sk + ks * w * err, -4, 4);
    s.diffs[key] = clamp(d - kd * w * err, -4, 4);
    s.counts[skill] = n + 1;
    s.counts['d:' + key] = (s.counts['d:' + key] ?? 0) + 1;
    s.seen[skill] = now;
    // FSRS-lite memory: stability from current retrievability. Recalling a
    // faint memory (low R) grows stability fastest; misses collapse it.
    const m: KikiMemory = s.mem[key] ?? { skill, h: 1, lastSeen: now, views: 0, hits: 0 };
    const gapDays = Math.max(0, (now - m.lastSeen) / DAY_MS);
    const r = recallAt(m, now);
    m.views += 1;
    if (correct) {
      m.hits += 1;
      m.h = Math.min(180, m.h * (1 + STAB_GAIN * (1 - r)) * (gapDays > m.h ? 1.2 : 1));
    } else {
      m.h = Math.max(0.15, Math.min(m.h, gapDays > 0 ? gapDays / 4 : m.h * 0.3));
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
  applyDrift(s);
  const sk = s.skills[skill] ?? skillPrior(skill);
  // Goldilocks applies to the OBSERVED win chance (slips + lucky guesses
  // included) — that is the number the learner actually experiences.
  let best = candidates[0];
  let bestScore = Math.abs(predictObserved(sk, best.diff) - GOLDILOCKS_P);
  for (const c of candidates.slice(1)) {
    const score = Math.abs(predictObserved(sk, c.diff) - GOLDILOCKS_P);
    if (score < bestScore - 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && c.diff < best.diff)) {
      best = c;
      bestScore = score;
    }
  }
  return { id: best.id, p: predictObserved(sk, best.diff) };
}

/** Least-recalled items first — the smart-review shortlist. */
export function reviewShortlist(s: KikiState, limit = 5, now = Date.now()): string[] {
  return Object.entries(s.mem)
    .map(([key, m]) => ({ key, r: recallAt(m, now) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map((e) => e.key);
}
