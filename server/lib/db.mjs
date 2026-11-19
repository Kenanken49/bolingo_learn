/**
 * Postgres access for the public API (credentials, job listings).
 *
 * Coolify provisions a normal Postgres and injects DATABASE_URL, so this is
 * plain `pg` — no platform-specific driver, no service-role key. The pool is
 * created lazily: the app still boots and serves the static site when the
 * database is not configured yet, and /api/health reports that state.
 */
import pg from 'pg';

const { Pool } = pg;

let pool;

function sslConfig() {
  const mode = String(process.env.DATABASE_SSL || '').toLowerCase();
  if (mode === '1' || mode === 'true' || mode === 'require') return { rejectUnauthorized: false };
  // Anything else: let the connection string decide (sslmode=... in DATABASE_URL).
  return undefined;
}

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — the API cannot reach Postgres.');
  }
  pool = new Pool({
    connectionString,
    max: Math.max(1, Number(process.env.DATABASE_POOL_MAX) || 5),
    ssl: sslConfig(),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client error must not take the process down: the next request
  // opens a fresh connection instead.
  pool.on('error', (error) => console.error('[db] idle client error:', error.message));
  return pool;
}

/** Run one parameterised statement and return its rows. */
export async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

export async function closePool() {
  if (!pool) return;
  const closing = pool;
  pool = undefined;
  await closing.end().catch(() => {});
}
