/**
 * One place for every support detail the app and the website show.
 *
 * The public address is what learners write to; the inbox is where the owner
 * actually reads it. Keeping both here means the Contact screen, the install
 * page and the server-side notification cannot drift apart.
 */

/** Public support address shown to learners. */
export const SUPPORT_EMAIL = 'support@bolingo.co.ke';

/** Where feedback is delivered for the admin/support team. */
export const FEEDBACK_INBOX = 'bolingolearn@pm.me';

/** Numbers as displayed, with the live dial form beside each one. */
export const SUPPORT_PHONES: { label: string; dial: string; note: string }[] = [
  { label: '+254 711 617 407', dial: '+254711617407', note: 'Support · calls & WhatsApp' },
  { label: '0735 336 030', dial: '+254735336030', note: 'Admin · calls' },
];

export const FEEDBACK_TOPICS: { id: string; label: string }[] = [
  { id: 'account', label: 'Account & sign-in' },
  { id: 'learning', label: 'Lessons & content' },
  { id: 'payment', label: 'Payment & premium' },
  { id: 'bug', label: 'Something is broken' },
  { id: 'idea', label: 'An idea' },
  { id: 'other', label: 'Something else' },
];
