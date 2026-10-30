#!/usr/bin/env node
/**
 * Test-only preload for the audiobook preview harness.
 *
 * The preview command deliberately talks to https://api.elevenlabs.io so the
 * production request path is the one being exercised. This preload runs inside
 * the spawned preview process and rewrites only that origin to a local HTTP
 * stub, leaving the path, query, headers and body untouched. The stub records
 * what the command sent; no real key or network call is used.
 *
 * Enabled by scripts/check-audiobook-voice.cjs through NODE_OPTIONS=--require.
 * Do not use this outside tests.
 */

'use strict';

const stubUrl = (process.env.ELEVENLABS_STUB_URL || '').trim();
if (!stubUrl) {
  throw new Error('ELEVENLABS_STUB_URL is required by the ElevenLabs stub preload.');
}

const realFetch = globalThis.fetch;
const ELEVENLABS_ORIGIN = 'https://api.elevenlabs.io';

globalThis.fetch = (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input && typeof input.url === 'string'
          ? input.url
          : '';

  if (url.startsWith(`${ELEVENLABS_ORIGIN}/`)) {
    return realFetch(`${stubUrl.replace(/\/+$/, '')}${url.slice(ELEVENLABS_ORIGIN.length)}`, init);
  }
  return realFetch(input, init);
};
