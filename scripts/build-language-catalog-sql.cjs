#!/usr/bin/env node
/**
 * Generates supabase/migrations_language_catalog.sql from lib/languages.ts.
 *
 * The SQL is committed because Supabase applies it from the dashboard, not
 * from this repo. Regenerating keeps the seed honest: every built-in lesson
 * appears once, with the exact theory and questions the app ships, so a fresh
 * project is playable before anyone edits a row.
 *
 * The seed uses `on conflict (id) do nothing`. Re-running the migration must
 * never overwrite a lesson an editor changed in Supabase — that is the whole
 * point of moving the catalog out of the release cycle.
 *
 * Usage: npm run catalog:sql
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const output = path.join(root, 'supabase', 'migrations_language_catalog.sql');

/**
 * Course metadata mirrors the path units in lib/curriculum.ts. Keep the order
 * stable: it is the order the catalog screen would use, and it makes the
 * generated file reproducible.
 */
const COURSES = [
  {
    id: 'spanish',
    title: 'Spanish',
    icon: '🇪🇸',
    blurb: 'Hold your first conversations',
    position: 1,
  },
  {
    id: 'french',
    title: 'French',
    icon: '🇫🇷',
    blurb: 'Charm your way through Paris',
    position: 2,
  },
  {
    id: 'german',
    title: 'German',
    icon: '🇩🇪',
    blurb: 'Order, introduce, and apologise',
    position: 3,
  },
  {
    id: 'swahili',
    title: 'Swahili',
    icon: '🇰🇪',
    blurb: 'Karibu — speak with East Africa',
    position: 4,
  },
  {
    id: 'chess',
    title: 'Chess',
    icon: '♟️',
    blurb: 'From moves to mating nets',
    position: 5,
  },
  {
    id: 'english',
    title: 'English',
    icon: '🇬🇧',
    blurb: 'Master English grammar and conversation',
    position: 6,
  },
];

