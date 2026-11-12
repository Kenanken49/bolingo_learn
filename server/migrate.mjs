#!/usr/bin/env node
/**
 * Apply `db/migrations/*.sql` to the Postgres behind DATABASE_URL.
 *
 *   node server/migrate.mjs                 # apply what is pending
 *   MIGRATE_ON_START=1 node server/index.mjs # apply, then boot (single replica)
 *
 * Files run in filename order, each in its own transaction, and are recorded
 * in `schema_migrations` so a redeploy is a no-op. An advisory lock keeps two
 * containers from migrating at the same time.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closePool, getPool } from './lib/db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.resolve(HERE, '..', 'db', 'migrations');
const LOCK_KEY = 815_422_001; // arbitrary, stable: one migration runner at a time

export async function runMigrations({ log = console.log } = {}) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamp with time zone DEFAULT now() NOT NULL
       )`
    );
    const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const pending = files.filter((f) => !done.has(f));
    if (pending.length === 0) {
      log(`Migrations: ${files.length} applied, nothing pending.`);
      return { applied: [] };
    }
    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`Migrations: applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`${file}: ${error.message}`);
      }
    }
    return { applied: pending };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  if (!process.env.DATABASE_URL) {
    console.error('migrate: DATABASE_URL is not set.');
    process.exit(1);
  }
  runMigrations()
    .then(async (result) => {
      await closePool();
      process.exit(result.applied.length > 0 ? 0 : 0);
    })
    .catch(async (error) => {
      console.error('migrate failed:', error.message);
      await closePool();
      process.exit(1);
    });
}
