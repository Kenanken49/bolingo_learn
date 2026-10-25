import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Course } from "../api";

export default function CoursePage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.courseLessons(Number(courseId));
      setCourse(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load course.");
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm font-semibold text-duo-muted">This course is unavailable.</p>
        {error && <p className="mt-2 text-sm font-semibold text-duo-red">{error}</p>}
        <Link to="/" className="mt-3 btn btn-ghost">Back home</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-duo-ink">{course.title}</h1>
            <p className="text-sm text-duo-muted">
              {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""} · {course.language ?? "auto"}
            </p>
          </div>
          {course.lessons[0] ? (
            <Link to={`/lesson/${course.lessons[0].id}`} className="btn btn-blue">
              Start lesson 1
            </Link>
          ) : (
            <span className="text-sm font-semibold text-duo-muted">No lessons generated yet</span>
          )}
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-duo-red">{error}</p>}
      </section>

      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <h2 className="text-lg font-bold text-duo-ink">Lesson path</h2>
        <ul className="mt-3 space-y-2">
          {course.lessons.map((lesson) => (
            <li
              key={lesson.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                lesson.passed
                    ? "border-duo-green/30 bg-duo-green/5"
                    : "border-duo-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">{lesson.ord + 1}</span>
                <div>
                  <p className="font-semibold text-duo-ink">{lesson.title}</p>
                  <p className="text-xs text-duo-muted">{lesson.item_count} questions</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {lesson.passed ? (
                  <span className="font-bold text-duo-green">Passed ✓</span>
                ) : lesson.best_correct ? (
                  <span className="text-duo-muted">
                    {lesson.best_correct}/{lesson.item_count} correct
                  </span>
                ) : (
                  <span className="text-duo-muted">Not started</span>
                )}
                <Link
                  to={`/lesson/${lesson.id}`}
                  className="font-semibold text-duo-blue hover:text-duo-blue-dark"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
