CREATE TABLE "credentials" (
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
--> statement-breakpoint
CREATE TABLE "job_listings" (
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
--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_code_idx" ON "credentials" ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_user_track_idx" ON "credentials" ("user_id","track_id");--> statement-breakpoint
CREATE INDEX "job_listings_posted_idx" ON "job_listings" ("posted_at");