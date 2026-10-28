import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_KEY = 'bolingo.soundOn';
const HAPTICS_KEY = 'bolingo.hapticsOn';
const MINUTES_KEY = 'bolingo.dailyMinutes';
const COURSE_KEY = 'bolingo.selectedCourse';
const WEEKLY_KEY = 'bolingo.weeklyDays';

export const DAILY_MINUTES_OPTIONS = [5, 10, 15, 20] as const;
/** Codecademy-style weekly target: gentler than a strict daily streak. */
export const WEEKLY_DAYS_OPTIONS = [3, 5, 7] as const;

/** Duolingo-style daily commitment (default 10). Drives the projected outcome line. */
export async function getDailyMinutes(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(MINUTES_KEY);
    const n = Number(v);
    return (DAILY_MINUTES_OPTIONS as readonly number[]).includes(n) ? n : 10;
  } catch {
    return 10;
  }
}

export async function setDailyMinutes(min: number): Promise<void> {
  try {
    await AsyncStorage.setItem(MINUTES_KEY, String(min));
  } catch {}
}

/** Weekly practice target, days per week (default 5). */
export async function getWeeklyDays(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(WEEKLY_KEY);
    const n = Number(v);
    return (WEEKLY_DAYS_OPTIONS as readonly number[]).includes(n) ? n : 5;
  } catch {
    return 5;
  }
}

export async function setWeeklyDays(days: number): Promise<void> {
  try {
    await AsyncStorage.setItem(WEEKLY_KEY, String(days));
  } catch {}
}

/** Projected outcome shown at commitment time (Duolingo onboarding pattern). */
export function outcomeForMinutes(min: number): string {
  if (min <= 5) return 'Finish your first course section in ~6 weeks.';
  if (min <= 10) return 'Hold a basic conversation in ~3 months.';
  if (min <= 15) return 'Finish a full course in ~3 months.';
  return 'Reach checkpoint-ready fluency in ~2 months.';
}

/** Persisted juicy-feedback toggles (Settings screen). Defaults ON. */
export async function getSoundOn(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SOUND_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export async function setSoundOn(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {}
}

export async function getHapticsOn(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(HAPTICS_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export async function setHapticsOn(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HAPTICS_KEY, on ? '1' : '0');
  } catch {}
}

/** Duolingo-style course picker: null = all-courses grid, else one course path. */
export async function getSelectedCourse(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(COURSE_KEY);
    return v || null;
  } catch {
    return null;
  }
}

export async function setSelectedCourse(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(COURSE_KEY, id);
    else await AsyncStorage.removeItem(COURSE_KEY);
  } catch {}
}
