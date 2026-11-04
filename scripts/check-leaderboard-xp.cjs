#!/usr/bin/env node
/**
 * The weekly leaderboard is only real if the XP ledger accepts writes.
 *
 * `xp_events` was created with row level security and correct owner policies but
 * no table privileges for `authenticated`. PostgREST checks grants before RLS,
 * so every insert from lib/progress.ts returned 403 — silently, because the
 * helper only wrapped the call in try/catch and Supabase resolves with
 * `{ error }`. The board stayed empty for every learner.
 *
 * This gate pins both halves of the fix: the grant exists wherever the schema is
 * applied, and the writer surfaces a failed insert instead of swallowing it.
 *
 * Runs inside `npm run gate` and `npm test`, and directly:
 *   npm run check:leaderboard
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const schema = read('supabase/schema.sql');
const migration = read('supabase/migrations_xp_events_grants.sql');
const progress = read('lib/progress.ts');
const leagues = read('lib/leagues.ts');
const leaderboard = read('src/app/leaderboard.tsx');
const settings = read('src/app/settings.tsx');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const grantPattern = /grant select, insert on public\.xp_events to authenticated;/;

check(
  grantPattern.test(schema),
  'schema.sql: xp_events has no select/insert grant for authenticated, so every XP write returns 403.'
);
check(
  grantPattern.test(migration),
  'migrations_xp_events_grants.sql: existing projects are not given the xp_events grant.'
);
check(
  /grant execute on function public\.get_weekly_leaderboard\(int\) to authenticated;/.test(schema),
  'schema.sql: the weekly board function is not executable by learners.'
);
check(
  /security definer set search_path = public/.test(schema),
  'schema.sql: get_weekly_leaderboard must stay SECURITY DEFINER, or RLS hides every other learner.'
);
check(
  /insert\(\{ user_id: userId, xp \}\)/.test(progress),
  'lib/progress.ts: the XP ledger no longer records the acting user and the XP amount.'
);
check(
  /const \{ error \} = await supabase\.from\('xp_events'\)\.insert/.test(progress) &&
    /if \(error\) console\.warn\('xp_events insert failed/.test(progress),
  'lib/progress.ts: a rejected XP insert is swallowed again, so a broken ledger looks like an empty board.'
);
check(
  /supabase\.rpc\('get_weekly_leaderboard'/.test(leagues),
  'lib/leagues.ts: the board is not read from get_weekly_leaderboard.'
);
check(
  /getWeeklyBoard/.test(leaderboard) && /leagueMates/.test(leaderboard),
  'Leaderboard screen: the ranked board is not rendered for the learner\u2019s own league.'
);

/* ---- A board of "Learner" rows is not a leaderboard ---- */
check(
  /export async function setDisplayName\(/.test(progress),
  'lib/progress.ts: nothing can set the public display name, so every board row reads "Learner".'
);
check(
  /'23505'/.test(progress) && /already taken/.test(progress),
  'lib/progress.ts: a duplicate display name must explain that the name is taken.'
);
check(
  /setDisplayName\(profile\.id, nameDraft\)/.test(settings) &&
    /accessibilityLabel="Your display name"/.test(settings),
  'Settings: there is no field to change the display name shown on the board.'
);

if (failures.length > 0) {
  console.error('Leaderboard XP check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('Leaderboard gate OK — XP writes are granted, failures are reported, the board reads the ranked function.');
