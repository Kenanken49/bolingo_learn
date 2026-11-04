import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { isLifeStageId, type LifeStageId } from './lifeStage';

/**
 * On-device persistence for the learner's life stage. Works for guests, so
 * the adaptive UI applies before an account exists. A change is broadcast
 * to every mounted `useLifeStage` so the home hub updates immediately.
 */
const K_STAGE = 'bolingo.lifeStage.v1';

type Listener = (stage: LifeStageId | null) => void;
const listeners = new Set<Listener>();
let cached: LifeStageId | null | undefined;

export async function getLifeStage(): Promise<LifeStageId | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await AsyncStorage.getItem(K_STAGE);
    cached = isLifeStageId(raw) ? raw : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function setLifeStage(stage: LifeStageId | null): Promise<void> {
  cached = stage;
  try {
    if (stage) await AsyncStorage.setItem(K_STAGE, stage);
    else await AsyncStorage.removeItem(K_STAGE);
  } catch {}
  listeners.forEach((fn) => fn(stage));
}

/** `ready` is false until storage has been read, so screens don't flash the picker. */
export function useLifeStage(): {
  stage: LifeStageId | null;
  ready: boolean;
  setStage: (stage: LifeStageId | null) => Promise<void>;
} {
  const [stage, setStageState] = useState<LifeStageId | null>(cached ?? null);
  const [ready, setReady] = useState(cached !== undefined);

  useEffect(() => {
    let alive = true;
    void getLifeStage().then((s) => {
      if (!alive) return;
      setStageState(s);
      setReady(true);
    });
    const fn: Listener = (s) => setStageState(s);
    listeners.add(fn);
    return () => {
      alive = false;
      listeners.delete(fn);
    };
  }, []);

  const setStage = useCallback((s: LifeStageId | null) => setLifeStage(s), []);
  return { stage, ready, setStage };
}
