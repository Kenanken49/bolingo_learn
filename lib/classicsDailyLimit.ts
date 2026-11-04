import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Premium classics shelf: one book download per day.
 *
 * A download day is a local calendar day on the device. The first successful
 * download stamps the day; re-downloading or resuming that same book stays
 * free, everything already offline stays free, and a different book unlocks
 * the next day.
 */

const KEY = 'bolingo.classics.dailyDownload';

export interface DailyDownload {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  slug: string;
  title: string;
}

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getDailyDownload(): Promise<DailyDownload | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyDownload>;
    if (typeof parsed.date !== 'string' || typeof parsed.slug !== 'string') return null;
    return { date: parsed.date, slug: parsed.slug, title: typeof parsed.title === 'string' ? parsed.title : '' };
  } catch {
    return null;
  }
}

/**
 * Whether this book may start downloading today:
 * - books already fully offline are always free (repair, not a new pick),
 * - the book stamped today may resume/repair,
 * - otherwise only when no other book was stamped today.
 */
export async function canDownloadToday(
  slug: string,
  alreadyOffline: boolean
): Promise<{ allowed: boolean; today: DailyDownload | null }> {
  if (alreadyOffline) return { allowed: true, today: await getDailyDownload() };
  const today = await getDailyDownload();
  if (!today || today.date !== todayKey()) return { allowed: true, today: null };
  if (today.slug === slug) return { allowed: true, today };
  return { allowed: false, today };
}

export async function recordDailyDownload(slug: string, title: string): Promise<DailyDownload> {
  const entry: DailyDownload = { date: todayKey(), slug, title };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(entry));
  } catch {}
  return entry;
}

export async function clearDailyDownload(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
