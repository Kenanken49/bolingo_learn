import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Platform appearance. QD-OLED (true black + quantum-dot colour) is the
 * product default; Light stays available as an accessibility option.
 */
export type ThemeName = 'light' | 'dark';

// New key: the QD-OLED redesign ships as the default, so an older saved
// light choice must not keep the old palette on upgraded installs.
const KEY = 'bolingo.theme.qdoled';

let current: ThemeName = 'dark';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Read once at startup so the saved mode wins before first paint. */
export async function initTheme(): Promise<ThemeName> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'dark' || v === 'light') current = v;
  } catch {}
  emit();
  return current;
}

export function getTheme(): ThemeName {
  return current;
}

export async function setTheme(next: ThemeName): Promise<void> {
  if (next === current) return;
  current = next;
  emit();
  try {
    await AsyncStorage.setItem(KEY, next);
  } catch {}
}

function snapshot(): ThemeName {
  return current;
}

/** Live theme hook — every screen re-renders the moment the mode flips. */
export function useTheme(): [ThemeName, (next: ThemeName) => void] {
  const theme = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [theme, (next) => void setTheme(next)];
}
