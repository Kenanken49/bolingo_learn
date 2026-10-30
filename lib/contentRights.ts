/**
 * Content-rights checklist for audio/video uploads.
 *
 * The checklist is deliberately short and explicit. The client requires every
 * item; the upload row stores the signed attestation so the Edge Function can
 * reject media that bypassed the UI. This is an audit record, not a legal
 * determination — the user remains responsible for the rights they claim.
 */

export const CONTENT_RIGHTS_VERSION = '2026-10-29';

export const CONTENT_RIGHTS_ITEMS = [
  {
    id: 'ownership',
    label: 'I own this recording or have written permission to use and adapt it.',
  },
  {
    id: 'speaker-consent',
    label: 'Every identifiable speaker has consented to transcription, lesson generation and synthetic narration.',
  },
  {
    id: 'third-party',
    label: 'This is not a commercial audiobook, course, podcast or other third-party recording without documented rights.',
  },
  {
    id: 'responsibility',
    label: 'I understand I am responsible for these rights and Bolingo may remove content if they are disputed.',
  },
] as const;

export type ContentRightsItemId = (typeof CONTENT_RIGHTS_ITEMS)[number]['id'];
export type ContentRightsChecks = Partial<Record<ContentRightsItemId, boolean>>;

export interface ContentRightsAttestation {
  version: string;
  confirmedAt: string;
  items: Record<ContentRightsItemId, boolean>;
}

export const CONTENT_RIGHTS_REQUIRED_MESSAGE =
  'Confirm every content-rights item before uploading audio or video.';

const MEDIA_EXTENSIONS =
  /\.(mp3|wav|m4a|ogg|oga|opus|aac|flac|webm|mp4|m4v|mov|mkv|avi|wmv|flv|3gp)$/i;

/** Audio/video by MIME or extension; either signal is enough to require consent. */
export function isMediaUpload(fileName: string, mimeType?: string): boolean {
  if (mimeType && /^(audio|video)\//i.test(mimeType.trim())) return true;
  return MEDIA_EXTENSIONS.test(fileName.trim().split('?')[0] ?? '');
}

export function buildContentRightsAttestation(
  checks: ContentRightsChecks,
  now: Date = new Date()
): ContentRightsAttestation | null {
  const items = {} as Record<ContentRightsItemId, boolean>;
  for (const item of CONTENT_RIGHTS_ITEMS) {
    if (checks[item.id] !== true) return null;
    items[item.id] = true;
  }
  return {
    version: CONTENT_RIGHTS_VERSION,
    confirmedAt: now.toISOString(),
    items,
  };
}

export function hasValidContentRightsAttestation(
  value: unknown
): value is ContentRightsAttestation {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ContentRightsAttestation>;
  if (candidate.version !== CONTENT_RIGHTS_VERSION) return false;
  if (typeof candidate.confirmedAt !== 'string' || Number.isNaN(Date.parse(candidate.confirmedAt))) {
    return false;
  }
  if (!candidate.items || typeof candidate.items !== 'object') return false;
  return CONTENT_RIGHTS_ITEMS.every((item) => candidate.items?.[item.id] === true);
}
