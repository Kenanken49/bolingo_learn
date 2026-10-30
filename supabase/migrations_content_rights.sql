-- ---------------------------------------------------------------------------
-- Content-rights gate for audio/video uploads
-- ---------------------------------------------------------------------------
-- The checklist is enforced in the client (lib/contentRights.ts) and again in
-- process-upload (_shared/contentRights.ts). This table stores the signed
-- attestation for audit; it is null for text, PDF and photo uploads.
--
-- Safe to re-run.
alter table public.user_uploads
  add column if not exists rights_attestation jsonb,
  add column if not exists rights_attested_at timestamptz;

comment on column public.user_uploads.rights_attestation is
  'Signed content-rights checklist for audio/video uploads: { version, confirmedAt, items }.';
comment on column public.user_uploads.rights_attested_at is
  'When the client recorded the content-rights confirmation.';
