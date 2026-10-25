import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LeagueTier } from "../api";
import { useSession } from "../session";

export const LEAGUE_ORDER: LeagueTier[] = ["bronze", "silver", "gold", "diamond", "master"];

export const LEAGUE_STYLES: Record<LeagueTier, { bg: string; text: string; ring: string; label: string }> = {
  bronze: { bg: "bg-[#cd7f32]/15", text: "text-[#a05a21]", ring: "ring-[#cd7f32]/40", label: "Bronze" },
  silver: { bg: "bg-slate-400/15", text: "text-slate-600", ring: "ring-slate-400/40", label: "Silver" },
  gold: { bg: "bg-duo-yellow/20", text: "text-[#a17900]", ring: "ring-duo-yellow/50", label: "Gold" },
  diamond: { bg: "bg-cyan-400/15", text: "text-cyan-700", ring: "ring-cyan-400/40", label: "Diamond" },
  master: { bg: "bg-purple-500/15", text: "text-purple-700", ring: "ring-purple-500/40", label: "Master" },
};

export function LeagueBadge({ tier }: { tier: LeagueTier }) {
  const style = LEAGUE_STYLES[tier] ?? LEAGUE_STYLES.bronze;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ring-2 ${style.bg} ${style.text} ${style.ring}`}
    >
      <span aria-hidden="true">◆</span>
      {style.label} league
    </span>
  );
}

export default function Header() {
  const { user, logout, refresh } = useSession();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-duo-border bg-duo-surface px-4">
      <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-duo-green text-white">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5" stroke="white" strokeWidth="2" />
            <circle cx="8" cy="8" r="1.5" fill="white" />
          </svg>
        </span>
        Bolingo
      </Link>

      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <div className="flex items-center gap-3 text-sm font-extrabold" data-testid="header-stats">
              <span className="flex items-center gap-1 text-duo-orange" title={`${user.streak} day streak`}>
                <span aria-hidden="true">🔥</span>
                {user.streak}
              </span>
              <span className="flex items-center gap-1 text-duo-blue" title="Gems">
                <span aria-hidden="true">💎</span>
                {user.gems}
              </span>
              <span className="flex items-center gap-1 text-duo-red" title={`${user.hearts} of 5 hearts`}>
                <span aria-hidden="true">♥</span>
                {user.hearts}
              </span>
              <span className="flex items-center gap-1 text-duo-yellow" title="Experience points">
                <span aria-hidden="true">⚡</span>
                {user.xp}
              </span>
              <LeagueBadge tier={user.league_tier} />
            </div>
            <Link
              to="/"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-duo-muted hover:bg-white hover:text-duo-ink"
            >
              Home
            </Link>
            <Link
              to="/learn"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-duo-muted hover:bg-white hover:text-duo-ink"
            >
              Learn
            </Link>
            <Link
              to="/settings"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-duo-muted hover:bg-white hover:text-duo-ink"
            >
              Settings
            </Link>
            <Link
              to="/leaderboard"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-duo-muted hover:bg-white hover:text-duo-ink"
            >
              League
            </Link>
            <Link
              to="/upload"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-duo-muted hover:bg-white hover:text-duo-ink"
            >
              Materials
            </Link>
            <button
              onClick={() => {
                void refresh();
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-duo-muted hover:bg-white hover:text-duo-ink"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                void handleLogout();
              }}
              className="btn-ghost"
            >
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-green">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
