/**
 * Streak advancement, separated from Supabase so the freeze rules are
 * executable in tests. Dates are UTC day keys (`YYYY-MM-DD`), matching
 * `last_activity_at` usage in lib/progress.ts.
 *
 * A freeze covers one missed calendar day. If the learner has enough freezes
 * for the whole gap, the streak continues and those freezes are consumed;
 * otherwise the streak restarts at one and no freeze is spent.
 */
export interface StreakSnapshot {
  streak: number;
  freezes: number;
  lastDay: string | null;
  today: string;
}

export interface StreakAdvance {
  streak: number;
  freezes: number;
  usedFreezes: number;
}

const dayNumber = (key: string) => Math.floor(Date.parse(`${key}T00:00:00.000Z`) / 86400000);

export function advanceStreak({ streak, freezes, lastDay, today }: StreakSnapshot): StreakAdvance {
  const held = Math.max(0, Math.floor(freezes));
  const current = Math.max(0, Math.floor(streak));

  if (lastDay === today) return { streak: current, freezes: held, usedFreezes: 0 };

  const todayNumber = dayNumber(today);
  const lastNumber = lastDay ? dayNumber(lastDay) : null;

  if (lastNumber !== null && lastNumber === todayNumber - 1) {
    return { streak: current + 1, freezes: held, usedFreezes: 0 };
  }

  if (lastNumber !== null && held > 0) {
    const missed = Math.max(1, todayNumber - lastNumber - 1);
    if (missed <= held) {
      return { streak: current + 1, freezes: held - missed, usedFreezes: missed };
    }
  }

  return { streak: 1, freezes: held, usedFreezes: 0 };
}
