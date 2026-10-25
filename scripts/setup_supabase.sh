#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Bolingo  Supabase bootstrap
#
# One-time setup: create a Supabase project, then run the SQL below
# against its SQL Editor to create the tables the FastAPI backend uses.
# The backend auto-creates tables at startup via SQLAlchemy (Base.metadata).
# This SQL file also seeds the JSONB lesson type, the storage bucket, and
# a Coffee script for the frontend OAuth client.
# ---------------------------------------------------------------------

set -euo pipefail

echo "Bolingo Supabase bootstrap"
echo "1. Go to https://supabase.com/dashboard and create a new project."
echo "2. Copy the Project URL and anon key from Settings > API into your .env:"
echo "   SUPABASE_URL=<Project URL>"
echo "   SUPABASE_ANON_KEY=<anon key>"
echo "3. Create the storage bucket if needed:"
echo "   supabase storage add-bucket bolingo"
echo "4. Run scripts/supabase_schema.sql in the Supabase SQL Editor."
echo "5. Set SUPABASE_STORAGE_BUCKET=bolingo"
echo "Done."
