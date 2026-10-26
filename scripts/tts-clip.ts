/**
 * Quick ElevenLabs TTS check via the shared SDK client.
 * Compile: npx tsc scripts/tts-clip.ts lib/elevenlabs.ts --ignoreConfig \
 *   --outDir /tmp/tts-build --module commonjs --target es2022 \
 *   --moduleResolution bundler --skipLibCheck --esModuleInterop
 * Run: node --env-file=.env.local /tmp/tts-build/scripts/tts-clip.js "Hello"
 * Writes an .mp3 into the OS temp dir — never the project.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { getElevenLabsClient } from '../lib/elevenlabs';

async function main(): Promise<void> {
  const text = process.argv[2] ?? 'Hello from Bolingo Learn. Your audiobook engine is wired.';
  const out = join(tmpdir(), `bolingo-clip-${Date.now()}.mp3`);

  const stream = await getElevenLabsClient().textToSpeech.convert('21m00Tcm4TlvDq8ikWAM', {
    text,
    modelId: 'eleven_multilingual_v2',
  });
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  await writeFile(out, Buffer.concat(chunks.map((c) => Buffer.from(c))));
  console.log(`Saved clip: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
