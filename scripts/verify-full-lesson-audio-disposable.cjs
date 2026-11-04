#!/usr/bin/env node
/**
 * Disposable full-lesson audio verification.
 *
 * The full-lesson verifier needs a ready upload plus a generated lesson. This
 * helper creates a throwaway trio (upload -> lesson -> three questions) with
 * the server key, runs `verify-full-lesson-audio.cjs` against it, and deletes
 * the rows in `finally` — after a pass, after a failed verifier run, and after
 * Ctrl+C. No manual upload, SQL, or cleanup step is required.
 *
 * The temporary rows are unowned (`user_id` is null), so they never belong to
 * a learner, and the lesson title carries a disposable marker for recovery if
 * the process is killed with SIGKILL before cleanup can run.
 *
 * Usage:
 *   npm run verify:lesson-audio:disposable -- --plan
 *   npm run verify:lesson-audio:disposable -- --out ./.preview-audio/disposable
 *   npm run verify:lesson-audio:disposable -- --keep --plan
 *
 * The verifier's flags are passed through. `--lesson`, `--upload` and `--list`
 * are rejected because the temporary lesson is always the selection.
 *
 * Exit codes:
 *   0  the verifier passed and every temporary row was removed
 *   1  the verifier failed, cleanup failed, or the Supabase call failed
 *   2  bad CLI usage
 */

'use strict';

/* global __dirname -- Node provides this. */

const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const VERIFIER = path.join(ROOT, 'scripts', 'verify-full-lesson-audio.cjs');
const ENV_FILES = [path.join(ROOT, '.env'), path.join(ROOT, '.env.local')];
const TITLE_PREFIX = 'Disposable audio verification';
const PROMPTS = [
  'Welcome to the disposable audio verification lesson.',
  'The full mix and every segment should use the same licensed voice.',
  'This lesson is removed automatically when the check finishes.',
];

class UsageError extends Error {}

// --- CLI ----------------------------------------------------------------

function usage() {
  console.log(`Usage: node scripts/verify-full-lesson-audio-disposable.cjs [options]

Creates a temporary ready upload, lesson and question set, then runs the
full-lesson verifier against them. The rows are deleted automatically.

Options:
  --plan                  Show the planned TTS jobs without spending credits
  --out <dir>             Write MP3s and manifest here
  --concurrency <1-3>     Parallel TTS requests (default: 1)
  --allow-default-voice   Allow ElevenLabs' stock demo voice (demo only)
  --json                  Pass --json to the verifier
  --keep                  Keep the temporary rows for debugging (prints ids)
  --help                  Show this message

The same SUPABASE_URL / SUPABASE_SECRET_KEY and TTS_* values as the verifier
are read from .env / .env.local. Without --plan this spends TTS credits.`);
}

function parseArgs(argv) {
  const options = { forwarded: [], keep: false, help: false, json: false, plan: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--keep') {
      options.keep = true;
    } else if (arg === '--lesson' || arg === '--upload' || arg === '--list') {
      throw new UsageError(
        `${arg} is managed by this helper; it always verifies the temporary lesson.`
      );
    } else if (arg === '--out' || arg === '--concurrency') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new UsageError(`${arg} needs a value.`);
      if (arg === '--concurrency') {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 3) {
          throw new UsageError('--concurrency must be 1, 2 or 3.');
        }
      }
      options.forwarded.push(arg, value);
      i += 1;
    } else if (arg === '--plan' || arg === '--allow-default-voice' || arg === '--json') {
      options.forwarded.push(arg);
      if (arg === '--plan') options.plan = true;
      if (arg === '--json') options.json = true;
    } else {
      throw new UsageError(`Unknown option "${arg}". Use --help for usage.`);
    }
  }
  return options;
}

// --- environment --------------------------------------------------------

