import { useEffect, useState } from "react";
import { api, type BirdbrainProfile } from "../api";

interface BirdbrainModalProps {
  level: number;
  open: boolean;
  onClose: () => void;
}

export default function BirdbrainModal({ level, open, onClose }: BirdbrainModalProps) {
  const [profile, setProfile] = useState<BirdbrainProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    api
      .birdbrainProfile(level)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Could not load your Birdbrain profile.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, level]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="birdbrain-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-duo-border bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="birdbrain-title" className="text-lg font-extrabold text-duo-ink">
          Birdbrain
        </h2>
        <p className="mt-1 text-sm text-duo-muted">
          Birdbrain tracks how you do at each difficulty level and picks your next one from that.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-duo-red">
            {error}
          </p>
        )}

        {!error && !profile && (
          <p className="mt-4 text-sm font-semibold text-duo-muted">Loading…</p>
        )}

        {profile && (
          <>
            <p className="mt-4 text-sm font-bold text-duo-ink">
              This lesson is level {profile.current_difficulty}. Your next lesson will be level{" "}
              {profile.next_difficulty}.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              {profile.levels.map((row) => (
                <li
                  key={row.level}
                  className={`rounded-xl border px-2 py-2 text-center ${
                    row.level === profile.next_difficulty
                      ? "border-duo-blue bg-duo-blue/10"
                      : "border-duo-border"
                  }`}
                >
                  <p className="font-extrabold text-duo-ink">Level {row.level}</p>
                  <p className="text-xs font-semibold text-duo-muted">
                    {Math.round(row.accuracy * 100)}% correct
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="btn btn-green">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
