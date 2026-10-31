/* global __dirname -- Node CJS globals. */

/**
 * Kiki v3 analytics — calibration report from live learner data.
 *
 * Reads public.kiki_attempts (service-role, read-only) and reports:
 *   1. Coverage — rows, learners, date span, per-type (MCQ/BUILD) counts.
 *   2. Calibration — decile bins of predicted_p vs actual success rate,
 *      Brier score + skill vs a constant predictor.
 *   3. Guess-floor validation — actual success rate on the hardest decile
 *      per type, compared against the locked GUESS_MCQ / GUESS_BUILD in
 *      lib/kiki.ts (parsed, not duplicated). This is the live-learner check
 *      the simulation could never do: is BUILD really ~0.12 guessable?
 *
 * Verdicts require n>=100 per type, else INSUFFICIENT DATA (never a false
 * FLAG on thin data). Missing/empty table exits 2 with apply instructions.
 *
 * 4. Tutor guardrail — aggregates public.bingo_votes by (lesson, prompt):
 *   worst contexts (helpful rate < 50%, n>=min-votes) are flagged for
 *   strongFirst routing or Kamusi fallback. This is where the 1.5B's
 *   terminology fumbles show up as data instead of anecdotes.
 *
 * Usage:
 *   node scripts/kiki-calibrate.cjs [--since YYYY-MM-DD] [--min-n 100] [--min-votes 5]
 *
 * Env (from .env, never committed): SUPABASE_URL + SUPABASE_SECRET_KEY.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch { /* no .env */ }
  return out;
}

function lockedConstants() {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'kiki.ts'), 'utf8');
  const grab = (name) => {
    const m = src.match(new RegExp(`const ${name} = ([0-9.]+);`));
    if (!m) throw new Error(`locked constant ${name} not found in lib/kiki.ts`);
    return parseFloat(m[1]);
  };
  return { MCQ: grab('GUESS_MCQ'), BUILD: grab('GUESS_BUILD') };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const brier = (rows) => mean(rows.map((r) => (r.predicted_p - (r.correct ? 1 : 0)) ** 2));

function summarize(rows) {
  const n = rows.length;
  const meanP = mean(rows.map((r) => r.predicted_p));
  const meanA = mean(rows.map((r) => (r.correct ? 1 : 0)));
  const b = brier(rows);
  const b0 = meanA * (1 - meanA); // constant predictor at the base rate
  return { n, meanP, meanA, brier: b, skill: b0 > 0 ? 1 - b / b0 : NaN };
}

function bins(rows, k = 10) {
  const sorted = [...rows].sort((a, b) => a.predicted_p - b.predicted_p);
  const out = [];
  for (let i = 0; i < k; i++) {
    const slice = sorted.slice(Math.floor((i * sorted.length) / k), Math.floor(((i + 1) * sorted.length) / k));
    if (!slice.length) continue;
    out.push({
      lo: slice[0].predicted_p,
      hi: slice[slice.length - 1].predicted_p,
      n: slice.length,
      meanP: mean(slice.map((r) => r.predicted_p)),
      meanA: mean(slice.map((r) => (r.correct ? 1 : 0))),
    });
  }
  return out;
}

/**
 * Tutor guardrail aggregation: group helpfulness votes by lesson context,
 * keep contexts with enough votes, flag sub-50% helpful rates worst-first.
 * Pure (no I/O) so --self-test covers it deterministically.
 */
function worstContexts(votes, minN) {
  const by = new Map();
  for (const v of votes) {
    const k = `${v.lesson_title || ''}|||${v.prompt || ''}`;
    let e = by.get(k);
    if (!e) { e = { lesson: v.lesson_title || '', prompt: v.prompt || '', n: 0, helpful: 0 }; by.set(k, e); }
    e.n += 1;
    if (v.helpful) e.helpful += 1;
  }
  return [...by.values()]
    .filter((e) => e.n >= minN)
    .map((e) => ({ ...e, rate: e.helpful / e.n }))
    .filter((e) => e.rate < 0.5)
    .sort((a, b) => a.rate - b.rate || b.n - a.n);
}

