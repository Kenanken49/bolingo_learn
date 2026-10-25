import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Material } from "../api";

export default function MaterialPage() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMaterial(await api.getMaterial(Number(materialId)));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [materialId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.generateLessons(Number(materialId));
      if (result.course_id) {
        navigate(`/course/${result.course_id}`);
        return;
      }
      setMaterial((prev) => (prev ? { ...prev, status: "processing" } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [materialId, navigate]);

  // While the backend generates lessons, poll until the material settles and
  // then pick up the course id (generation is idempotent once lessons exist).
  useEffect(() => {
    if (material?.status !== "processing") return;
    const timer = window.setInterval(() => {
      api
        .getMaterial(Number(materialId))
        .then((next) => {
          setMaterial(next);
          if (next.status === "ready") {
            void api.generateLessons(Number(materialId)).then((result) => {
              if (result.course_id) navigate(`/course/${result.course_id}`);
            });
          }
        })
        .catch((err: Error) => setError(err.message));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [material?.status, materialId, navigate]);

  if (!material) {
    return (
      <div className="rounded-2xl border border-duo-border bg-white p-6 text-center">
        {error ? (
          <p className="text-sm font-semibold text-duo-red">{error}</p>
        ) : (
          <p className="text-sm text-duo-muted">Loading material…</p>
        )}
        <Link to="/" className="mt-3 btn btn-ghost">
          Back home
        </Link>
      </div>
    );
  }

  const canGenerate = material.status === "uploaded" || material.status === "failed";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-duo-ink">{material.filename}</h1>
            <p className="text-sm text-duo-muted">
              {material.kind} · {material.char_count} characters ·{" "}
              {material.language ?? "auto-detect"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
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
        </div>

        {material.error && (
          <p className="mt-3 rounded-xl bg-duo-red/5 p-3 text-sm font-semibold text-duo-red">
            {material.error}
          </p>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-duo-red">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          {canGenerate && (
            <button onClick={generate} disabled={busy} className="btn btn-green">
              {busy ? "Starting…" : material.status === "failed" ? "Retry generation" : "Generate lessons"}
            </button>
          )}
          {material.status === "processing" && (
            <p className="animate-pulse text-sm font-semibold text-duo-blue">
              Generating lessons — this page opens the course automatically.
            </p>
          )}
          {material.status === "ready" && (
            <button onClick={generate} disabled={busy} className="btn btn-blue">
              {busy ? "Opening…" : "Open course"}
            </button>
          )}
          <Link to="/upload" className="btn btn-ghost">
            All materials
          </Link>
        </div>
      </section>
    </div>
  );
}
