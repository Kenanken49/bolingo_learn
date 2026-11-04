// Supabase Edge Function: fetch-text
//
// The classics shelf (and any web client) reads public-domain ebook text
// hosted on sites that send no CORS headers (LoyalBooks, Gutenberg,
// archive.org). Browsers block that cross-origin fetch, so the app would show
// "Failed to fetch" on web while native (expo-file-system, no CORS) works.
// This function refetches the bytes server-side and returns them with
// Access-Control-Allow-Origin: *, so web can read the same texts in-app.
//
// GET /fetch-text?url=<encoded https URL>
//   - Host allowlist only: www.loyalbooks.com, www.gutenberg.org,
//     gutenberg.org, archive.org. Nothing else is fetched, ever.
//   - Only .txt / plain-text responses are proxied; HTML pages are rejected
//     so the endpoint cannot be used to scrape arbitrary pages.
//   - 2 MB cap, 25 s upstream timeout.
//
// Deploy with: supabase functions deploy fetch-text

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_HOSTS = new Set([
  'www.loyalbooks.com',
  'loyalbooks.com',
  'www.gutenberg.org',
  'gutenberg.org',
  'archive.org',
  'www.archive.org',
]);

const MAX_BYTES = 2 * 1024 * 1024;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let target: URL;
  try {
    const raw = new URL(req.url).searchParams.get('url') ?? '';
    target = new URL(raw);
  } catch {
    return new Response('Missing or invalid ?url=', { status: 400, headers: corsHeaders });
  }
  if (target.protocol !== 'https:') {
    return new Response('Only https URLs are proxied.', { status: 400, headers: corsHeaders });
  }
  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) {
    return new Response(`Host not allowed: ${target.hostname}`, { status: 403, headers: corsHeaders });
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25_000);
    let upstream: Response;
    try {
      upstream = await fetch(target.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BolingoLearn-classics/1.0)' },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
    if (!upstream.ok) {
      return new Response(`Upstream failed: HTTP ${upstream.status}`, { status: 502, headers: corsHeaders });
    }
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!/text\/plain|text\/txt|application\/octet-stream/i.test(contentType)) {
      return new Response(`Only plain text is proxied (got ${contentType || 'unknown type'}).`, {
        status: 415,
        headers: corsHeaders,
      });
    }
    const buf = new Uint8Array(await upstream.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return new Response('Text is larger than the 2 MB proxy cap.', { status: 413, headers: corsHeaders });
    }
    return new Response(buf, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return new Response(`Fetch failed: ${reason.slice(0, 200)}`, { status: 502, headers: corsHeaders });
  }
});