async function reportTutorGuardrail(db, sinceArg, minVotes) {
  console.log('\n--- Tutor guardrail (bingo_votes) ---');
  const PAGE = 1000;
  let votes = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from('bingo_votes').select('lesson_title,prompt,helpful,created_at').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (sinceArg) q = q.gte('created_at', sinceArg);
    const { data, error } = await q;
    if (error) {
      if (error.code === '42P01' || /does not exist|not find/i.test(error.message)) {
        console.log('bingo_votes not applied yet — run supabase/migrations_bingo_votes.sql, then re-run.');
        return;
      }
      console.log('bingo_votes unreadable:', error.message);
      return;
    }
    if (!data || !data.length) break;
    votes = votes.concat(data);
    if (data.length < PAGE) break;
  }
  if (!votes.length) {
    console.log('No helpfulness votes yet. Tap thumbs up/down on Bingo answers signed-in, then re-run.');
    console.log('Verdict tutor: INSUFFICIENT DATA (table live, zero votes).');
    return;
  }
  const helpful = votes.filter((v) => v.helpful).length;
  console.log(`votes=${votes.length} helpful=${helpful} rate=${(helpful / votes.length).toFixed(3)}`);
  const worst = worstContexts(votes, minVotes);
  if (!worst.length) {
    console.log(`No context below 50% with n>=${minVotes} — small model holding everywhere measured.`);
    console.log('Verdict tutor: CONFIRMED — no fumble context found.');
    return;
  }
  console.log(`worst contexts (helpful rate asc, n>=${minVotes}):`);
  for (const e of worst.slice(0, 10)) {
    console.log(`  ${e.rate.toFixed(2)} helpful (n=${e.n}) · ${e.lesson} — ${e.prompt.slice(0, 80)}`);
  }
  console.log('Verdict tutor: FLAG — contexts above merit strongFirst routing or Kamusi fallback.');
}

async function main() {
  const args = process.argv.slice(2);
  const flagArg = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  };
  const sinceArg = flagArg('--since');
  const minNArg = flagArg('--min-n');
  const MIN_N = minNArg ? parseInt(minNArg, 10) : 100;
  const minVotesArg = flagArg('--min-votes');
  const MIN_VOTES = minVotesArg ? parseInt(minVotesArg, 10) : 5;
  const env = { ...loadEnv(), ...process.env };
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY (see .env). Nothing queried.');
    process.exit(2);
  }
  const { createClient } = require('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Paginated pull (service role bypasses RLS; read-only usage here).
  const PAGE = 1000;
  const CAP = 200000;
  let rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from('kiki_attempts').select('user_id,skill,is_build,predicted_p,correct,created_at').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (sinceArg) q = q.gte('created_at', sinceArg);
    const { data, error } = await q;
    if (error) {
      if (/permission denied/i.test(error.message)) {
        console.error('Service key is valid but lacks a table grant (42501).');
        console.error('Run once in Supabase dashboard → SQL editor:');
        console.error('  grant select on public.kiki_attempts to service_role;');
        process.exit(2);
      }
      if (error.code === '42P01' || /does not exist|not find/i.test(error.message)) {
        console.error('Table public.kiki_attempts is missing.');
        console.error('Apply it once: Supabase dashboard → SQL editor → paste the');
        console.error('"Kiki v3 analytics" block from supabase/schema.sql → Run.');
        process.exit(2);
      }
      if (/invalid api key/i.test(error.message)) { console.error('Invalid SUPABASE_SECRET_KEY: copy the Secret key from Supabase dashboard Settings > API into .env (never commit it).'); } console.error('Query failed:', error.message);
      process.exit(1);
    }
    if (!data || !data.length) break;
    rows = rows.concat(data);
    if (data.length < PAGE || rows.length >= CAP) break;
  }

  const locked = lockedConstants();
  console.log(`Kiki calibration — ${rows.length} attempts${sinceArg ? ` since ${sinceArg}` : ''}`);
  // Guardrail always reports (votes can predate attempts) — never gated.
  await reportTutorGuardrail(db, sinceArg, MIN_VOTES);
  if (!rows.length) {
    console.log('No attempts logged yet. Play a lesson signed-in, then re-run.');
    console.log('Verdict: INSUFFICIENT DATA (table live, zero rows).');
    return;
  }
  const users = new Set(rows.map((r) => r.user_id)).size;
  const span = [rows[0].created_at, rows[rows.length - 1].created_at];
  console.log(`learners=${users} span=${span[0]}..${span[1]}`);

  const overall = summarize(rows);
  console.log(`overall: n=${overall.n} meanP=${overall.meanP.toFixed(3)} meanA=${overall.meanA.toFixed(3)} brier=${overall.brier.toFixed(4)} skill=${Number.isNaN(overall.skill) ? 'n/a' : overall.skill.toFixed(3)}`);
  if (!Number.isNaN(overall.skill) && overall.skill < 0) {
    console.log('WARN: negative Brier skill — predictions worse than the base rate. Investigate before trusting Goldilocks.');
  }

  for (const [label, isBuild, lockKey] of [['MCQ', false, 'MCQ'], ['BUILD', true, 'BUILD']]) {
    const sub = rows.filter((r) => r.is_build === isBuild);
    const s = summarize(sub);
    console.log(`\n${label}: n=${s.n} meanP=${s.meanP.toFixed(3)} meanA=${s.meanA.toFixed(3)} brier=${s.brier.toFixed(4)} skill=${Number.isNaN(s.skill) ? 'n/a' : s.skill.toFixed(3)}`);
    for (const b of bins(sub)) {
      console.log(`  p∈[${b.lo.toFixed(2)},${b.hi.toFixed(2)}] n=${b.n} pred=${b.meanP.toFixed(3)} actual=${b.meanA.toFixed(3)} gap=${(b.meanA - b.meanP >= 0 ? '+' : '') + (b.meanA - b.meanP).toFixed(3)}`);
    }
    if (s.n < MIN_N) {
      console.log(`Verdict ${label}: INSUFFICIENT DATA (n=${s.n} < ${MIN_N}).`);
      continue;
    }
    // Empirical guess floor: hardest decile by stated win chance.
    const hard = [...sub].sort((a, b) => a.predicted_p - b.predicted_p).slice(0, Math.max(1, Math.floor(sub.length / 10)));
    const floor = mean(hard.map((r) => (r.correct ? 1 : 0)));
    const lockedVal = locked[lockKey];
    const diff = floor - lockedVal;
    console.log(`hardest-decile actual=${floor.toFixed(3)} (n=${hard.length}) vs locked GUESS_${lockKey}=${lockedVal.toFixed(2)} (diff=${diff >= 0 ? '+' : ''}${diff.toFixed(3)})`);
    if (Math.abs(diff) <= 0.06) {
      console.log(`Verdict ${label}: CONFIRMED — live floor matches the locked rate.`);
    } else {
      console.log(`Verdict ${label}: FLAG — live data suggests ~${floor.toFixed(2)}, locked is ${lockedVal.toFixed(2)}. Re-run scripts/kiki-tune-mixed.cjs centered here, or accept the noise model is off.`);
    }
  }
}

