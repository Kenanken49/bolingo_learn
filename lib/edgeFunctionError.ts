/**
 * The one place that turns a failed `supabase.functions.invoke` into text a learner
 * can act on.
 *
 * supabase-js throws `FunctionsHttpError` for *every* non-2xx with one constant
 * message — "Edge Function returned a non-2xx status code" — and hands the
 * function's own answer over in `error.context` as an unread Response. Reading
 * `error.message` (what all ten call sites used to do) therefore showed that string
 * on ten different screens for ten different reasons: an out-of-credit tutor, an
 * expired session, a phone number Daraja rejects, an undeployed function. The reason
 * the server picked is the one worth showing.
 *
 * Only an HTTP answer from our own function carries curated, learner-safe copy, so:
 *   - every function here answers a failure as `{ error }` — that is what is shown;
 *   - `process-upload` answers its 400/500 as short plain text, so a one-line body
 *     under 160 characters is shown as-is. Anything longer, multi-line or markup
 *     (a gateway HTML error page) is dropped rather than poured into a label or a
 *     `user_uploads.error` row;
 *   - an older functions-js inlined the body in the message instead — still parsed;
 *   - everything else — network failure, relay error, an abort, or a platform
 *     envelope like `{ code: "UNAUTHORIZED_NO_AUTH_HEADER", message: "Missing
 *     authorization header" }` — gets the screen's own fallback wording, because
 *     "Bingo is unreachable right now." helps a learner more than "Failed to fetch".
 *
 * The SDK's constant is never returned. Bodies are displayed, never logged.
 *
 * Pure by design: no React Native import, so `npm run check:adaptive-ai` runs the
 * real function instead of a copy of it.
 */

interface InvokeError {
  message?: string;
  name?: string;
  /** For a non-2xx, supabase-js puts the unread Response for the function's body here. */
  context?: unknown;
}

/** The whole response body can only be read once, so it is read as text and parsed here. */
function errorField(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed.error === 'string' ? parsed.error.trim() : '';
  } catch {
    return '';
  }
}

/** A plain-text body is only worth showing when it reads like one short sentence. */
function oneLineMessage(body: string): string {
  if (body.length > 160 || body.includes('\n') || body.includes('<') || body.includes('{')) return '';
  return /^[A-Za-z0-9]/.test(body) ? body : '';
}

export async function edgeFunctionReason(error: unknown, fallback: string): Promise<string> {
  const err = (error ?? null) as InvokeError | null;

  const response = err?.context as { text?: () => Promise<string> } | undefined;
  if (response && typeof response.text === 'function') {
    const body = ((await response.text().catch(() => '')) ?? '').trim();
    const reason = errorField(body) || oneLineMessage(body);
    if (reason) return reason;
  }

  const raw = (err?.message ?? '').trim();
  if (/^Invalid response \(/.test(raw)) {
    const inlined = errorField(raw.replace(/^Invalid response \(.*?\):/, ''));
    if (inlined) return inlined;
  }

  // Not an HTTP answer from the function, or an HTTP answer with nothing readable in
  // it: keep this screen's own wording. Never echo the SDK's constant.
  if (err?.name !== 'FunctionsHttpError' || /non-2xx status code/i.test(raw)) return fallback;
  return raw || fallback;
}
