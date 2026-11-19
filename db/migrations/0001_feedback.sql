-- Feedback submitted from the Contact screen (app) and bolingo.co.ke/contact (web).
-- Kept on the site's own Postgres so a message is never lost when no email
-- provider is configured: the row lands first, delivery is attempted second.
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" serial PRIMARY KEY,
	"name" text,
	"email" text NOT NULL,
	"phone" text,
	"topic" text NOT NULL DEFAULT 'other',
	"message" text NOT NULL,
	"page" text,
	"delivery" text NOT NULL DEFAULT 'stored',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "feedback_created_idx" ON "feedback" ("created_at");
