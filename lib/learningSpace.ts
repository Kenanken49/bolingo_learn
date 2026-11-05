import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Learning space — the wireframe's Explorer / Career Launcher / Career
 * Climber tabs, made real. The choice is persisted and reactive: the hero
 * resume target and track ordering adapt everywhere at once.
 */

export type LearningSpace = 'explorer' | 'launcher' | 'climber';

export const SPACES: { id: LearningSpace; label: string; ages: string; blurb: string }[] = [
  { id: 'explorer', label: 'Explorer', ages: 'Ages 10–18', blurb: 'Languages first · playful pace' },
  { id: 'launcher', label: 'Career Launcher', ages: 'Ages 19–25', blurb: 'Full catalog · career pace' },
  { id: 'climber', label: 'Career Climber', ages: 'Ages 26–40', blurb: 'Certifications first · bite-sized' },
];

const KEY = 'bolingo.learning-space';

let current: LearningSpace = 'launcher';
let loaded = false;
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

/** Read once at startup so the saved space wins before first paint. */
export async function initLearningSpace(): Promise<LearningSpace> {
  if (loaded) return current;
  loaded = true;
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'explorer' || v === 'launcher' || v === 'climber') current = v;
  } catch {}
  emit();
  return current;
}

export function getLearningSpace(): LearningSpace {
  return current;
}

export async function setLearningSpace(next: LearningSpace): Promise<void> {
  if (next === current) return;
  current = next;
  emit();
  try {
    await AsyncStorage.setItem(KEY, next);
  } catch {}
}

function snapshot(): LearningSpace {
  return current;
}

/** Live space hook — every subscribed screen re-renders on switch. */
export function useLearningSpace(): [LearningSpace, (next: LearningSpace) => void] {
  const space = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [space, (next) => void setLearningSpace(next)];
}