if (process.argv.includes('--self-test')) {
  const A = (c, m) => { if (!c) { console.error('SELF-TEST FAIL: ' + m); process.exit(1); } };
  const fake = [];
  for (let i = 0; i < 200; i++) { const p = (i % 10) / 10 + 0.05; fake.push({ predicted_p: p, correct: ((i * 7919) % 100) < p * 100, is_build: i % 2 === 0, user_id: 'u' + (i % 5), skill: 'js', created_at: '2026-01-01' }); }
  const s = summarize(fake);
  A(s.n === 200, 'n');
  A(Math.abs(s.meanP - 0.5) < 0.01, 'meanP');
  A(bins(fake, 10).length === 10, 'bins');
  A(s.skill > 0, 'brier skill positive on calibrated fakes');
  const fv = [];
  for (let i = 0; i < 10; i++) fv.push({ lesson_title: 'Spanish Past Stories', prompt: 'Hable?', helpful: i < 2 });
  for (let i = 0; i < 3; i++) fv.push({ lesson_title: 'Swahili Basics', prompt: 'Hi?', helpful: true });
  const w = worstContexts(fv, 5);
  A(w.length === 1 && w[0].lesson === 'Spanish Past Stories' && Math.abs(w[0].rate - 0.2) < 1e-9, 'worstContexts flags sub-50% context');
  A(worstContexts(fv, 20).length === 0, 'worstContexts respects minN');
  A(worstContexts(fv.map((v) => ({ ...v, helpful: true })), 5).length === 0, 'worstContexts ignores healthy contexts');
  console.log('SELF-TEST PASS: summarize/bins/verdict/guardrail math OK');
  process.exit(0);
}
main().catch((e) => {
  console.error('Calibration failed:', e && e.message ? e.message : e);
  process.exit(1);
});
