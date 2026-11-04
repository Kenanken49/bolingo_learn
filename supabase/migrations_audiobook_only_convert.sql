-- Convert an existing upload into an audiobook-only book.
--
-- The "Audiobook only" action in My uploads (src/app/uploads.tsx) deletes a
-- generated lesson's quiz nodes (questions rows, revision pack) and flags the
-- lesson, so the path stops showing revision nodes and plays the full
-- narration as one audiobook under Your Audiobooks instead.
--
-- Deleting questions/revision packs already works: "Users manage own
-- questions" (schema.sql) and "revision_packs delete own"
-- (migrations_materials.sql). What the client could NOT do is flag the
-- lesson: public.lessons only has a SELECT policy. This adds the missing
-- owner-only UPDATE, scoped to generated lessons so curriculum rows
-- (user_id NULL, is_user_generated false) stay read-only.
--
-- Idempotent; safe to re-run in the Supabase dashboard → SQL editor.

drop policy if exists "Users convert own generated lessons" on public.lessons;

create policy "Users convert own generated lessons"
  on public.lessons for update
  using (auth.uid() = user_id and is_user_generated = true)
  with check (auth.uid() = user_id and is_user_generated = true);