/**
 * Minimal dotenv reader, kept in sync with verify-full-lesson-audio.cjs.
 * Values are assigned to process.env and never logged. Later files win, so
 * `.env.local` overrides `.env`.
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined && process.env[key] !== '') continue;
    let value = raw.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[key] = value;
  }
}

function loadEnv() {
  for (const file of ENV_FILES) loadEnvFile(file);
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim() !== '') {
      return { name, value: value.trim() };
    }
  }
  return null;
}

// --- Supabase REST ------------------------------------------------------

function createSupabase() {
  const url = envValue('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
  const key = envValue('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url) {
    throw new Error('SUPABASE_URL is missing. Add it to .env (server-side only).');
  }
  if (!key) {
    throw new Error(
      'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing. ' +
        'Uploaded lessons are private, so this helper needs a server key.'
    );
  }
  const base = url.value.replace(/\/+$/, '');

  async function request(pathAndQuery, init = {}) {
    const headers = {
      apikey: key.value,
      Authorization: `Bearer ${key.value}`,
      Accept: 'application/json',
      ...(init.headers ?? {}),
    };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${base}${pathAndQuery}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const detail =
        body && typeof body === 'object' && body.message
          ? body.message
          : typeof body === 'string'
            ? body.slice(0, 300)
            : `HTTP ${response.status}`;
      throw new Error(`Supabase query failed (${response.status}): ${detail}`);
    }
    return body;
  }

  const representation = { Prefer: 'return=representation' };

  return {
    async insertUpload(row) {
      return request('/rest/v1/user_uploads?select=id', {
        method: 'POST',
        headers: representation,
        body: JSON.stringify(row),
      });
    },
    async insertLesson(row) {
      return request('/rest/v1/lessons?select=id', {
        method: 'POST',
        headers: representation,
        body: JSON.stringify(row),
      });
    },
    async insertQuestions(rows) {
      return request('/rest/v1/questions?select=id,created_at', {
        method: 'POST',
        headers: representation,
        body: JSON.stringify(rows),
      });
    },
    async deleteQuestions(lessonId) {
      return request(`/rest/v1/questions?lesson_id=eq.${lessonId}&select=id`, {
        method: 'DELETE',
        headers: representation,
      });
    },
    async deleteLesson(lessonId) {
      return request(`/rest/v1/lessons?id=eq.${lessonId}&select=id`, {
        method: 'DELETE',
        headers: representation,
      });
    },
    async deleteUpload(uploadId) {
      return request(`/rest/v1/user_uploads?id=eq.${uploadId}&select=id`, {
        method: 'DELETE',
        headers: representation,
      });
    },
    async lessonsById(lessonId) {
      return request(`/rest/v1/lessons?id=eq.${lessonId}&select=id`);
    },
    async uploadsById(uploadId) {
      return request(`/rest/v1/user_uploads?id=eq.${uploadId}&select=id`);
    },
    async questionsByLesson(lessonId) {
      return request(`/rest/v1/questions?lesson_id=eq.${lessonId}&select=id`);
    },
  };
}

// --- lifecycle ----------------------------------------------------------

function buildTitle(now = new Date()) {
  return `${TITLE_PREFIX} ${now.toISOString()} ${crypto.randomBytes(4).toString('hex')}`;
}

function buildQuestions(baseTime = Date.now()) {
  return PROMPTS.map((prompt, index) => ({
    type: 'multiple-choice',
    prompt,
    options: [prompt, 'A different sentence.'],
    answer: prompt,
    // The verifier reads questions by created_at ascending. Give every row a
    // distinct timestamp so the plan and the full mix always use this order.
    created_at: new Date(baseTime - (PROMPTS.length - index) * 1000).toISOString(),
  }));
}

async function createDisposableLesson(supabase, disposable, log) {
  const title = buildTitle();
  const uploads = await supabase.insertUpload({
    file_name: `disposable-audio-verification-${crypto.randomBytes(4).toString('hex')}.txt`,
    file_url: 'disposable://verify-full-lesson-audio',
    status: 'ready',
  });
  const upload = Array.isArray(uploads) ? uploads[0] : null;
  if (!upload?.id) throw new Error('Creating the temporary upload returned no id.');
  disposable.uploadId = upload.id;
  log(`  upload:    ${disposable.uploadId}`);

  const questions = buildQuestions();
  const content = {
    title,
    summary: 'Temporary lesson generated by the disposable full-lesson audio verifier.',
    questions,
    segments: [],
    verification: {
      disposable: true,
      tool: 'verify-full-lesson-audio-disposable',
      createdAt: new Date().toISOString(),
    },
  };
  const lessons = await supabase.insertLesson({
    title,
    language: 'en',
    level: 1,
    content,
    upload_source_id: disposable.uploadId,
    is_user_generated: true,
  });
  const lesson = Array.isArray(lessons) ? lessons[0] : null;
  if (!lesson?.id) throw new Error('Creating the temporary lesson returned no id.');
  disposable.lessonId = lesson.id;
  disposable.title = title;
  log(`  lesson:    #${disposable.lessonId}`);

  const inserted = await supabase.insertQuestions(
    questions.map((question) => ({
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      answer: question.answer,
      lesson_id: disposable.lessonId,
      created_at: question.created_at,
    }))
  );
  if (!Array.isArray(inserted) || inserted.length !== questions.length) {
    throw new Error(
      `Creating the temporary questions inserted ${inserted?.length ?? 0} of ${questions.length} rows.`
    );
  }
  disposable.questionIds = inserted.map((row) => row.id);
  log(`  questions: ${disposable.questionIds.length}`);
  return disposable;
}

function printKept(disposable, log) {
  log(
    `[keep] left upload ${disposable.uploadId ?? '(none)'}, ` +
      `lesson ${disposable.lessonId ? `#${disposable.lessonId}` : '(none)'} ` +
      `and ${disposable.questionIds.length} question(s) in place.`
  );
  if (disposable.title) log(`[keep] title: ${disposable.title}`);
}

/**
 * Delete the temporary rows and prove they are gone. Intermediate delete
 * failures are tolerated when a cascade or a later delete already removed the
 * row; only rows that still exist (or a read that cannot verify them) count as
 * a cleanup failure.
 */
