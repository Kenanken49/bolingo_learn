/**
 * Hybrid monetization engine — the one place that says what is free and
 * what is Premium.
 *
 * Free is the hook (core knowledge stays unlimited); Premium is the
 * accelerator. Screens ask `canUse(feature, isPremium)` instead of
 * hard-coding `is_premium` checks, and the paywall renders its comparison
 * table from `FEATURES`, so the two can never disagree.
 *
 * Pure module (no React Native imports) — exercised by
 * `scripts/check-adaptive-ai.cjs`.
 */

export type FeatureId =
  | 'core_curriculum'
  | 'hearts'
  | 'uploads'
  | 'scan_notes'
  | 'audiobook'
  | 'upload_ai_words'
  | 'ai_tutor_text'
  | 'community'
  | 'ai_tutor_voice'
  | 'immersive_labs'
  | 'career_fast_pass'
  | 'offline_tutor'
  | 'offline_model';

export type Plan = 'free' | 'premium';

export interface FeatureSpec {
  id: FeatureId;
  label: string;
  icon: string;
  /** Short value shown in the paywall's FREE column. */
  free: string;
  /** Short value shown in the paywall's PRO column. */
  premium: string;
  /** Who may use it at all. */
  availableTo: Plan[];
  /** `soon` = designed but not built yet; never gate a learner on it. */
  status: 'live' | 'soon';
}

/** Free learners get this many AI tutor tokens per local day. */
export const FREE_DAILY_AI_TOKENS = 4000;
/** Rough cost of one tutor exchange (question + context + reply). */
export const AI_TOKENS_PER_EXCHANGE_ESTIMATE = 400;

export const FEATURES: FeatureSpec[] = [
  { id: 'core_curriculum', label: 'Lessons & labs', icon: 'book', free: 'Unlimited', premium: 'Unlimited', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'hearts', label: 'Hearts', icon: 'heart', free: '5, regen 4h', premium: 'Unlimited', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'uploads', label: 'Uploads', icon: 'doc', free: 'Text ≤1k', premium: 'All formats', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'scan_notes', label: 'Scan notes', icon: 'camera', free: '—', premium: 'Included', availableTo: ['premium'], status: 'live' },
  { id: 'audiobook', label: 'Audiobook', icon: 'headset', free: 'Device voice', premium: 'Generated', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'upload_ai_words', label: 'AI words', icon: 'robot', free: '1k / file', premium: '100k / 30d', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'ai_tutor_text', label: 'AI tutor (text)', icon: 'chat', free: `~${Math.round(FREE_DAILY_AI_TOKENS / AI_TOKENS_PER_EXCHANGE_ESTIMATE)} / day`, premium: 'Unlimited', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'community', label: 'Study rooms & Squad Cup', icon: 'users', free: 'Included', premium: 'Included', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'ai_tutor_voice', label: 'Roleplay', icon: 'mic', free: 'Locked', premium: 'Included', availableTo: ['premium'], status: 'live' },
  { id: 'immersive_labs', label: 'AR/VR simulations', icon: 'flask', free: '—', premium: 'Soon', availableTo: ['premium'], status: 'soon' },
  { id: 'career_fast_pass', label: 'Career Fast-Pass', icon: 'briefcase', free: '—', premium: 'Soon', availableTo: ['premium'], status: 'soon' },
  { id: 'offline_tutor', label: 'Offline tutor', icon: 'download', free: 'Lesson search', premium: 'Lesson search', availableTo: ['free', 'premium'], status: 'live' },
  { id: 'offline_model', label: 'On-device AI model', icon: 'phone', free: '—', premium: 'Download', availableTo: ['premium'], status: 'live' },
];

/** Paywall rows: what ships today first, then what is coming. */
export function paywallRows(): { live: FeatureSpec[]; soon: FeatureSpec[] } {
  return {
    live: FEATURES.filter((f) => f.status === 'live'),
    soon: FEATURES.filter((f) => f.status === 'soon'),
  };
}

export function featureSpec(id: FeatureId): FeatureSpec {
  const spec = FEATURES.find((f) => f.id === id);
  if (!spec) throw new Error(`Unknown feature ${id}`);
  return spec;
}

export function planOf(isPremium: boolean | null | undefined): Plan {
  return isPremium === true ? 'premium' : 'free';
}

/** Can this learner use the feature right now? Unbuilt features are never "usable". */
export function canUse(id: FeatureId, isPremium: boolean | null | undefined): boolean {
  const spec = featureSpec(id);
  return spec.status === 'live' && spec.availableTo.includes(planOf(isPremium));
}

/** Local calendar day key, e.g. 2026-11-04 — the free AI budget resets at local midnight. */
export function budgetDay(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Cheap, deterministic token estimate (~4 characters per token). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export interface AiBudgetState {
  day: string;
  used: number;
}

export interface AiBudgetView {
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}

/** Resolve a stored counter against today: yesterday's usage never carries over. */
export function normalizeBudget(state: AiBudgetState | null | undefined, today: string): AiBudgetState {
  if (!state || state.day !== today || !Number.isFinite(state.used) || state.used < 0) {
    return { day: today, used: 0 };
  }
  return { day: today, used: Math.floor(state.used) };
}

export function budgetView(state: AiBudgetState, isPremium: boolean | null | undefined): AiBudgetView {
  if (isPremium === true) {
    return { unlimited: true, used: state.used, limit: Infinity, remaining: Infinity, exhausted: false };
  }
  const remaining = Math.max(0, FREE_DAILY_AI_TOKENS - state.used);
  return { unlimited: false, used: state.used, limit: FREE_DAILY_AI_TOKENS, remaining, exhausted: remaining <= 0 };
}

export function spendBudget(state: AiBudgetState, tokens: number): AiBudgetState {
  const add = Number.isFinite(tokens) && tokens > 0 ? Math.ceil(tokens) : 0;
  return { day: state.day, used: state.used + add };
}
