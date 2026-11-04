/**
 * Offline Premium lease — how long a downloaded model may keep running
 * without the device confirming the subscription online.
 *
 * Premium is only ever confirmed online. Each confirmation writes a lease
 * that ends at the earlier of:
 *  - the paid-through date we know (RevenueCat entitlement expiry or the
 *    latest confirmed M-Pesa period), plus a short renewal slack for
 *    auto-renewing store subscriptions, which usually renew while the learner
 *    is still offline; and
 *  - OFFLINE_LEASE_MAX_MS after the check, so a cancelled subscription, a
 *    refund, or a plan whose end date we could not read stops working offline
 *    within a bounded time.
 *
 * A device clock set back before the newest time the lease has seen voids
 * the lease, so rewinding the clock cannot stretch it.
 *
 * Pure module (no React Native imports) — exercised by
 * `scripts/check-adaptive-ai.cjs`.
 */

export const OFFLINE_LEASE_MAX_MS = 7 * 24 * 60 * 60 * 1000;
/** Store subscriptions that will auto-renew get this long past the period end. */
export const RENEWAL_SLACK_MS = 2 * 24 * 60 * 60 * 1000;
/** Tolerated backwards clock drift (NTP corrections, time-zone travel is not drift). */
export const CLOCK_SKEW_MS = 10 * 60 * 1000;

export interface PaidThrough {
  /** Epoch ms the current paid period ends; null = unknown or no end (lifetime). */
  until: number | null;
  /** The store will try to renew at `until`. */
  willRenew: boolean;
}

export interface PremiumLease {
  v: 1;
  /** When Premium was last confirmed online. */
  checkedAt: number;
  /** Newest device time this lease has seen (clock-rollback guard). */
  seenAt: number;
  /** Offline Premium ends at this epoch ms. */
  validUntil: number;
}

/** Build a lease from an online "yes, Premium" answer. */
export function leaseFromCheck(now: number, paid: PaidThrough): PremiumLease {
  const cap = now + OFFLINE_LEASE_MAX_MS;
  const end = paid.until == null ? cap : paid.until + (paid.willRenew ? RENEWAL_SLACK_MS : 0);
  return { v: 1, checkedAt: now, seenAt: now, validUntil: Math.min(cap, end) };
}

/** Is offline Premium still in force at `now`? */
export function leaseValid(lease: PremiumLease | null, now: number): boolean {
  if (!lease) return false;
  if (now + CLOCK_SKEW_MS < lease.seenAt) return false; // clock was rewound
  return now < lease.validUntil;
}

/** Record that the lease was consulted at `now` (only ever moves forward). */
export function touchLease(lease: PremiumLease, now: number): PremiumLease {
  return now > lease.seenAt ? { ...lease, seenAt: now } : lease;
}

export function parseLease(raw: string | null): PremiumLease | null {
  if (!raw) return null;
  try {
    const l = JSON.parse(raw) as Partial<PremiumLease>;
    if (l && l.v === 1 && [l.checkedAt, l.seenAt, l.validUntil].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      return l as PremiumLease;
    }
  } catch {}
  return null;
}

/** Combine the paid-through answers from each billing rail (store, M-Pesa). */
export function latestPaidThrough(parts: (PaidThrough | null)[]): PaidThrough {
  const known = parts.filter((p): p is PaidThrough => p != null);
  if (known.length === 0) return { until: null, willRenew: false };
  // Any rail without an end date (lifetime) means only the cap applies.
  if (known.some((p) => p.until == null)) return { until: null, willRenew: false };
  return known.reduce((best, p) => ((p.until as number) > (best.until as number) ? p : best));
}
