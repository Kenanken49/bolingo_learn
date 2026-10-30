#!/usr/bin/env node
/**
 * Validate the audiobook voice configuration and, optionally, synthesize two
 * short samples with the exact request the Edge Function sends.
 *
 * Default (no network):
 *   node scripts/preview-audiobook-voice.cjs
 *
 * With a TTS key (writes full-mix.mp3 + segment.mp3 + manifest.json):
 *   node --env-file=.env.local scripts/preview-audiobook-voice.cjs --preview
 *   node scripts/preview-audiobook-voice.cjs --preview --out ./.preview-audio
 *
 * Before spending credits, --preview verifies the configured ElevenLabs voice
 * with a read-only GET /v1/voices/{id}. A deleted or moved voice fails clearly
 * before either sample is synthesized and before any output directory is made.
 * OpenAI voice names are built-in and need no provider lookup.
 *
 * The full-mix sample is a short excerpt of the concatenated narration; the
 * segment sample is one question-sized line. They are intentionally short so
 * an editor can verify the voice before spending a full lesson's TTS budget.
 */

'use strict';

/* global __dirname, Buffer -- Node provides these to CommonJS scripts. */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const VOICE_CONFIG = path.join(ROOT, 'supabase', 'functions', '_shared', 'audiobookVoice.ts');
const ENV_FILE = path.join(ROOT, '.env.local');
const ELEVENLABS_API = 'https://api.elevenlabs.io';
const VOICE_LOOKUP_TIMEOUT_MS = 20_000;

function loadVoiceModule() {
  const source = fs.readFileSync(VOICE_CONFIG, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: VOICE_CONFIG,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        .join('\n')
    );
  }
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(mod.exports, require, mod);
  return mod.exports;
}

/** Minimal `.env.local` reader: values are never printed or returned. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    let value = raw.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[key] = value;
  }
}

function usage() {
  console.log(`Usage: node scripts/preview-audiobook-voice.cjs [options]

Options:
  --preview        Verify the voice, then synthesize full-mix.mp3 and segment.mp3
                   (requires TTS_API_KEY; a missing voice fails before credits)
  --out <dir>      Write previews here (default: a fresh OS temp directory)
  --json           Print a machine-readable summary
  --help           Show this message

Configuration comes from TTS_* environment variables, or .env.local.
The same values are used by the process-upload Edge Function.`);
}

function parseArgs(argv) {
  const options = { preview: false, out: null, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--preview') options.preview = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--out needs a directory path.');
      options.out = value;
      i += 1;
    } else {
      throw new Error(`Unknown option "${arg}". Use --help for usage.`);
    }
  }
  return options;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncate(value, max = 300) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function describe(config) {
  return {
    provider: config.provider,
    model: config.modelId,
    voice: config.provider === 'openai' ? config.openaiVoice : config.voiceId,
    outputFormat: config.outputFormat,
    stability: config.stability,
    similarityBoost: config.similarityBoost,
    style: config.style,
    useSpeakerBoost: config.useSpeakerBoost,
    preview: {
      fullMixChars: config.preview.fullMix.length,
      segmentChars: config.preview.segment.length,
    },
  };
}

function providerErrorDetail(data, text, status) {
  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message;
  }
  if (text) return truncate(text, 300);
  return `HTTP ${status}`;
}

/**
 * Read-only provider check. This is intentionally separate from the deployment
 * preflight: a preview only needs the voice to still exist for this key, while
 * the preflight additionally proves workspace ownership/listing.
 */
