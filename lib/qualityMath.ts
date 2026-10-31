/**
 * Pure quality-operations math.
 *
 * This module deliberately has no React Native, Supabase or network imports so
 * the Node quality gate can exercise the exact functions the app ships. Keep
 * it deterministic: an A/B assignment must never depend on wall-clock time,
 * insertion order, or Math.random.
 */

export type FlagType = 'release' | 'experiment' | 'ops';

export interface FlagVariant {
  key: string;
  weight: number;
  label?: string;
}

export interface FlagLike {
  key: string;
  enabled: boolean;
  rolloutPct: number;
  variants: FlagVariant[];
  type?: FlagType | string;
}

export interface FlagAssignment {
  variant: string;
  exposed: boolean;
  bucket: number;
}

/** FNV-1a, 32-bit. Stable across JS engines and app releases. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 0–99 audience bucket. Same learner + flag always lands in the same buck. */
export function bucketFor(input: string): number {
  return fnv1a(input) % 100;
}

export function variantWeightsValid(variants: FlagVariant[]): boolean {
  if (!Array.isArray(variants) || variants.length === 0) return false;
  if (variants.some((v) => !v || typeof v.key !== 'string' || !v.key)) return false;
  if (new Set(variants.map((v) => v.key)).size !== variants.length) return false;
  const total = variants.reduce((sum, v) => sum + (Number.isFinite(v.weight) ? v.weight : -1), 0);
  return Math.abs(total - 100) < 0.001;
}

/**
 * Sticky assignment. Learners outside the rollout see the first variant but
 * are NOT exposed: they must never enter an experiment's denominator.
 */
export function assignFlag(flag: FlagLike, audience: string): FlagAssignment {
  const variants = Array.isArray(flag.variants) ? flag.variants : [];
  const bucket = bucketFor(`${flag.key}:${audience || 'anonymous'}`);
  const control = variants[0]?.key ?? 'off';
  if (!flag.enabled || !variants.length) return { variant: control, exposed: false, bucket };
  if (!(flag.rolloutPct > 0)) return { variant: control, exposed: false, bucket };
  if (bucket >= Math.min(100, flag.rolloutPct)) return { variant: control, exposed: false, bucket };

  const variantBucket = bucketFor(`${flag.key}:variant:${audience || 'anonymous'}`);
  let cursor = 0;
  for (const variant of variants) {
    cursor += Math.max(0, variant.weight);
    if (variantBucket < cursor) return { variant: variant.key, exposed: true, bucket };
  }
  return { variant: variants[variants.length - 1].key, exposed: true, bucket };
}

const SENSITIVE_KEY =
  /(e-?mail|phone|password|passwd|token|secret|api[-_]?key|authorization|username|full[-_]?name|^name$|prompt|answer|transcript|free[-_]?text|question|response|address)/i;
const EMAIL_LIKE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONG_DIGITS = /\b\d{9,}\b/g;
const URL_LIKE = /https?:\/\/\S+/gi;

function sanitizeString(value: string): string {
  return value
    .replace(EMAIL_LIKE, '[redacted]')
    .replace(LONG_DIGITS, '[redacted]')
    .replace(URL_LIKE, '[url]')
    .slice(0, 240);
}

/**
 * Telemetry is observational, never a place for learner content. Drop
 * sensitive keys, scrub emails/phone-length numbers/URLs, bound depth and
 * size so a single event can never carry a transcript or a secret.
 */
export function sanitizeTelemetryProps(input: unknown, depth = 0): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || depth > 3) return {};
  const out: Record<string, unknown> = {};
  const entries = Object.entries(input as Record<string, unknown>);
  for (const [rawKey, value] of entries.slice(0, 30)) {
    const key = rawKey.slice(0, 64);
    if (!key || SENSITIVE_KEY.test(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      out[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === 'boolean') {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value
        .slice(0, 12)
        .map((item) =>
          typeof item === 'string'
            ? sanitizeString(item)
            : typeof item === 'number' && Number.isFinite(item)
              ? item
              : typeof item === 'boolean'
                ? item
                : null
        )
        .filter((item) => item !== null);
    } else if (typeof value === 'object' && depth < 2) {
      out[key] = sanitizeTelemetryProps(value, depth + 1);
    }
  }
  return out;
}

/** Error messages can carry tokens in URLs; keep the shape, drop the payload. */
export function sanitizeErrorMessage(message: unknown): string {
  const raw = typeof message === 'string' ? message : String(message ?? '');
  return raw
    .replace(EMAIL_LIKE, '[redacted]')
    .replace(URL_LIKE, '[url]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]')
    .slice(0, 280);
}

export interface GateResultLike {
  id: string;
  status: 'passed' | 'failed' | 'skipped' | string;
  required?: boolean;
  durationMs?: number;
}

export interface GateSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  status: 'passed' | 'failed' | 'warn' | 'not_run';
}