async function removeDisposableLesson(supabase, disposable, log) {
  if (!disposable.uploadId && !disposable.lessonId) return [];
  const attempts = [];
  async function attempt(label, fn) {
    try {
      await fn();
    } catch (error) {
      attempts.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (disposable.lessonId) {
    await attempt('questions', () => supabase.deleteQuestions(disposable.lessonId));
  }
  if (disposable.lessonId) {
    await attempt('lesson', () => supabase.deleteLesson(disposable.lessonId));
  }
  if (disposable.uploadId) {
    await attempt('upload', () => supabase.deleteUpload(disposable.uploadId));
  }

  const remaining = [];
  try {
    if (disposable.lessonId) {
      const rows = await supabase.lessonsById(disposable.lessonId);
      if (Array.isArray(rows) && rows.length > 0) remaining.push(`lesson #${disposable.lessonId}`);
    }
    if (disposable.lessonId) {
      const rows = await supabase.questionsByLesson(disposable.lessonId);
      if (Array.isArray(rows) && rows.length > 0) {
        remaining.push(`${rows.length} question(s) for lesson #${disposable.lessonId}`);
      }
    }
    if (disposable.uploadId) {
      const rows = await supabase.uploadsById(disposable.uploadId);
      if (Array.isArray(rows) && rows.length > 0) remaining.push(`upload ${disposable.uploadId}`);
    }
  } catch (error) {
    remaining.push(
      `verification could not run: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (remaining.length === 0) {
    log('[cleanup] temporary upload, lesson and questions removed.');
    return [];
  }

  log(`[cleanup] FAILED; still present: ${remaining.join(', ')}`);
  for (const failure of attempts) log(`[cleanup]   previous attempt: ${failure}`);
  if (disposable.title) log(`[cleanup]   title to search for: ${disposable.title}`);
  return remaining;
}

function runVerifier(lessonId, forwarded, onChild) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [VERIFIER, '--lesson', String(lessonId), ...forwarded],
      { cwd: ROOT, env: process.env, stdio: 'inherit' }
    );
    onChild(child);
    child.once('error', reject);
    child.once('close', (code, signal) => {
      onChild(null);
      resolve({ code, signal });
    });
  });
}

// --- main ---------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  if (!fs.existsSync(VERIFIER)) {
    throw new Error(`Verifier not found at ${VERIFIER}.`);
  }

  loadEnv();
  const log = options.json
    ? (...args) => console.error(...args)
    : (...args) => console.log(...args);
  const supabase = createSupabase();

  const disposable = { uploadId: null, lessonId: null, questionIds: [], title: null };
  let child = null;
  let shutdownSignal = null;
  let creation = null;
  let cleaning = null;

  async function cleanupNow() {
    if (cleaning) return cleaning;
    cleaning = (async () => {
      if (creation) {
        try {
          await creation;
        } catch {
          // Partial rows are still in `disposable`; delete what exists.
        }
      }
      if (options.keep) {
        printKept(disposable, log);
        return [];
      }
      return removeDisposableLesson(supabase, disposable, log);
    })();
    return cleaning;
  }

  async function onSignal(signal) {
    if (shutdownSignal) return;
    shutdownSignal = signal;
    if (child && child.exitCode === null) {
      try {
        child.kill(signal);
      } catch {
        child.kill();
      }
    }
    const failures = await cleanupNow();
    process.exitCode = failures.length > 0 ? 1 : signal === 'SIGINT' ? 130 : 143;
  }
  const onSigint = () => void onSignal('SIGINT');
  const onSigterm = () => void onSignal('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  log('Disposable full-lesson audio verification');
  if (!options.plan) {
    log('[warn] this run spends TTS credits (one full mix plus one call per question).');
    log('[warn] use --plan for a free dry run of the same setup and cleanup.');
  }
  log(`  cleanup:   ${options.keep ? 'skipped (--keep)' : 'automatic'}`);

  let verifier = null;
  let cleanupFailures = 0;
  try {
    creation = createDisposableLesson(supabase, disposable, log);
    await creation;
    if (shutdownSignal) return;
    verifier = await runVerifier(disposable.lessonId, options.forwarded, (next) => {
      child = next;
    });
  } finally {
    const failures = await cleanupNow();
    cleanupFailures = failures.length;
    if (cleanupFailures > 0) process.exitCode = 1;
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
  }

  if (shutdownSignal) {
    process.exitCode = process.exitCode || (shutdownSignal === 'SIGINT' ? 130 : 143);
    return;
  }
  if (!verifier || verifier.code !== 0) {
    const detail = verifier?.signal
      ? `was terminated by ${verifier.signal}`
      : `exited with code ${verifier?.code ?? 'unknown'}`;
    console.error(`[FAIL] full-lesson verifier ${detail}.`);
    if (!process.exitCode) process.exitCode = 1;
    return;
  }
  if (cleanupFailures > 0) {
    console.error('[FAIL] the verifier passed, but the temporary rows were not all removed.');
    return;
  }
  log(
    options.keep
      ? '[ok] disposable lesson verified; rows kept because --keep was used.'
      : '[ok] disposable lesson verified; verifier passed and cleanup is complete.'
  );
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof UsageError) {
      console.error(`[usage] ${error.message}`);
      process.exitCode = 2;
      return;
    }
    console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

module.exports = {
  PROMPTS,
  TITLE_PREFIX,
  UsageError,
  buildQuestions,
  buildTitle,
  createDisposableLesson,
  parseArgs,
  removeDisposableLesson,
};
