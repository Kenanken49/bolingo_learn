/**
 * Job matching from proven skills only. A learner's skills are the
 * certification tracks they have actually earned (all projects passed); a
 * listing names the tracks it requires. Pure, so the gate can test it.
 */
export interface MatchResult {
  /** 0..1 share of required tracks the learner holds. */
  score: number;
  have: string[];
  missing: string[];
}

export function matchJob(required: string[], certified: Set<string>): MatchResult {
  const req = Array.from(new Set(required.filter(Boolean)));
  if (req.length === 0) return { score: 0, have: [], missing: [] };
  const have = req.filter((t) => certified.has(t));
  const missing = req.filter((t) => !certified.has(t));
  return { score: have.length / req.length, have, missing };
}

/** Best matches first; ties go to the newest listing. */
export function rankJobs<T extends { requiredTracks: string[]; postedAt: string }>(
  jobs: T[],
  certified: Set<string>
): (T & { match: MatchResult })[] {
  return jobs
    .map((j) => ({ ...j, match: matchJob(j.requiredTracks, certified) }))
    .sort((a, b) => b.match.score - a.match.score || Date.parse(b.postedAt) - Date.parse(a.postedAt));
}
