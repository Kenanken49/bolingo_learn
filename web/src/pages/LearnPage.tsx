import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  type CatalogProgress,
  type CatalogTrack,
  type CatalogTrackProgress,
} from "../api";
import { useSession } from "../session";

/** Horizontal offsets (px) that make the lesson nodes zig-zag like a path. */
const ZIGZAG = [0, -56, -84, -56, 0, 56, 84, 56];

/** Guide mascot for a level: Lingo starts, Bingo and Dingo take the middle and advanced levels. */
function guideForLevel(number: number): { file: string; name: string } {
  if (number <= 1) return { file: "lingo", name: "Lingo" };
  if (number <= 3) return { file: "bingo", name: "Bingo" };
  return { file: "dingo", name: "Dingo" };
}

export default function LearnPage() {
  const { refresh } = useSession();
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [progress, setProgress] = useState<CatalogProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [catalog, progressData] = await Promise.all([
        api.catalog(),
        api.catalogProgress(),
      ]);
      setTracks(catalog);
      setProgress(progressData);
    } catch (err) {
      setError((err as Error).message || "Failed to load courses.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trackProgress = (slug: string): CatalogTrackProgress | undefined =>
    progress?.tracks.find((t) => t.slug === slug);

  async function completeLesson(slug: string, level: number, index: number) {
    const key = `${slug}-${level}-${index}`;
    setBusy(key);
    setError(null);
    try {
      const result = await api.completeCatalogLesson(slug, level, index);
      setToast(
        result.already_completed
          ? "Already completed"
          : `+${result.gems_awarded} gems`,
      );
      await load();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function unlockLevel(slug: string, level: number) {
    setBusy(`unlock-${slug}-${level}`);
    setError(null);
    try {
      await api.unlockCatalogLevel(slug, level);
      setToast(`Level ${level} unlocked`);
      await load();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error && tracks.length === 0) {
    return <p className="text-sm font-semibold text-duo-red">{error}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex w-full items-center justify-between rounded-2xl border border-duo-border bg-white px-4 py-3">
        <p className="text-sm font-extrabold text-duo-ink">
          💎 {progress?.gems ?? 0} gems
        </p>
        <p className="text-xs font-semibold text-duo-muted">
          +{progress?.gems_per_lesson ?? 5} per lesson · {progress?.gems_per_unlock ?? 50} to unlock a level
        </p>
      </div>

      {toast && (
        <p role="status" className="text-sm font-bold text-duo-green">
          {toast}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-duo-red">{error}</p>}

      {tracks.map((track) => {
        const tp = trackProgress(track.slug);
        return (
          <section key={track.slug} className="flex w-full flex-col items-center gap-6">
            <header className="flex w-full items-center justify-between rounded-2xl bg-duo-green px-5 py-4 text-white">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
                  Course
                </p>
                <h2 className="text-lg font-extrabold">{track.name}</h2>
              </div>
              <Link
                to={`/track/${track.slug}`}
                className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-bold hover:bg-white/30"
              >
                Outline
              </Link>
            </header>

            {track.levels.map((level) => {
              const lp = tp?.levels.find((l) => l.number === level.number);
              const unlocked = lp?.unlocked ?? level.number === 1;
              const canAfford = (progress?.gems ?? 0) >= (progress?.gems_per_unlock ?? 50);
              return (
                <div key={level.number} className="flex w-full flex-col items-center gap-4">
                  <div
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold uppercase tracking-wide ${
                      unlocked ? "bg-duo-blue text-white" : "bg-duo-muted/20 text-duo-muted"
                    }`}
                  >
                    <span>
                      Level {level.number} · {level.lessons.length} lessons
                    </span>
                    {unlocked && (
                      <img
                        src={`/mascots/${guideForLevel(level.number).file}.svg`}
                        alt={`${guideForLevel(level.number).name}, your guide`}
                        className="h-12 w-12"
                      />
                    )}
                  </div>

                  {!unlocked && (
                    <button
                      type="button"
                      onClick={() => void unlockLevel(track.slug, level.number)}
                      disabled={!canAfford || busy !== null}
                      className="btn btn-green disabled:opacity-50"
                    >
                      🔒 Unlock for {progress?.gems_per_unlock ?? 50} gems
                    </button>
                  )}

                  {unlocked && lp && lp.lessons.length > 0 && lp.lessons.every((l) => l.completed) && (
                    <img
                      src="/mascots/mambo.svg"
                      alt="Mambo celebrates this level"
                      className="h-14 w-14"
                    />
                  )}

                  {unlocked &&
                    level.lessons.map((lesson, index) => {
                      const done = lp?.lessons.find((l) => l.index === index)?.completed ?? false;
                      const current =
                        !done && (index === 0 || (lp?.lessons[index - 1]?.completed ?? false));
                      const key = `${track.slug}-${level.number}-${index}`;
                      const offset = ZIGZAG[index % ZIGZAG.length];
                      const tone = done
                        ? "bg-duo-green text-white"
                        : current
                          ? "bg-duo-blue text-white ring-4 ring-duo-blue/30"
                          : "bg-duo-muted/30 text-duo-muted";
                      return (
                        <div
                          key={key}
                          className="flex flex-col items-center"
                          style={{ transform: `translateX(${offset}px)` }}
                        >
                          <button
                            type="button"
                            title={lesson.title}
                            aria-label={`${lesson.title}${done ? " (completed)" : ""}`}
                            disabled={!current || busy !== null}
                            onClick={() => void completeLesson(track.slug, level.number, index)}
                            className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-extrabold shadow-[0_6px_0_rgba(0,0,0,0.15)] transition active:translate-y-1 disabled:cursor-default ${tone}`}
                          >
                            {done ? "✓" : index + 1}
                          </button>
                          <p className="mt-2 max-w-[12rem] text-center text-xs font-semibold text-duo-muted">
                            {lesson.title}
                          </p>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