async function verifyConfiguredVoice(config, apiKey) {
  if (config.provider !== 'elevenlabs') {
    return {
      checked: false,
      reason: 'OpenAI uses built-in voice names; no provider voice-ID lookup is needed.',
    };
  }

  let response;
  try {
    response = await fetch(
      `${ELEVENLABS_API}/v1/voices/${encodeURIComponent(config.voiceId)}`,
      {
        headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(VOICE_LOOKUP_TIMEOUT_MS),
      }
    );
  } catch (e) {
    throw new Error(
      `Could not reach ElevenLabs to verify voice ${config.voiceId}: ` +
        `${e instanceof Error ? e.message : String(e)}. Check your connection and try again.`
    );
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  const detail = providerErrorDetail(data, text, response.status);
  const missing =
    response.status === 404 ||
    (response.status === 400 &&
      /voice.*(?:not.?found|does not exist|doesn't exist|invalid)/i.test(detail));
  if (missing) {
    throw new Error(
      `Voice ${config.voiceId} no longer exists for this ElevenLabs API key (${response.status}). ` +
        'It may have been deleted or moved out of the workspace. Set TTS_VOICE_ID to a current voice before previewing.'
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `ElevenLabs rejected the API key while verifying voice ${config.voiceId} ` +
        `(${response.status}): ${detail}. Check TTS_API_KEY in .env.local.`
    );
  }
  if (!response.ok) {
    throw new Error(
      `Could not verify voice ${config.voiceId} (${response.status}): ${detail}. ` +
        'Fix the provider error before spending credits on a preview.'
    );
  }

  return {
    checked: true,
    name: typeof data?.name === 'string' ? data.name : null,
    category: typeof data?.category === 'string' ? data.category : null,
  };
}

function assertPlayableMp3(bytes, label) {
  if (!bytes || bytes.length < 1024) {
    throw new Error(`${label} preview is only ${bytes ? bytes.length : 0} bytes; expected an MP3.`);
  }
  const id3 = bytes.subarray(0, 3).toString('ascii') === 'ID3';
  const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (!id3 && !frameSync) {
    throw new Error(`${label} preview does not start with an MP3 header.`);
  }
}

async function synthesize(voice, config, text, label, apiKey) {
  const request = voice.buildSpeechRequest(config, text, {
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL,
  });
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`${label} synthesis failed: ${response.status} ${truncate(await response.text())}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  assertPlayableMp3(bytes, label);
  return bytes;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  loadEnvFile(ENV_FILE);

  const voice = loadVoiceModule();
  const config = voice.audiobookVoiceFromEnv(process.env);
  const summary = describe(config);

  if (!options.json) {
    console.log('Audiobook voice configuration');
    console.log(`  provider:       ${summary.provider}`);
    console.log(`  model:          ${summary.model}`);
    console.log(`  voice:          ${summary.voice}`);
    console.log(`  output:         ${summary.outputFormat}`);
    console.log(
      `  voice settings: stability ${summary.stability}, similarity ${summary.similarityBoost}, style ${summary.style}, speaker boost ${summary.useSpeakerBoost}`
    );
    console.log(
      `  preview lines:  full mix ${summary.preview.fullMixChars} chars, segment ${summary.preview.segmentChars} chars`
    );
  }

  if (!options.preview) {
    if (options.json) {
      console.log(JSON.stringify({ ok: true, previewed: false, config: summary }, null, 2));
    } else {
      console.log('\n[ok] configuration is valid (no network call made).');
      console.log('Add --preview to synthesize a full-mix sample and a segment.');
    }
    return;
  }

  const apiKey = (process.env.TTS_API_KEY || process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error(
      'Set TTS_API_KEY (or ELEVENLABS_API_KEY) in .env.local to synthesize a preview. Validation alone needs no key.'
    );
  }

  const voiceCheck = await verifyConfiguredVoice(config, apiKey);
  if (!options.json) {
    if (voiceCheck.checked) {
      console.log(
        `\n[ok] voice verified with ElevenLabs: ${voiceCheck.name ?? config.voiceId}` +
          (voiceCheck.category ? ` (${voiceCheck.category})` : '')
      );
    } else {
      console.log(`\n[ok] ${voiceCheck.reason}`);
    }
  }

  const outDir = options.out
    ? path.resolve(process.cwd(), options.out)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'bolingo-audiobook-preview-'));
  fs.mkdirSync(outDir, { recursive: true });

  const jobs = [
    { key: 'fullMix', label: 'full mix', file: 'full-mix.mp3', text: config.preview.fullMix },
    { key: 'segment', label: 'segment', file: 'segment.mp3', text: config.preview.segment },
  ];
  const files = {};

  for (const job of jobs) {
    if (!options.json) console.log(`\n[..] synthesizing ${job.label} preview…`);
    const bytes = await synthesize(voice, config, job.text, job.label, apiKey);
    const file = path.join(outDir, job.file);
    fs.writeFileSync(file, bytes);
    files[job.key] = { path: file, bytes: bytes.length };
    if (!options.json) console.log(`[ok] ${job.label}: ${file} (${formatBytes(bytes.length)})`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    validated: true,
    provider: config.provider,
    modelId: config.modelId,
    voiceId: config.voiceId,
    openaiVoice: config.openaiVoice,
    voiceCheck,
    outputFormat: config.outputFormat,
    voiceSettings: {
      stability: config.stability,
      similarityBoost: config.similarityBoost,
      style: config.style,
      useSpeakerBoost: config.useSpeakerBoost,
    },
    files,
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (options.json) {
    console.log(JSON.stringify({ ok: true, previewed: true, ...manifest, manifestPath }, null, 2));
  } else {
    console.log(`\n[ok] previews written to ${outDir}`);
    console.log(`[ok] manifest: ${manifestPath}`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
