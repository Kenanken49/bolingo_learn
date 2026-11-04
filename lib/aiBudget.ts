import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  budgetDay,
  budgetView,
  normalizeBudget,
  spendBudget,
  type AiBudgetState,
  type AiBudgetView,
} from './entitlements';

/**
 * Device-local counter for the free tier's daily AI tutor tokens. Premium
 * learners are reported unlimited and never decremented. The server-side
 * functions keep their own protections; this counter is the learner-facing
 * meter and the switch that routes free learners to the offline tutor once
 * the day's allowance is spent.
 */
const K_BUDGET = 'bolingo.aiBudget.v1';

async function read(): Promise<AiBudgetState> {
  const today = budgetDay();
  try {
    const raw = await AsyncStorage.getItem(K_BUDGET);
    return normalizeBudget(raw ? (JSON.parse(raw) as AiBudgetState) : null, today);
  } catch {
    return normalizeBudget(null, today);
  }
}

export async function getAiBudget(isPremium: boolean): Promise<AiBudgetView> {
  return budgetView(await read(), isPremium);
}

export async function recordAiSpend(tokens: number, isPremium: boolean): Promise<AiBudgetView> {
  const current = await read();
  if (isPremium) return budgetView(current, true);
  const next = spendBudget(current, tokens);
  try {
    await AsyncStorage.setItem(K_BUDGET, JSON.stringify(next));
  } catch {}
  return budgetView(next, false);
}
