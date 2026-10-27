import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_KEY = 'bolingo.soundOn';
const HAPTICS_KEY = 'bolingo.hapticsOn';
const MINUTES_KEY = 'bolingo.dailyMinutes';

export const DAILY_MINUTES_OPTIONS = [5, 10, 15, 20] as const;

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
