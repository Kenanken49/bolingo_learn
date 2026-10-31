# Content rights for audio and video uploads

Audio and video are different from a pasted text file: they can carry a
speaker's voice, a performer's delivery and a publisher's recording. They
therefore require an explicit content-rights checklist before a media upload is
stored or processed. The AI Sandbox offers audio/video on Premium, but the
checklist must be confirmed before the file is stored and the server re-checks
it before transcription.

This is an audit gate, not a legal determination. The learner remains
responsible for the rights they claim, and Bolingo may remove disputed content.

## The checklist

The checklist lives in [lib/contentRights.ts](../lib/contentRights.ts) and is
mirrored in [supabase/functions/_shared/contentRights.ts](../supabase/functions/_shared/contentRights.ts).
Every item must be checked:

1. **Ownership** — I own this recording or have written permission to use and
   adapt it.
2. **Speaker consent** — every identifiable speaker has consented to
   transcription, lesson generation and synthetic narration.
3. **No third-party material** — this is not a commercial audiobook, course,
   podcast or other third-party recording without documented rights.
4. **Responsibility** — I understand I am responsible for these rights and
   Bolingo may remove content if they are disputed.

The version is `2026-10-29`. Bump it in both files when the checklist changes;
an old attestation is not accepted.

## Where the gate runs

| Layer | Behaviour |
| --- | --- |
| AI Sandbox UI | Shows the checklist for every audio/video pick; the upload button stays locked until every item is checked. |
| `lib/uploads.ts` | Rejects media before the storage upload unless it receives a complete attestation. Text, PDF and photo uploads are unchanged. |
| `user_uploads` | Stores `rights_attestation` (version, timestamp, item booleans) and `rights_attested_at` for audit. |
| `process-upload` | Re-checks the attestation before downloading or extracting the file. A storage webhook or direct database insert cannot skip the gate. |

Transcription only runs after that gate. The provider, signed-URL/bytes split,
transcript cache columns and limits are documented in
[docs/transcription.md](transcription.md); the full transcript is stored on the
learner's private `user_uploads` row and is removed with that row.

## Applying the migration

Fresh installs get the columns from [supabase/schema.sql](../supabase/schema.sql).
Existing projects run once:

```bash
# Supabase dashboard → SQL editor
supabase/migrations_content_rights.sql
supabase/migrations_transcription.sql
```

The first migration only adds `rights_attestation` and `rights_attested_at`; the
second adds the transcript cache/provenance columns. Neither changes the
existing row-level-security policy. Deploy `process-upload` after applying the
migrations so the server-side re-check and transcription path are live:

```bash
npm run deploy:process-upload
```

That command runs the audiobook voice preflight first. A cloned/professional
voice needs `TTS_CONSENT_RECORD`; see
[audiobook-voice.md](audiobook-voice.md#cloned-voice-consent-record).

## Checks

```bash
node scripts/check-content-rights.cjs
```

The guard compares the client/server versions and item ids, exercises both
attestation validators, tests incomplete/stale/forged records, verifies media
detection, and confirms the UI, upload helper, Edge Function, schema and
migration still contain the gate. It runs inside `npm test` as
`npm run check:rights`.

## Retrying old uploads

A media row created before the gate has no attestation and will be rejected by
`process-upload`. Delete that upload and add it again through the AI Sandbox so
the checklist is recorded. Text and PDF rows are unaffected.