export function summarizeGates(gates: GateResultLike[]): GateSummary {
  const summary: GateSummary = {
    total: gates.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    status: 'not_run',
  };
  for (const gate of gates) {
    if (gate.status === 'passed') summary.passed += 1;
    else if (gate.status === 'failed') summary.failed += 1;
    else summary.skipped += 1;
  }
  if (gates.length === 0) return summary;
  const requiredFailure = gates.some((g) => g.status === 'failed' && g.required !== false);
  if (requiredFailure) summary.status = 'failed';
  else if (summary.failed > 0 || summary.skipped > 0) summary.status = 'warn';
  else summary.status = 'passed';
  return summary;
}

export interface HealthInput {
  crashFreePct?: number | null;
  p95LatencyMs?: number | null;
  latestGateStatus?: string | null;
  pendingApprovals?: number;
  hasTelemetry?: boolean;
}

export interface HealthResult {
  score: number;
  status: 'healthy' | 'watch' | 'critical' | 'unknown';
  reasons: string[];
}

/**
 * A deterministic platform health score, computed from observed metrics only.
 * The AI engineer may explain this number but never sets it.
 */
export function computePlatformHealth(input: HealthInput): HealthResult {
  const reasons: string[] = [];
  const hasSignal =
    input.hasTelemetry === true ||
    typeof input.crashFreePct === 'number' ||
    typeof input.latestGateStatus === 'string';
  if (!hasSignal) {
    return { score: 60, status: 'unknown', reasons: ['No telemetry or gate run has been published yet.'] };
  }

  let score = 100;
  if (input.hasTelemetry !== true) {
    score -= 15;
    reasons.push('No session telemetry is available for this window.');
  }
  const crash = input.crashFreePct;
  if (typeof crash === 'number') {
    if (crash < 95) {
      score -= 40;
      reasons.push(`Crash-free sessions are ${crash.toFixed(1)}% (floor 99%).`);
    } else if (crash < 97) {
      score -= 30;
      reasons.push(`Crash-free sessions are ${crash.toFixed(1)}%.`);
    } else if (crash < 99) {
      score -= 15;
      reasons.push(`Crash-free sessions are ${crash.toFixed(1)}%, below the 99% target.`);
    }
  }

  const p95 = input.p95LatencyMs;
  if (typeof p95 === 'number' && p95 > 0) {
    if (p95 > 4000) {
      score -= 20;
      reasons.push(`p95 interaction latency is ${Math.round(p95)} ms (ceiling 2500 ms).`);
    } else if (p95 > 2500) {
      score -= 10;
      reasons.push(`p95 interaction latency is ${Math.round(p95)} ms.`);
    }
  }

  const gate = input.latestGateStatus;
  if (gate === 'failed') {
    score -= 25;
    reasons.push('The latest published quality run has a required gate failure.');
  } else if (gate === 'warn') {
    score -= 10;
    reasons.push('The latest quality run completed with warnings.');
  } else if (!gate) {
    score -= 10;
    reasons.push('No quality run has been published for this build.');
  }

  if ((input.pendingApprovals ?? 0) > 5) {
    score -= 5;
    reasons.push(`${input.pendingApprovals} engineering approvals are waiting.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status: HealthResult['status'] =
    score < 70 || (typeof crash === 'number' && crash < 95) || gate === 'failed'
      ? 'critical'
      : input.hasTelemetry !== true
        ? 'watch'
        : score < 90 || gate === 'warn'
          ? 'watch'
          : 'healthy';
  if (reasons.length === 0) reasons.push('All published signals are inside their targets.');
  return { score, status, reasons };
}
