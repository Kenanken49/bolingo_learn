/**
 * Server-side content-rights gate for audio/video uploads.
 *
 * Keep CONTENT_RIGHTS_VERSION and CONTENT_RIGHTS_ITEM_IDS aligned with
 * lib/contentRights.ts. scripts/check-content-rights.cjs compares them and
 * exercises both validators, so a checklist change cannot silently accept an
 * old attestation.
 */

export const CONTENT_RIGHTS_VERSION = '2026-10-29';

export const CONTENT_RIGHTS_ITEM_IDS = [
  'ownership',
  'speaker-consent',
  'third-party',
  'responsibility',
] as const;

export type ContentRightsItemId = (typeof CONTENT_RIGHTS_ITEM_IDS)[number];

export const CONTENT_RIGHTS_REQUIRED_MESSAGE =
  'Content-rights confirmation is required before this audio or video upload can be processed.';

const MEDIA_EXTENSIONS =
  /\.(mp3|wav|m4a|ogg|oga|opus|aac|flac|webm|mp4|m4v|mov|mkv|avi|wmv|flv|3gp)$/i;

export function isMediaUpload(fileName: string, mimeType?: string): boolean {
  if (mimeType && /^(audio|video)\//i.test(mimeType.trim())) return true;
  return MEDIA_EXTENSIONS.test(fileName.trim().split('?')[0] ?? '');
}

export function hasValidContentRightsAttestation(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as {
    version?: unknown;
    confirmedAt?: unknown;
    items?: unknown;
  };
  if (candidate.version !== CONTENT_RIGHTS_VERSION) return false;
  if (
    typeof candidate.confirmedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.confirmedAt))
  ) {
    return false;
  }
  if (!candidate.items || typeof candidate.items !== 'object') return false;
  const items = candidate.items as Record<string, unknown>;
  return CONTENT_RIGHTS_ITEM_IDS.every((id) => items[id] === true);
}
