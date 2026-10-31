import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import catalog from '../content/quality/flags.json';
import { supabase } from './supabase';
import { assignFlag, variantWeightsValid, type FlagVariant, type FlagType } from './qualityMath';
import { track } from './telemetry';

/**
 * Feature flags and A/B assignment.
 *
 * - Catalog lives in content/quality/flags.json (one source for app, SQL seed
 *   and tests). Remote rows in Supabase can change enabled/rollout/variants
 *   without a release.
 * - Assignment is deterministic and sticky via FNV-1a of `key:audience`.
 *   Never Math.random, never time-based.
 * - Only exposed learners emit experiment_exposed, so control/off audiences
 *   cannot inflate a denominator.
 */
export interface FlagDefinition {
  key: string;
  name: string;
  description: string;
  type: FlagType;
  enabled: boolean;
  rolloutPct: number;
  variants: FlagVariant[];
  metric?: string;
  hypothesis?: string;
  guardrail?: string;
}

interface RemoteFlag {
  key: string;
  enabled: boolean;
  rollout_pct: number;
  variants: unknown;
}

const CACHE_KEY = 'bolingo.flags.v1';
const AUDIENCE_KEY = 'bolingo.audienceId';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FLAG_CATALOG = catalog as FlagDefinition[];

let remote: Record<string, RemoteFlag> = {};
let loadedAt = 0;
let loading: Promise<void> | null = null;
let audience: string | null = null;
const exposed = new Set<string>();

function mergeFlags(): FlagDefinition[] {
  return FLAG_CATALOG.map((definition) => {
    const row = remote[definition.key];
    if (!row) return definition;
    const variants = Array.isArray(row.variants)
      ? (row.variants as FlagVariant[]).filter(
          (variant) =>
            variant &&
            typeof variant.key === 'string' &&
            variant.key &&
            Number.isFinite(variant.weight) &&
            variant.weight >= 0
        )
      : [];
    return {
      ...definition,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : definition.enabled,
      rolloutPct:
        typeof row.rollout_pct === 'number' && row.rollout_pct >= 0 && row.rollout_pct <= 100
          ? row.rollout_pct
          : definition.rolloutPct,
      variants: variantWeightsValid(variants) ? variants : definition.variants,
    };
  });
}

async function loadFlags(force = false): Promise<void> {
  if (!force && loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return;
  if (!force && loading) return loading;
  loading = (async () => {
    let cachedAt = 0;
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at?: number; flags?: Record<string, RemoteFlag> };
        if (parsed && typeof parsed.at === 'number' && parsed.flags && typeof parsed.flags === 'object') {
          cachedAt = parsed.at;
          remote = parsed.flags;
          loadedAt = parsed.at;
        }
      }
    } catch {}
    if (!force && cachedAt > 0 && Date.now() - cachedAt < CACHE_TTL_MS) return;
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key,enabled,rollout_pct,variants');
      if (error || !Array.isArray(data)) return;
      remote = Object.fromEntries(
        (data as RemoteFlag[])
          .filter((row) => row && typeof row.key === 'string')
          .map((row) => [row.key, row])
      );
      loadedAt = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: loadedAt, flags: remote }));
    } catch {
      // Offline or migration not installed: the bundled catalog stays active.
    }
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export async function getAudienceKey(): Promise<string> {
  if (audience) return audience;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      audience = user.id;
      return audience;
    }
  } catch {}
  try {
    const stored = await AsyncStorage.getItem(AUDIENCE_KEY);
    if (stored) {
      audience = stored;
      return audience;
    }
    const generated = `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(AUDIENCE_KEY, generated);
    audience = generated;
    return audience;
  } catch {
    audience = 'anonymous';
    return audience;
  }
}

export async function getFlag(key: string, force = false): Promise<FlagDefinition | null> {
  await loadFlags(force);
  return mergeFlags().find((flag) => flag.key === key) ?? null;
}

export async function getVariant(key: string): Promise<string> {
  const flag = await getFlag(key);
  if (!flag) return 'off';
  const assignment = assignFlag(flag, await getAudienceKey());
  if (flag.type === 'experiment' && assignment.exposed) {
    const exposureKey = `${flag.key}:${assignment.variant}`;
    if (!exposed.has(exposureKey)) {
      exposed.add(exposureKey);
      track('experiment_exposed', { experiment: flag.key, variant: assignment.variant });
    }
  }
  return assignment.variant;
}

/** Release flags are on only when they are enabled AND this learner is rolled in. */
export async function isFlagOn(key: string, fallback = false): Promise<boolean> {
  const flag = await getFlag(key);
  if (!flag) return fallback;
  return assignFlag(flag, await getAudienceKey()).exposed;
}

export async function getFlagNumber(key: string, fallback: number): Promise<number> {
  const variant = Number(await getVariant(key));
  return Number.isFinite(variant) ? variant : fallback;
}

export function useFlag(key: string, fallback = false, force = false): boolean {
  const [on, setOn] = useState(fallback);
  useEffect(() => {
    let live = true;
    void getFlag(key, force)
      .then((flag) => (flag ? isFlagOn(key, fallback) : fallback))
      .then((value) => {
        if (live) setOn(value);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key, fallback, force]);
  return on;
}

/** Returns the sticky variant plus readiness; exposure is logged once. */
export function useExperiment(key: string): { variant: string; ready: boolean } {
  const [state, setState] = useState({ variant: 'control', ready: false });
  useEffect(() => {
    let live = true;
    void getVariant(key)
      .then((variant) => {
        if (live) setState({ variant, ready: true });
      })
      .catch(() => {
        if (live) setState({ variant: 'control', ready: true });
      });
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

/** Test/automation hook: forget remote overrides and the cached audience. */
export async function resetFlagCache(): Promise<void> {
  remote = {};
  loadedAt = 0;
  audience = null;
  exposed.clear();
  try {
    await AsyncStorage.multiRemove([CACHE_KEY, AUDIENCE_KEY]);
  } catch {}
}

export { FLAG_CATALOG };
