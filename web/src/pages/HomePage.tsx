import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CatalogTrack, type CourseSummary, type Leaderboard, type Material } from "../api";
import { LeagueBadge, LEAGUE_STYLES } from "../components/Header";
import { useSession } from "../session";

const ACTIVITY_WINDOW = 7;

function isoDay(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
    day.getDate(),
  ).padStart(2, "0")}`;
}

/** The trailing seven calendar days, oldest first, ending today. */
function lastSevenDays() {
  const today = new Date();
  return Array.from({ length: ACTIVITY_WINDOW }, (_, index) => {
    const day = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (ACTIVITY_WINDOW - 1 - index),
    );
    return {
      iso: isoDay(day),
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      isToday: index === ACTIVITY_WINDOW - 1,
    };
  });
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-duo-surface p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-duo-muted">{label}</dt>
      <dd className={`text-2xl font-extrabold ${tone ?? "text-duo-ink"}`}>{value}</dd>
    </div>
  );
}

export default function HomePage() {
  const { user, refresh } = useSession();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refresh();
      const [mats, board, courseList, catalog] = await Promise.all([
        api.listMaterials(),
        api.leaderboard(),
        api.listCourses(),
        api.catalog(),
      ]);
      setMaterials(mats);
      setLeaderboard(board);
      setCourses(courseList);
      setTracks(catalog);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const quest = user?.daily_quest ?? null;
  const questPercent = Math.round(quest?.progress_percent ?? 0);
  const league = user?.league_tier ?? "bronze";
  const leagueStyle = LEAGUE_STYLES[league];
  const week = lastSevenDays();
  const activityDays = new Set(user?.activity_days ?? []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-duo-ink">Your profile</h2>
          {user && <LeagueBadge tier={league} />}
        </div>
        {user ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="XP" value={String(user.xp)} />
            <Stat
              label="Streak"
              value={`${user.streak} day${user.streak === 1 ? "" : "s"}`}
              tone="text-duo-orange"
            />
            <Stat label="Hearts" value={`${user.hearts} / 5`} tone="text-duo-red" />
            <Stat label="Lessons" value={String(user.lessons_completed)} tone="text-duo-green" />
          </dl>
        ) : (
          <p className="text-sm text-duo-muted">You are not signed in.</p>
        )}

        {user && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-duo-ink">Last 7 days</h3>
              <span className="text-xs font-semibold text-duo-muted">
                {activityDays.size} active day{activityDays.size === 1 ? "" : "s"}
              </span>
            </div>
            <ol className="mt-2 flex flex-wrap items-center gap-2">
              {week.map((day) => {
                const active = activityDays.has(day.iso);
                return (
                  <li
                    key={day.iso}
                    aria-label={`${day.iso}${active ? " active" : ""}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                        active
                          ? "bg-duo-green text-white"
                          : "border border-duo-border text-duo-muted"
                      } ${day.isToday ? "ring-2 ring-duo-green/40" : ""}`}
                    >
                      {active ? "✓" : "·"}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-duo-muted">
                      {day.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {user && user.streak === 0 && (
          <p className="mt-3 rounded-xl bg-duo-orange/10 p-3 text-sm font-semibold text-[#9a5b00]">
            Your streak broke. Pendo is disappointed… but a single lesson restarts it today.
          </p>
        )}
        {user && user.streak > 0 && (
          <p className="mt-3 rounded-xl bg-duo-orange/10 p-3 text-sm font-semibold text-[#9a5b00]">
            🔥 {user.streak} day{user.streak === 1 ? "" : "s"} in a row — miss today and it resets to zero.
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-duo-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-duo-ink">Daily quest</h2>
            <span className="text-xs font-bold uppercase tracking-wide text-duo-muted">Resets at midnight</span>
          </div>
          {quest ? (
            <>
              <p className="mt-2 text-sm font-semibold text-duo-ink">
                Earn {quest.target} XP today
              </p>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-duo-surface">
                <div
                  className={`h-full rounded-full transition-all ${
                    quest.completed ? "bg-duo-yellow" : "bg-duo-green"
                  }`}
                  style={{ width: `${questPercent}%` }}
                  role="progressbar"
                  aria-label="Daily quest progress"
                  aria-valuenow={questPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="mt-2 text-sm font-bold text-duo-muted">
                {quest.current} / {quest.target} XP{" "}
                {!quest.completed && <span>· {questPercent}%</span>}
              </p>
              {quest.completed ? (
                <div className="mt-3 rounded-xl bg-duo-yellow/15 p-3 text-sm font-semibold text-[#7a5b00]">
                  🎉 Quest complete! You banked every XP. Come back tomorrow for a
                  fresh quest.
                </div>
              ) : (
                <p className="mt-1 text-xs text-duo-muted">
                  Finish a lesson before midnight to keep it moving.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-duo-muted">No quest for today yet — finish a lesson to start one.</p>
          )}
        </div>

        <div className="rounded-2xl border border-duo-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-duo-ink">League</h2>
            <LeagueBadge tier={league} />
          </div>
          <p className="mt-2 text-sm text-duo-muted">
            {!user
              ? "Sign in to join a weekly league."
              : league === "master"
                ? "Top tier — defend your spot before Monday."
                : user.league_zone === "promotion"
                  ? "You're in the promotion zone — keep it up!"
                  : user.league_next_in > 0
                    ? `${user.league_next_in} XP to the promotion zone.`
                    : "Top 3 climb every week — the season resets Monday."}
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {(leaderboard?.entries ?? []).slice(0, 5).map((entry, index) => {
              const isMe = entry.user_id === leaderboard?.me.user_id;
              return (
                <li
                  key={entry.user_id}
                  className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                    isMe ? "bg-duo-green/10 font-bold text-duo-green" : "text-duo-ink"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`inline-block w-4 text-right font-extrabold ${leagueStyle.text}`}>
                      {index + 1}
                    </span>
                    {entry.name}
                    {isMe && <span className="text-xs uppercase">you</span>}
                  </span>
                  <span className="flex items-center gap-3 text-xs font-semibold text-duo-muted">
                    <span>⚡ {entry.xp}</span>
                    <span>🔥 {entry.streak}</span>
                  </span>
                </li>
              );
            })}
            {!leaderboard?.entries.length && (
              <li className="text-sm text-duo-muted">No one in this league yet. Climb first!</li>
            )}
          </ol>
          <Link
            to="/leaderboard"
            className="mt-3 inline-block text-sm font-semibold text-duo-blue hover:text-duo-blue-dark"
          >
            View full league →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-duo-ink">Your courses</h2>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-duo-muted">Loading courses…</p>
        ) : courses.length === 0 ? (
          <p className="mt-3 text-sm text-duo-muted">
            No courses yet. Upload a material and generate lessons to build one.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {courses.map((course) => (
              <li
                key={course.id}
                className="flex items-center justify-between rounded-xl border border-duo-border p-3"
              >
                <div>
                  <p className="font-semibold text-duo-ink">{course.title}</p>
                  <p className="text-xs text-duo-muted">
                    {course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}{" "}
                    · {course.language ?? "auto"}
                  </p>
                </div>
                <Link
                  to={`/course/${course.id}`}
                  className="font-semibold text-duo-blue hover:text-duo-blue-dark"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-duo-ink">Built-in courses</h2>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-duo-muted">Loading courses…</p>
        ) : tracks.length === 0 ? (
          <p className="mt-3 text-sm text-duo-muted">No built-in courses available.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {tracks.map((track) => {
              const lessonCount = track.levels.reduce(
                (total, level) => total + level.lessons.length,
                0,
              );
              return (
                <li key={track.slug}>
                  <Link
                    to={`/track/${track.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-duo-border p-3 hover:border-duo-green"
                  >
                    <div>
                      <p className="font-semibold text-duo-ink">{track.name}</p>
                      <p className="text-xs text-duo-muted">{track.description}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-duo-muted">
                        {track.levels.length} level{track.levels.length === 1 ? "" : "s"}{" "}
                        · {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span aria-hidden="true" className="font-bold text-duo-blue">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-duo-ink">Your materials</h2>
          <Link to="/upload" className="btn btn-blue">
            Upload
          </Link>
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-duo-red">{error}</p>}

        {loading ? (
          <p className="mt-3 text-sm text-duo-muted">Loading materials…</p>
        ) : materials.length === 0 ? (
          <p className="mt-3 text-sm text-duo-muted">
            No materials yet. Upload a PDF, text, or audio file.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {materials.map((material) => (
              <li
                key={material.id}
                className="flex items-center justify-between rounded-xl border border-duo-border p-3"
              >
                <div>
                  <p className="font-semibold text-duo-ink">{material.filename}</p>
                  <p className="text-xs text-duo-muted">
                    {material.kind} · {material.char_count} chars
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold ${
                      material.status === "ready"
                        ? "bg-duo-green/15 text-duo-green"
                        : material.status === "processing"
                          ? "bg-duo-blue/15 text-duo-blue"
                          : material.status === "failed"
                            ? "bg-duo-red/15 text-duo-red"
                            : "bg-duo-muted/15 text-duo-muted"
                    }`}
                  >
                    {material.status}
                  </span>
                  <Link
                    to={`/material/${material.id}`}
                    className="font-semibold text-duo-blue hover:text-duo-blue-dark"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
