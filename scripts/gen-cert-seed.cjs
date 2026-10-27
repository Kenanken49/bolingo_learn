#!/usr/bin/env node
/** Regenerate supabase/seed_certifications.sql from lib/certifications.ts.
 * lib/certifications.ts is the single source of truth (the app runs off it
 * offline). This script parses its project consts + track catalog and emits
 * fresh INSERTs with JSON.stringify-produced JSON — no hand-managed backslash
 * escaping, which is what corrupted the previous seed's stories column.
 * Usage: node scripts/gen-cert-seed.cjs  (run from project root)
 */
const fs = require('fs');

const LIB = 'lib/certifications.ts';
const OUT = 'supabase/seed_certifications.sql';

function splitTop(s) {
  const parts = [];
  let depth = 0, cur = '', quote = null, esc = false;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; }
    else if (ch === '[') { depth++; cur += ch; }
    else if (ch === ']') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Parse a TS single- or double-quoted string literal into its runtime value.
function tq(s) {
  s = s.trim();
  const q = s[0];
  if (!((q === "'" || q === '"') && s.endsWith(q))) throw new Error('not a string: ' + s.slice(0, 60));
  let out = '', esc = false;
  for (const ch of s.slice(1, -1)) {
    if (esc) { out += ch === 'n' ? '\n' : ch; esc = false; }
    else if (ch === '\\') esc = true;
    else out += ch;
  }
  return out;
}

const strlist = (s) => splitTop(s.trim().slice(1, -1)).map(tq);

const src = fs.readFileSync(LIB, 'utf8');

// ---- projects ----
const projects = {};
for (const m of src.matchAll(/const (\w+): CertProject = \{(.*?)\n\};/gs)) {
  const [, name, body] = m;
  const kv = {};
  for (const part of splitTop(body)) {
    const i = part.indexOf(':');
    kv[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  const stories = [...kv.stories.matchAll(/P\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'\)/g)]
    .map((pm) => ({ label: tq(`'${pm[1]}'`), pattern: tq(`'${pm[2]}'`), hint: tq(`'${pm[3]}'`) }));
  projects[name] = {
    id: tq(kv.id), title: tq(kv.title), skills: strlist(kv.skills),
    brief: strlist(kv.brief), starter: tq(kv.starterCode), stories, xp: Number(kv.xp),
  };
}

// ---- tracks ----
const tracks = [...src.matchAll(/\{\n    id: '(.*?)',\n    name: '(.*?)',\n    icon: '(.*?)',\n    blurb: '(.*?)',\n    skills: \[(.*?)\],\n    projects: \[(.*?)\],\n  \}/gs)]
  .map((m) => ({
    id: m[1], name: m[2], icon: m[3], blurb: m[4],
    skills: [...m[5].matchAll(/'(.*?)'/g)].map((x) => x[1]),
    projects: m[6].split(',').map((s) => s.trim()),
  }));

if (tracks.length !== 7) throw new Error('tracks: ' + tracks.length);
if (!tracks.every((t) => t.projects.length === 5)) throw new Error('not 5 per track');
for (const t of tracks) for (const v of t.projects) {
  if (!projects[v]) throw new Error('unknown project ref: ' + v);
}

const sql = (s) => `'${s.replace(/'/g, "''")}'`;
const L = [];
L.push('-- Bolingo Learn: Core Curriculum seed — 7 certification tracks × 5 projects.');
L.push('-- GENERATED FILE — do not hand-edit. Regenerate with:');
L.push('--   node scripts/gen-cert-seed.cjs');
L.push('-- Source of truth: lib/certifications.ts (the app runs off it offline).');
L.push('-- Safe to re-run: DDL uses IF NOT EXISTS, tracks/projects upsert by id.');
L.push('-- Apply with: supabase db query --linked --file supabase/seed_certifications.sql');
L.push('');
L.push('create table if not exists public.certification_tracks (');
L.push('  id text primary key,');
L.push('  name text not null,');
L.push("  icon text not null default '',");
L.push("  blurb text not null default '',");
L.push("  skills jsonb not null default '[]'::jsonb");
L.push(');');
L.push('');
L.push('create table if not exists public.certification_projects (');
L.push('  id text primary key,');
L.push('  track_id text not null references public.certification_tracks (id) on delete cascade,');
L.push('  position integer not null default 0,');
L.push('  title text not null,');
L.push("  skills jsonb not null default '[]'::jsonb,");
L.push("  brief jsonb not null default '[]'::jsonb,");
L.push("  starter_code text not null default '',");
L.push("  stories jsonb not null default '[]'::jsonb,");
L.push('  xp integer not null default 50');
L.push(');');
L.push('');
L.push('alter table public.certification_tracks enable row level security;');
L.push('alter table public.certification_projects enable row level security;');
L.push('');
L.push('drop policy if exists "Anyone can read tracks" on public.certification_tracks;');
L.push('create policy "Anyone can read tracks"');
L.push('  on public.certification_tracks for select using (true);');
L.push('');
L.push('drop policy if exists "Anyone can read cert projects" on public.certification_projects;');
L.push('create policy "Anyone can read cert projects"');
L.push('  on public.certification_projects for select using (true);');
L.push('');
L.push('-- RLS policies alone are not enough: the API roles need table grants.');
L.push('grant select on public.certification_tracks, public.certification_projects to anon, authenticated;');
L.push('');
L.push('-- Tracks ----------------------------------------------------------------');
L.push('insert into public.certification_tracks (id, name, icon, blurb, skills) values');
L.push(tracks.map((t) =>
  `  (${sql(t.id)}, ${sql(t.name)}, ${sql(t.icon)}, ${sql(t.blurb)},\n   ${sql(JSON.stringify(t.skills))})`
).join(',\n'));
L.push('on conflict (id) do update set');
L.push('  name = excluded.name, icon = excluded.icon, blurb = excluded.blurb, skills = excluded.skills;');
L.push('');
L.push('-- Projects (stories mirror lib/certifications.ts patterns) ----------------');
L.push('insert into public.certification_projects (id, track_id, position, title, skills, brief, starter_code, stories, xp) values');
const rows = [];
for (const t of tracks) {
  t.projects.forEach((v, i) => {
    const p = projects[v];
    rows.push(
      `  (${sql(p.id)}, ${sql(t.id)}, ${i + 1}, ${sql(p.title)}, ${sql(JSON.stringify(p.skills))},\n` +
      `   ${sql(JSON.stringify(p.brief))},\n` +
      `   ${sql(p.starter)},\n` +
      `   ${sql(JSON.stringify(p.stories))},\n` +
      `   ${p.xp})`
    );
  });
}
L.push(rows.join(',\n'));
L.push('on conflict (id) do update set');
L.push('  track_id = excluded.track_id, position = excluded.position, title = excluded.title,');
L.push('  skills = excluded.skills, brief = excluded.brief, starter_code = excluded.starter_code,');
L.push('  stories = excluded.stories, xp = excluded.xp;');
L.push('');
fs.writeFileSync(OUT, L.join('\n'));
const nStories = tracks.reduce((n, t) => n + t.projects.reduce((m, v) => m + projects[v].stories.length, 0), 0);
console.log(`wrote ${OUT}: ${tracks.length} tracks, ${rows.length} projects, ${nStories} stories`);
