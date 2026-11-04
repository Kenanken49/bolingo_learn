/**
 * Progress maths behind the per-tier home cards and "lesson complete" cards
 * from the adaptive wireframes (WF-T2-01 week chart, WF-T3-01 monthly
 * consistency, WF-T3-04 forecast finish date, the "Same moment" payoffs).
 *
 * Inputs are real activity timestamps (lesson completions and XP events), so
 * nothing here is a placeholder. Pure module: no React Native imports, so
 * `scripts/check-adaptive-ai.cjs` runs it under Node.
 */

const DAY_MS = 86_400_000;

/** Local calendar key, e.g. "2026-11-04". */
export function localDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Distinct local days with any activity. */
export function activeDays(dates: Date[]): Set<string> {
  return new Set(dates.filter((d) => !Number.isNaN(d.getTime())).map(localDayKey));
}

export interface WeekBar {
  /** Single-letter weekday label, Monday first. */
  label: string;
  /** Activity events that day. */
  count: number;
  today: boolean;
  future: boolean;
}

/** Monday-to-Sunday activity for the current local week. */
export function weekBars(dates: Date[], now: Date = new Date()): WeekBar[] {
  const today = startOfDay(now);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const counts = new Map<string, number>();
  for (const d of dates) {
    if (Number.isNaN(d.getTime())) continue;
    const k = localDayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const k = localDayKey(day);
    return { label, count: counts.get(k) ?? 0, today: k === localDayKey(today), future: day.getTime() > today.getTime() };
  });
}

const isWeekday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;

export interface MonthConsistency {
  /** Weekdays this month (up to today) with any activity. */
  active: number;
  /** Weekdays this month so far, including today. */
  soFar: number;
  /** Active weekdays in the whole previous month. */
  lastMonth: number;
}

/**
 * Consistency counted per month on weekdays, so one busy day never resets
 * anything (the Climber guardrail). Weekends are never required.
 */
export function monthConsistency(dates: Date[], now: Date = new Date()): MonthConsistency {
  const days = activeDays(dates);
  const today = startOfDay(now);
  let active = 0;
  let soFar = 0;
  for (let d = new Date(today.getFullYear(), today.getMonth(), 1); d <= today; d = new Date(d.getTime() + DAY_MS)) {
    d = startOfDay(d);
    if (!isWeekday(d)) continue;
    soFar++;
    if (days.has(localDayKey(d))) active++;
  }
  let lastMonth = 0;
  const end = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let d = new Date(today.getFullYear(), today.getMonth() - 1, 1); d < end; d = new Date(d.getTime() + DAY_MS)) {
    d = startOfDay(d);
    if (isWeekday(d) && days.has(localDayKey(d))) lastMonth++;
  }
  return { active, soFar, lastMonth };
}

/** One honest sentence for the Climber home footer. */
export function consistencyLine(c: MonthConsistency, monthName: string, lastMonthName: string): string {
  if (c.soFar === 0) return `A new month. Any weekday you learn counts toward ${monthName}.`;
  if (c.active === 0) return `Any weekday you learn this month counts. Nothing resets.`;
  if (c.lastMonth > 0 && c.active === c.lastMonth) return `One more weekday and ${monthName} beats ${lastMonthName}.`;
  if (c.lastMonth > 0 && c.active > c.lastMonth) return `${monthName} already beats ${lastMonthName}.`;
  return `Counted per month, so a busy day never resets anything.`;
}

/**
 * Forecast finish date from real pace: items finished over the last
 * `windowDays` days, extrapolated over what is left. Null when there is no
 * recent pace to extrapolate from, or nothing left to do.
 */
export function forecastFinish(remaining: number, dates: Date[], now: Date = new Date(), windowDays = 28): Date | null {
  if (remaining <= 0) return null;
  const since = now.getTime() - windowDays * DAY_MS;
  const recent = dates.filter((d) => d.getTime() >= since && d.getTime() <= now.getTime()).length;
  if (recent === 0) return null;
  const perDay = recent / windowDays;
  return new Date(startOfDay(now).getTime() + Math.ceil(remaining / perDay) * DAY_MS);
}

/** "4 min 12 s", "45 s". */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
}

/** Whole-number percentage, clamped. */
export function pctOf(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}
