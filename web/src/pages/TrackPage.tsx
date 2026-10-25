import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type CatalogTrack } from "../api";

const KIND_STYLES: Record<string, string> = {
  reading: "bg-duo-blue/15 text-duo-blue",
  demo: "bg-duo-yellow/20 text-[#7a5b00]",
  practice: "bg-duo-green/15 text-duo-green",
  project: "bg-duo-red/15 text-duo-red",
};

function countLessons(track: CatalogTrack): number {
  return track.levels.reduce((total, level) => total + level.lessons.length, 0);
}

export default function TrackPage() {
  const { slug } = useParams();
  const [track, setTrack] = useState<CatalogTrack | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const tracks = await api.catalog();
      setTrack(tracks.find((candidate) => candidate.slug === slug) ?? null);
    } catch (err) {
      setError((err as Error).message || "Failed to load course.");
    } finally {
      setLoaded(true);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return <p className="text-sm font-semibold text-duo-muted">Loading course…</p>;
  }

  if (!track) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm font-semibold text-duo-muted">
          {error ?? "This course is unavailable."}
        </p>
        <Link to="/" className="mt-3 btn btn-ghost">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <Link
          to="/"
          className="text-sm font-semibold text-duo-blue hover:text-duo-blue-dark"
        >
          ← All courses
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-duo-ink">{track.name}</h1>
        <p className="mt-1 text-sm text-duo-muted">{track.description}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-duo-muted">
          {track.levels.length} level{track.levels.length === 1 ? "" : "s"} ·{" "}
          {countLessons(track)} lessons
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-duo-red">{error}</p>}
      </section>

      {track.levels.map((level) => (
        <section
          key={level.number}
          className="rounded-2xl border border-duo-border bg-white p-5"
        >
          <h2 className="text-lg font-bold text-duo-ink">Level {level.number}</h2>
          <ul className="mt-3 space-y-2">
            {level.lessons.map((lesson, index) => (
              <li key={`${level.number}-${index}`} className="rounded-xl border border-duo-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-duo-ink">
                    <span className="mr-2 font-extrabold text-duo-muted">
                      {index + 1}.
                    </span>
                    {lesson.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                      KIND_STYLES[lesson.kind] ?? "bg-duo-muted/15 text-duo-muted"
                    }`}
                  >
                    {lesson.kind}
                  </span>
                </div>
                <p className="mt-1 text-sm text-duo-muted">{lesson.instruction}</p>
                <p
                  className="mt-1 text-xs font-semibold text-duo-muted"
                  aria-label={`Difficulty ${lesson.difficulty} of 5`}
                >
                  {"●".repeat(lesson.difficulty)}
                  {"○".repeat(5 - lesson.difficulty)} difficulty
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
