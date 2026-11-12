-- Public, server-owned records for the website: verified credentials and the
-- job marketplace. Learner accounts, progress and certifications stay in
-- Supabase. Applied by `node server/migrate.mjs` (tracked in schema_migrations).
CREATE TABLE IF NOT EXISTS "credentials" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"track_id" text NOT NULL,
	"track_title" text NOT NULL,
	"holder_name" text NOT NULL,
	"projects_passed" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "job_listings" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"employer" text NOT NULL,
	"location" text NOT NULL,
	"work_mode" text NOT NULL,
	"salary_label" text,
	"description" text NOT NULL,
	"required_tracks" text NOT NULL,
	"apply_url" text NOT NULL,
	"posted_by" text NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "credentials_code_idx" ON "credentials" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "credentials_user_track_idx" ON "credentials" ("user_id","track_id");
CREATE INDEX IF NOT EXISTS "job_listings_posted_idx" ON "job_listings" ("posted_at");
