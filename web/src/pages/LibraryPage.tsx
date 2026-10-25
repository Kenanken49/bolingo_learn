import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  type LibraryCourse,
  type LibraryCourseSummary,
} from "../api";

/** Render inline `code` and **bold** spans as text nodes only. */
function renderInline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((token, i) => {
    if (token.length > 2 && token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-duo-ink/10 px-1 text-[0.9em]">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.length > 4 && token.startsWith("**") && token.endsWith("**")) {
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{token}</Fragment>;
  });
}

/** A paragraph made only of "- " lines is a bullet list; anything else is prose. */
function renderParagraph(para: string, key: string) {
  const lines = para
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
    return (
      <ul key={key} className="list-disc space-y-1 pl-6 text-duo-ink">
        {lines.map((line, k) => (
          <li key={k}>{renderInline(line.slice(2))}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={key} className="text-duo-ink">
      {renderInline(lines.join(" "))}
    </p>
  );
}

/** Split a Markdown body into prose paragraphs and fenced code blocks.
 *  Rendered as text nodes only, so lesson content is never injected as HTML. */
function renderBody(body: string) {
  const parts = body.split(/```[^\n]*\n([\s\S]*?)```/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <pre
          key={i}
          className="overflow-x-auto rounded-xl bg-duo-ink p-4 text-sm text-white"
        >
          <code>{part.replace(/\n$/, "")}</code>
        </pre>
      );
    }
    return part.split(/\n\n+/).map((para, j) =>
      para.trim() ? renderParagraph(para.trim(), `${i}-${j}`) : null,
    );
  });
}

export function LibraryIndexPage() {
  const [courses, setCourses] = useState<LibraryCourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .libraryCourses()
      .then(setCourses)
      .catch((err: Error) => setError(err.message || "Failed to load courses."));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold text-duo-ink">Library</h1>
      {error && <p className="text-sm font-semibold text-duo-red">{error}</p>}
      {courses === null && !error && <p className="text-duo-muted">Loading…</p>}
      <ul className="space-y-3">
        {courses?.map((course) => (
          <li key={course.slug}>
            <Link
              to={`/library/${course.slug}`}
              className="block rounded-2xl border border-duo-border bg-white p-4 hover:border-duo-blue"
            >
              <p className="font-bold text-duo-ink">{course.title}</p>
              <p className="text-sm text-duo-muted">{course.description}</p>
              <p className="mt-1 text-xs text-duo-muted">
                {course.lesson_count} lessons · {course.source}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LibraryPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState<LibraryCourse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setCourse(null);
    setError(null);
    api
      .libraryCourse(slug)
      .then(setCourse)
      .catch((err: Error) => setError(err.message || "Failed to load course."));
  }, [slug]);

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        {error ? (
          <p className="text-sm font-semibold text-duo-red">{error}</p>
        ) : (
          <p className="text-duo-muted">Loading…</p>
        )}
        <Link to="/library" className="mt-3 btn btn-ghost">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <h1 className="text-2xl font-extrabold text-duo-ink">{course.title}</h1>
        <p className="text-sm text-duo-muted">{course.description}</p>
        <p className="mt-1 text-xs text-duo-muted">Source: {course.source}</p>
      </section>
      {course.lessons.map((lesson, index) => (
        <section
          key={lesson.slug}
          className="space-y-3 rounded-2xl border border-duo-border bg-white p-5"
        >
          <h2 className="text-lg font-bold text-duo-ink">
            {index + 1}. {lesson.title}
          </h2>
          <div className="space-y-3">
            {renderBody(lesson.body).map((node, i) => (
              <Fragment key={i}>{node}</Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
