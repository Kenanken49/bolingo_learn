import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Material, isSupabaseConfigured, supabaseConfig } from "../api";

const KIND_LABELS: Record<string, string> = {
  pdf: "PDF",
  text: "Text",
  audio: "Audio",
};

export default function UploadPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mats] = await Promise.all([api.listMaterials(), api.me()]);
      setMaterials(mats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const file = form.file as HTMLInputElement;
      const language = (form.language as HTMLInputElement).value.trim();
      const fileEntry = file.files?.[0];
      if (!fileEntry) {
        setError("Choose a file first.");
        return;
      }
      try {
        await api.uploadMaterial(fileEntry, {
          language: language.trim() || undefined,
        });
        void load();
        e.currentTarget.reset();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <h2 className="text-lg font-bold text-duo-ink">Upload a learning material</h2>

        <form className="mt-4 rounded-2xl border border-duo-border p-4" onSubmit={handleSubmit}>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-semibold text-duo-ink" htmlFor="file">
                File
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.txt,.md,.markdown,.csv,.mp3,.wav,.m4a,.ogg,.webm,.flac"
                className="w-full rounded-xl border border-duo-border px-3 py-2 text-sm font-medium outline-none focus:border-duo-blue focus:ring-2 focus:ring-duo-blue/20"
                required
              />
              <p className="mt-1 text-xs text-duo-muted">
                  {isSupabaseConfigured() && supabaseConfig.url
                  ? "Audio can be pushed straight to Supabase Storage."
                  : "Audio uploads go to the backend and generate after transcription."}
              </p>
            </div>
            <div className="sm:w-56">
              <label className="mb-1.5 block text-sm font-semibold text-duo-ink" htmlFor="language">
                Language (optional)
              </label>
              <input
                id="language"
                name="language"
                type="text"
                maxLength={64}
                placeholder="es"
                className="w-full rounded-xl border border-duo-border px-3 py-2 text-sm font-medium outline-none focus:border-duo-blue focus:ring-2 focus:ring-duo-blue/20"
              />
            </div>
          </div>

          {error && <p className="mb-3 text-sm font-semibold text-duo-red">{error}</p>}

          <button type="submit" className="btn btn-green">
            Upload
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-duo-ink">Your materials</h2>
          <Link to="/" className="btn btn-ghost">
            &larr; Back
          </Link>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-duo-muted">Loading materials…</p>
        ) : materials.length === 0 ? (
          <p className="mt-3 text-sm text-duo-muted">No materials yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onDeleted={() =>
                  setMaterials((current) => current.filter((m) => m.id !== material.id))
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MaterialCard({
  material,
  onDeleted,
}: {
  material: Material;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleGenerate = useCallback(async () => {
    try {
      await api.generateLessons(material.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [material.id]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Delete "${material.filename}"? Its courses will be kept.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteMaterial(material.id);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }, [material.id, material.filename, onDeleted]);

  return (
    <div className="rounded-xl border border-duo-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-duo-ink">{material.filename}</p>
          <p className="text-xs text-duo-muted">{KIND_LABELS[material.kind] ?? material.kind}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
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
        <p className="mt-2 text-sm font-semibold text-duo-red">{material.error}</p>
      )}

      {material.char_count > 0 && (
        <p className="mt-1 text-xs text-duo-muted">{material.char_count} characters</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {material.status === "uploaded" && (
          <button
            onClick={handleGenerate}
            className="btn btn-blue"
          >
            Generate lessons
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting || material.status === "processing"}
          className="btn btn-ghost"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-duo-red">{error}</p>}
    </div>
  );
}
