/**
 * XP & Leveling Up (instant gratification): every lesson's XP feeds a
 * level curve, and crossing a threshold fires the level-up celebration.
 *
 * Curve: level L requires 50·L·(L−1) total XP — L1: 0, L2: 100, L3: 300,
 * L4: 600, L5: 1000 … early wins come fast, later levels stretch out.
 */

/** Total XP required to reach the given level (level 1 starts at 0). */
export const xpForLevel = (level: number): number =>
  level <= 1 ? 0 : 50 * level * (level - 1);

/** Level for a lifetime XP total. */
export function levelForXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  while (safe >= xpForLevel(level + 1)) level += 1;
  return level;
}

/** Progress within the current level (for bars and the level-up modal). */
export function levelProgress(xp: number): { level: number; into: number; needed: number } {
  const level = levelForXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: Math.max(0, xp - cur), needed: Math.max(1, next - cur) };
}
