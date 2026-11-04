import type { CourseQuestion } from './quizBank';

/**
 * Squad Cup: live team quiz battles over Supabase Realtime. Players join a
 * private six-letter squad code (classmates, friends), pick a team, and the
 * host starts the round. Every device derives the same questions from the
 * round seed, so there is no game server. No chat, no strangers.
 * Pure module, tested by the gate.
 */
export const CUP_QUESTIONS = 8;
export const QUESTION_MS = 20_000;
export const TEAMS = [
  { id: 'A', name: 'Kilimanjaro Kites', color: '#FF8A3D' },
  { id: 'B', name: 'Tsavo Tigers', color: '#38C6A0' },
] as const;
export type TeamId = (typeof TEAMS)[number]['id'];

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeCupCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCupCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function isCupCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/** Deterministic PRNG so every player sees the same round. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CupQuestion {
  prompt: string;
  options: string[];
  answer: string;
}

/** Multiple-choice questions only: one correct answer among 3+ distinct options. */
export function isCupEligible(q: CourseQuestion): boolean {
  if (q.kind && q.kind !== 'tokens') return false;
  if (q.correctChain.length !== 1) return false;
  const opts = new Set(q.scrambledTokens);
  return opts.size >= 3 && opts.has(q.correctChain[0]) && q.prompt.length <= 160;
}

export function pickCupQuestions(pool: CourseQuestion[], seed: number, n = CUP_QUESTIONS): CupQuestion[] {
  const eligible = pool.filter(isCupEligible);
  const rand = mulberry32(seed);
  const idx = eligible.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => {
    const q = eligible[i];
    const options = Array.from(new Set(q.scrambledTokens)).slice(0, 4);
    if (!options.includes(q.correctChain[0])) options[options.length - 1] = q.correctChain[0];
    for (let k = options.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [options[k], options[j]] = [options[j], options[k]];
    }
    return { prompt: q.prompt, options, answer: q.correctChain[0] };
  });
}

/** 100 for a right answer plus up to 50 for speed; nothing for a wrong one. */
export function scoreAnswer(correct: boolean, msLeft: number, windowMs = QUESTION_MS): number {
  if (!correct) return 0;
  const left = Math.max(0, Math.min(windowMs, msLeft));
  return 100 + Math.round((left / windowMs) * 50);
}

export interface CupPlayer {
  key: string;
  name: string;
  team: TeamId;
  joinedAt: number;
  score: number;
}

/** Host = earliest joiner (ties by key), so every device agrees without a server. */
export function cupHost(players: CupPlayer[]): string | null {
  const sorted = [...players].sort((a, b) => a.joinedAt - b.joinedAt || a.key.localeCompare(b.key));
  return sorted[0]?.key ?? null;
}

/** Team score = average per player, so a team of 2 can beat a team of 4. */
export function teamTotals(players: CupPlayer[]): Record<TeamId, { total: number; players: number; average: number }> {
  const out = { A: { total: 0, players: 0, average: 0 }, B: { total: 0, players: 0, average: 0 } };
  for (const p of players) {
    const t = out[p.team];
    if (!t) continue;
    t.total += p.score;
    t.players += 1;
  }
  for (const t of Object.values(out)) t.average = t.players ? Math.round(t.total / t.players) : 0;
  return out;
}

/** Which question is live at `now`, given the shared start time. */
export function cupClock(startAt: number, now: number, n = CUP_QUESTIONS): { index: number; msLeft: number; done: boolean } {
  if (now < startAt) return { index: -1, msLeft: startAt - now, done: false };
  const i = Math.floor((now - startAt) / QUESTION_MS);
  if (i >= n) return { index: n, msLeft: 0, done: true };
  return { index: i, msLeft: QUESTION_MS - ((now - startAt) % QUESTION_MS), done: false };
}