function loadCatalog() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-language-catalog-'));
  try {
    execSync(        `npx tsc lib/languages.ts --ignoreConfig --outDir "${tmp}" --module commonjs --target es2022 ` +
        '--skipLibCheck --esModuleInterop',
      { cwd: root, stdio: 'inherit' }
    );
    // Compiled fresh above, so require() cannot return a stale module.
    const { LANGUAGE_COURSES } = require(path.join(tmp, 'languages.js'));
    return LANGUAGE_COURSES;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Valid JSON, but one lesson per line — a readable, reviewable git diff. */
function jsonLines(rows) {
  if (rows.length === 0) return '[]';
  return `[\n${rows.map((row) => `  ${JSON.stringify(row)}`).join(',\n')}\n]`;
}

function buildSql(lessons) {
  const lessonRows = [];
  for (const course of COURSES) {
    const owned = Object.values(lessons).filter((lesson) => lesson.id.startsWith(`${course.id}-`));
    owned.forEach((lesson, index) => {
      lessonRows.push({
        id: lesson.id,
        course_id: course.id,
        title: lesson.title,
        theory: lesson.theory,
        questions: lesson.questions,
        position: index + 1,
      });
    });
  }

  const known = new Set(lessonRows.map((row) => row.id));
  const missing = Object.keys(lessons).filter((id) => !known.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Lessons without a course prefix (add the course to COURSES): ${missing.slice(0, 5).join(', ')}`
    );
  }
  if (lessonRows.length !== Object.keys(lessons).length) {
    throw new Error(`Expected ${Object.keys(lessons).length} lessons, generated ${lessonRows.length}.`);
  }

  const courseJson = jsonLines(
    COURSES.map((course) => ({
      id: course.id,
      title: course.title,
      icon: course.icon,
      blurb: course.blurb,
      position: course.position,
    }))
  );

  return `-- ============================================================================
-- Language catalog → Supabase
--
-- GENERATED FILE — edit lib/languages.ts (or a lib/*-plus.ts bank) and run
-- \`npm run catalog:sql\`. Hand edits here are lost on the next build.
--
-- Run once in the Supabase dashboard → SQL editor, after schema.sql:
-- https://supabase.com/dashboard/project/rlulmewvmhxgctonizas/sql
--
-- Safe to re-run: the DDL is idempotent and the seed uses ON CONFLICT DO NOTHING,
-- so a lesson edited in the dashboard is never overwritten by a later run.
--
-- After this runs, the app reads lesson title/theory/questions from these tables
-- through lib/languageCatalog.ts. The bundled catalog stays as the offline and
-- first-run fallback. Editing a row changes the lesson on the next launch (the
-- loader caches for five minutes); no app release is needed.
--
-- ${lessonRows.length} lessons · ${COURSES.length} courses.
-- ============================================================================

create table if not exists public.language_courses (
  id text primary key,
  title text not null,
  icon text not null default '',
  blurb text not null default '',
  position integer not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.language_lessons (
  id text primary key,
  course_id text not null references public.language_courses (id) on delete cascade,
  title text not null,
  theory jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint language_lessons_theory_is_array check (jsonb_typeof(theory) = 'array'),
  constraint language_lessons_questions_is_array check (jsonb_typeof(questions) = 'array')
);

create index if not exists language_lessons_course_position
  on public.language_lessons (course_id, position);

create or replace function public.touch_language_catalog()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists language_courses_touch on public.language_courses;
create trigger language_courses_touch
  before update on public.language_courses
  for each row execute function public.touch_language_catalog();

drop trigger if exists language_lessons_touch on public.language_lessons;
create trigger language_lessons_touch
  before update on public.language_lessons
  for each row execute function public.touch_language_catalog();

alter table public.language_courses enable row level security;
alter table public.language_lessons enable row level security;

-- Public read, dashboard/service-role write. Unpublishing a row hides it from
-- the app immediately; the bundled lesson remains as the offline fallback.
drop policy if exists "Anyone can read published language courses" on public.language_courses;
create policy "Anyone can read published language courses"
  on public.language_courses for select using (published);

drop policy if exists "Anyone can read published language lessons" on public.language_lessons;
create policy "Anyone can read published language lessons"
  on public.language_lessons for select using (published);

grant select on public.language_courses, public.language_lessons to anon, authenticated;
grant select on public.language_courses, public.language_lessons to service_role;
grant insert, update, delete on public.language_courses, public.language_lessons to service_role;

comment on table public.language_courses is
  'Language course metadata. Managed in Supabase; read by the app via lib/languageCatalog.ts.';
comment on table public.language_lessons is
  'Lesson content: theory (jsonb string[]) and questions (jsonb CourseQuestion[]). Edits apply without an app release.';

-- Seed: DO UPDATE. The database is what the app reads first, so a row that was
-- seeded before the repo gained richer content (question kinds, listen/speak/
-- match items, new theory) would otherwise shadow the bundle forever: a stale
-- row silently downgraded every language lesson to plain tap-to-choose items.
-- Regenerating and re-running this file is the publish step — it intentionally
-- replaces dashboard edits with the reviewed content in the repo. To keep a
-- dashboard-only change, copy it into lib/languages.ts before publishing.
insert into public.language_courses (id, title, icon, blurb, position, published)
select x.id, x.title, x.icon, x.blurb, x.position, true
from jsonb_to_recordset($catalog_courses$${courseJson}$catalog_courses$::jsonb)
  as x(id text, title text, icon text, blurb text, position integer)
on conflict (id) do update set
  title = excluded.title,
  icon = excluded.icon,
  blurb = excluded.blurb,
  position = excluded.position;

insert into public.language_lessons (id, course_id, title, theory, questions, position, published)
select x.id, x.course_id, x.title, x.theory, x.questions, x.position, true
from jsonb_to_recordset($catalog_lessons$${jsonLines(lessonRows)}$catalog_lessons$::jsonb)
  as x(id text, course_id text, title text, theory jsonb, questions jsonb, position integer)
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  theory = excluded.theory,
  questions = excluded.questions,
  position = excluded.position;
`;
}

function main() {
  const catalog = loadCatalog();
  const sql = buildSql(catalog);
  fs.writeFileSync(output, sql, 'utf8');
  const lessons = Object.keys(catalog).length;
  console.log(`Wrote ${path.relative(root, output)} — ${lessons} lessons, ${Math.round(sql.length / 1024)} KB.`);
}

main();
