/**
 * Chest payouts. Every unit chest is one-shot, so the roll happens once at
 * claim time and the result is written with the claim. XP is the common
 * reward; gems and streak freezes are the rarer, more memorable pulls.
 *
 * The table is intentionally small and explicit: weights total 100, amounts
 * are easy to read in the ceremony, and tests can probe every row.
 */
export type ChestRewardKind = 'xp' | 'gems' | 'streak_freeze';

export interface ChestReward {
  kind: ChestRewardKind;
  amount: number;
}

interface WeightedReward extends ChestReward {
  weight: number;
}

const TABLE: WeightedReward[] = [
  { kind: 'xp', amount: 30, weight: 20 },
  { kind: 'xp', amount: 50, weight: 20 },
  { kind: 'xp', amount: 75, weight: 10 },
  { kind: 'xp', amount: 100, weight: 5 },
  { kind: 'gems', amount: 5, weight: 15 },
  { kind: 'gems', amount: 10, weight: 10 },
  { kind: 'gems', amount: 20, weight: 5 },
  { kind: 'streak_freeze', amount: 1, weight: 15 },
];

/** A testable RNG seam: pass () => 0 … () => 0.999 to walk the table. */
export function rollChestReward(random: () => number = Math.random): ChestReward {
  const roll = Math.max(0, Math.min(0.999999, random())) * 100;
  let cursor = 0;
  for (const reward of TABLE) {
    cursor += reward.weight;
    if (roll < cursor) return { kind: reward.kind, amount: reward.amount };
  }
  const last = TABLE[TABLE.length - 1]!;
  return { kind: last.kind, amount: last.amount };
}

/** The phrase shown in the storm badge and accessibility label. */
export function chestRewardLabel(reward: ChestReward): string {
  if (reward.kind === 'gems') {
    return `+${reward.amount} gem${reward.amount === 1 ? '' : 's'}`;
  }
  if (reward.kind === 'streak_freeze') {
    return `+${reward.amount} streak freeze${reward.amount === 1 ? '' : 's'}`;
  }
  return `+${reward.amount} XP`;
}
