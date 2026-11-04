import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';/**
 * Platform appearance. The dashboard redesign ships light-first (matching
 * the approved wireframe); Dark stays available via the sun/moon toggle.
 */

export type ThemeName = 'light' | 'dark';

// New key: the dashboard redesign ships light, so an older saved choice
// must not keep a previous palette on upgraded installs.
const KEY = 'bolingo.theme.dashboard';

let current: ThemeName = 'light';
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
