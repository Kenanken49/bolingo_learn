import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_KEY = 'bolingo.soundOn';
const HAPTICS_KEY = 'bolingo.hapticsOn';

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
