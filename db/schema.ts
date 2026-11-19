import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Postgres tables for features that need a public, server-owned record.
 * Learner accounts, progress and certifications stay in Supabase; these
 * tables only hold what the website must serve to anyone. Migrations live in
 * db/migrations and are applied by `node server/migrate.mjs`.
 */

/** A verified certification. `code` is the public id in /verify/<code>. */
export const credentials = pgTable(
  'credentials',
  {
    id: serial().primaryKey(),
    code: text('code').notNull(),
    userId: text('user_id').notNull(),
    trackId: text('track_id').notNull(),
    trackTitle: text('track_title').notNull(),
    holderName: text('holder_name').notNull(),
    projectsPassed: integer('projects_passed').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('credentials_code_idx').on(t.code),
    uniqueIndex('credentials_user_track_idx').on(t.userId, t.trackId),
  ]
);

/** Entry-level roles posted by admins. Matching uses required certification tracks. */
export const jobListings = pgTable(
  'job_listings',
  {
    id: serial().primaryKey(),
    title: text('title').notNull(),
    employer: text('employer').notNull(),
    location: text('location').notNull(),
    workMode: text('work_mode').notNull(),
    salaryLabel: text('salary_label'),
    description: text('description').notNull(),
    /** Comma-separated certification track ids, e.g. "rwd,js". */
    requiredTracks: text('required_tracks').notNull(),
    applyUrl: text('apply_url').notNull(),
    postedBy: text('posted_by').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }).defaultNow().notNull(),
    closesAt: timestamp('closes_at', { withTimezone: true }),
  },
  (t) => [index('job_listings_posted_idx').on(t.postedAt)]
);
