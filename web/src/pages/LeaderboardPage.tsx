import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeagueZone, type Leaderboard } from "../api";
import {
  LeagueBadge,
  LEAGUE_ORDER,
  LEAGUE_STYLES,
} from "../components/Header";
import { useSession } from "../session";

function RankBadge({ position }: { position: number }) {
  const medal =
    position === 1
      ? "bg-duo-yellow/25 text-[#a17900]"
      : position === 2
        ? "bg-slate-400/20 text-slate-600"
        : position === 3
          ? "bg-[#cd7f32]/20 text-[#a05a21]"
          : "text-duo-muted";
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${medal}`}
    >
      {position}
    </span>
  );
}

function ZoneBadge({ zone }: { zone: LeagueZone }) {
  if (zone === "promotion") {
    return (
      <span className="rounded-full bg-duo-green/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-duo-green">
        Promotion
      </span>
    );
  }
  if (zone === "demotion") {
    return (
      <span className="rounded-full bg-duo-red/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-duo-red">
        Demotion
      </span>
    );
  }
  return null;
}

export default function LeaderboardPage() {
  const { user, refresh } = useSession();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refresh();
      setBoard(await api.leaderboard());
    } catch (err) {
      setError((err as Error).message || "Failed to load the league.");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) {
    return (
      <p className="text-sm font-semibold text-duo-muted">
        Sign in to see your league.
      </p>
    );
  }

  const entries = board?.entries ?? [];
  const rank =
    entries.findIndex((entry) => entry.user_id === user.id) + 1 ||
    user.league_rank ||
    0;
  const nextTier = LEAGUE_ORDER[LEAGUE_ORDER.indexOf(user.league_tier) + 1];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-duo-ink">League</h1>
            <p className="text-sm text-duo-muted">
              Ranked by XP earned this week. In a tier with 7+ ranked learners,
              the top 3 promote and the bottom 3 demote — season resets Monday.
            </p>
          </div>
          <LeagueBadge tier={user.league_tier} />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm font-semibold">
          <span className="text-duo-ink">⚡ {user.league_points} XP this week</span>
          <span className="text-duo-muted">
            {rank > 0 ? `#${rank} in your league` : "Outside the top 10"}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold text-duo-muted">
          {user.league_zone === "promotion"
            ? "You're in the promotion zone — hold your place."
            : nextTier && user.league_next_in > 0
              ? `${user.league_next_in} XP to the promotion zone.`
              : user.league_tier === "master"
                ? "Top tier — every week is a defense."
                : "Top 3 promote each week."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-duo-border bg-white p-5">
          <h2 className="text-lg font-bold text-duo-ink">The ladder</h2>
          <p className="text-xs font-semibold text-duo-muted">
            Your tier only moves at the weekly reset.
          </p>
          <ol className="mt-3 space-y-2">
            {LEAGUE_ORDER.map((tier) => {
              const current = tier === user.league_tier;
              return (
                <li
                  key={tier}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                    current
                      ? "border-duo-blue/40 bg-duo-blue/5 font-bold text-duo-ink"
                      : "border-duo-border text-duo-muted"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{current ? "◆" : "◇"}</span>
                    {LEAGUE_STYLES[tier].label} league
                  </span>
                  {current && (
                    <span className="rounded-full bg-duo-blue/15 px-2 py-0.5 text-xs font-semibold text-duo-blue">
                      You are here
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-2xl border border-duo-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-duo-ink">Standings</h2>
            <span className="text-xs font-bold uppercase tracking-wide text-duo-muted">
              This week · Top 10
            </span>
          </div>

          {loading ? (
            <p className="mt-3 text-sm text-duo-muted">Loading standings…</p>
          ) : error ? (
            <p className="mt-3 text-sm font-semibold text-duo-red">{error}</p>
          ) : entries.length === 0 ? (
            <p className="mt-3 text-sm text-duo-muted">
              No one in this league yet. Earn XP to claim first place.
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5">
              {entries.map((entry, index) => {
                const isMe = entry.user_id === user.id;
                return (
                  <li
                    key={entry.user_id}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${
                      entry.zone === "promotion"
                        ? "bg-duo-green/10"
                        : entry.zone === "demotion"
                          ? "bg-duo-red/5"
                          : ""
                    } ${isMe ? "font-bold ring-1 ring-duo-green/40" : "text-duo-ink"}`}
                  >
                    <span className="flex items-center gap-2">
                      <RankBadge position={index + 1} />
                      {entry.name}
                      {isMe && <span className="text-xs uppercase">you</span>}
                      <ZoneBadge zone={entry.zone} />
                    </span>
                    <span className="flex items-center gap-3 text-xs font-semibold text-duo-muted">
                      <span>⚡ {entry.xp}</span>
                      <span>🔥 {entry.streak}</span>
                    </span>
                  </li>
                );
              })}
              {rank === 0 && (
                <li className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-duo-border px-2 py-1.5 text-sm">
                  <span className="flex items-center gap-2 font-bold text-duo-ink">
                    <span className="inline-flex h-6 w-6 items-center justify-center text-xs font-extrabold text-duo-muted">
                      —
                    </span>
                    {board?.me.name}
                    <span className="text-xs uppercase">you</span>
                    {board && <ZoneBadge zone={board.me.zone} />}
                  </span>
                  <span className="flex items-center gap-3 text-xs font-semibold text-duo-muted">
                    <span>⚡ {board?.me.xp}</span>
                    <span>🔥 {board?.me.streak}</span>
                  </span>
                </li>
              )}
            </ol>
          )}

          <Link
            to="/"
            className="mt-4 inline-block text-sm font-semibold text-duo-blue hover:text-duo-blue-dark"
          >
            ← Back to lessons
          </Link>
        </div>
      </section>
    </div>
  );
}
