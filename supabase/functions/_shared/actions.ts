// Allowlisted production actions for approved engineering changes.
//
// The agent may only propose reversible configuration changes. Source-code
// changes stay as proposals for a human to implement and deploy through CI.
// Every action is validated here again at apply time (never trust the model).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const ALLOWED_SETTING_KEYS = [
  'agent_enabled',
  'auto_guardrails',
  'crash_free_floor',
  'p95_latency_ceiling_ms',
  'release_freeze',
] as const;

export type AllowedSettingKey = (typeof ALLOWED_SETTING_KEYS)[number];

export type ApprovedAction =
  | { type: 'flag_rollout'; key: string; rollout_pct: number }
  | { type: 'flag_enabled'; key: string; enabled: boolean }
  | { type: 'quality_setting'; key: AllowedSettingKey; value: boolean | number };

export interface ApplyResult {
  applied: boolean;
  detail: string;
}

function settingValueAllowed(key: AllowedSettingKey, value: unknown): boolean {
  if (key === 'agent_enabled' || key === 'auto_guardrails' || key === 'release_freeze') {
    return typeof value === 'boolean';
  }
  if (key === 'crash_free_floor') {
    return typeof value === 'number' && value >= 90 && value <= 100;
  }
  if (key === 'p95_latency_ceiling_ms') {
    return typeof value === 'number' && Number.isInteger(value) && value >= 500 && value <= 10_000;
  }
  return false;
}

export function sanitizeAction(raw: unknown, flagKeys: string[]): ApprovedAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const action = raw as Record<string, unknown>;
  const type = action.type;
  if (type === 'flag_rollout') {
    const key = typeof action.key === 'string' ? action.key : '';
    const pct = Number(action.rollout_pct);
    if (flagKeys.includes(key) && Number.isInteger(pct) && pct >= 0 && pct <= 100) {
      return { type, key, rollout_pct: pct };
    }
    return null;
  }
  if (type === 'flag_enabled') {
    const key = typeof action.key === 'string' ? action.key : '';
    if (flagKeys.includes(key) && typeof action.enabled === 'boolean') {
      return { type, key, enabled: action.enabled };
    }
    return null;
  }
  if (type === 'quality_setting') {
    const key = typeof action.key === 'string' ? action.key : '';
    if (
      ALLOWED_SETTING_KEYS.includes(key as AllowedSettingKey) &&
      settingValueAllowed(key as AllowedSettingKey, action.value)
    ) {
      return {
        type,
        key: key as AllowedSettingKey,
        value: action.value as boolean | number,
      };
    }
    return null;
  }
  return null;
}

export async function applyAction(
  admin: SupabaseClient,
  action: ApprovedAction,
  updatedBy: string | null
): Promise<ApplyResult> {
  try {
    if (action.type === 'flag_rollout' || action.type === 'flag_enabled') {
      const patch =
        action.type === 'flag_rollout'
          ? { rollout_pct: action.rollout_pct }
          : { enabled: action.enabled };
      const { data, error } = await admin
        .from('feature_flags')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('key', action.key)
        .select('key')
        .maybeSingle();
      if (error) throw error;
      if (!data) return { applied: false, detail: `Unknown flag: ${action.key}.` };
      return {
        applied: true,
        detail:
          action.type === 'flag_rollout'
            ? `Set ${action.key} rollout to ${action.rollout_pct}%.`
            : `${action.enabled ? 'Enabled' : 'Disabled'} ${action.key}.`,
      };
    }

    const { data, error } = await admin
      .from('quality_settings')
      .update({
        [action.key]: action.value,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq('id', 'default')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { applied: false, detail: 'Quality settings row is missing.' };
    return { applied: true, detail: `Set ${action.key} to ${String(action.value)}.` };
  } catch (error) {
    return {
      applied: false,
      detail: error instanceof Error ? error.message.slice(0, 300) : 'Action failed.',
    };
  }
}
