import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

/**
 * Shared ElevenLabs client (SDK added via `npx @elevenlabs/cli onboard`).
 *
 * SERVER/SCRIPTS USE ONLY — the SDK reads ELEVENLABS_API_KEY from the
 * environment (`.env.local`, never committed, never pasted in chat). Do NOT
 * import this file from Expo screens/components: bundling it into the app
 * would ship the secret to every device. On-device and Edge Function paths
 * stay as they are (REST + TTS_API_KEY secret / expo-speech).
 *
 * Run Node scripts with: `node --env-file=.env.local <script>`
 */
let client: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (client) return client;
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'ELEVENLABS_API_KEY is missing. Run scripts with `node --env-file=.env.local` after completing `npx @elevenlabs/cli onboard`.'
    );
  }
  client = new ElevenLabsClient({ apiKey });
  return client;
}
