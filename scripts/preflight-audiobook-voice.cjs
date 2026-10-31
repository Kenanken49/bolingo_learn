#!/usr/bin/env node
/**
 * Preflight the audiobook voice before deploying process-upload.
 *
 * Validates the shared voice config, resolves the API key's workspace through
 * GET /v1/user, then proves the configured voice exists in that workspace by
 * finding it in GET /v1/voices. A direct GET /v1/voices/{id} alone is not
 * enough: a key can sometimes read a shared/library voice it does not have in
 * its workspace, and that voice is not a safe deployment choice.
 *
 * Usage:
 *   npm run audio:preflight
 *   node --env-file=.env.local scripts/preflight-audiobook-voice.cjs
 *   node scripts/preflight-audiobook-voice.cjs --json
 *   node scripts/preflight-audiobook-voice.cjs --consent ../../secure/voice-consent.json
 *
 * The command makes two or three read-only API calls and spends no credits.
 * It never prints the API key. Exits 1 when the key, workspace, voice or
 * provider guard fails, or when a cloned/professional voice has no completed,
 * active consent record.
 */

'use strict';

/* global __dirname -- Node provides this; fetch is a standard global. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const VOICE_CONFIG = path.join(ROOT, 'supabase', 'functions', '_shared', 'audiobookVoice.ts');
const ENV_FILES = [path.join(ROOT, '.env'), path.join(ROOT, '.env.local')];
const DEFAULT_API_BASE = 'https://api.elevenlabs.io';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_VOICE_PAGES = 20;
const CLONED_VOICE_CATEGORIES = new Set(['cloned', 'professional']);

class UsageError extends Error {}

// --- environment ---------------------------------------------------------

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined && process.env[key] !== '') continue;
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

function loadEnv() {
  for (const file of ENV_FILES) loadEnvFile(file);
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim() !== '') {
      return { name, value: value.trim() };
    }
  }
  return null;
}

// --- cloned-voice consent ------------------------------------------------

function consentField(record, field) {
  const value = record[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`consent record field "${field}" must be a non-empty string.`);
  }
  return value.trim();
}

function consentDate(record, field, { required = true } = {}) {
  const raw = record[field];
  if (raw === undefined || raw === null || raw === '') {
    if (!required) return null;
    throw new Error(`consent record field "${field}" is required.`);
  }
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    throw new Error(`consent record field "${field}" must be a YYYY-MM-DD date.`);
  }
  const value = raw.trim();
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`consent record field "${field}" is not a valid date.`);
  }
  return value;
}

function loadConsentRecord(file) {
  const resolved = path.resolve(process.cwd(), file);
  let text;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch {
    throw new Error(`Could not read the cloned-voice consent record at ${resolved}.`);
  }
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    throw new Error(`The cloned-voice consent record at ${resolved} is not valid JSON.`);
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('The cloned-voice consent record must be a JSON object.');
  }
  return { file: resolved, record };
}

function validateConsentRecord(record, { voiceId, workspaceId }) {
  const recordId = consentField(record, 'recordId');
  consentField(record, 'templateVersion');
  const status = consentField(record, 'status');
  if (status.toLowerCase() !== 'active') {
    throw new Error(`consent record ${recordId} has status "${status}"; it must be "Active".`);
  }
  if (record.completed !== true) {
    throw new Error(`consent record ${recordId} is not marked completed.`);
  }
  const provider = consentField(record, 'provider');
  if (provider.toLowerCase() !== 'elevenlabs') {
    throw new Error(`consent record ${recordId} is for provider "${provider}", not ElevenLabs.`);
  }
  const recordedVoiceId = consentField(record, 'voiceId');
  if (recordedVoiceId !== voiceId) {
    throw new Error(`consent record ${recordId} is for voice ${recordedVoiceId}, not ${voiceId}.`);
  }
  const recordedWorkspaceId = consentField(record, 'workspaceId');
  if (recordedWorkspaceId !== workspaceId) {
    throw new Error(
      `consent record ${recordId} is for workspace ${recordedWorkspaceId}, not ${workspaceId}.`
    );
  }
  const voiceType = consentField(record, 'voiceType');
  if (!/clone/i.test(voiceType)) {
    throw new Error(`consent record ${recordId} voiceType "${voiceType}" is not a clone type.`);
  }
  consentField(record, 'speaker');
  const today = new Date().toISOString().slice(0, 10);
  const signedOn = consentDate(record, 'signedOn');
  if (signedOn > today) {
    throw new Error(`consent record ${recordId} has a future signedOn date (${signedOn}).`);
  }
  const reviewDueOn = consentDate(record, 'reviewDueOn', { required: false });
  if (reviewDueOn && reviewDueOn < today) {
    throw new Error(`consent record ${recordId} is expired (reviewDueOn ${reviewDueOn}).`);
  }
  const approvedBy = consentField(record, 'approvedBy');
  const approvedOn = consentDate(record, 'approvedOn');
  if (approvedOn > today) {
    throw new Error(`consent record ${recordId} has a future approvedOn date (${approvedOn}).`);
  }
  return {
    recordId,
    status: 'Active',
    voiceType,
    signedOn,
    reviewDueOn,
    approvedBy,
    approvedOn,
  };
}

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

// --- CLI ----------------------------------------------------------------

function usage() {
  console.log(`Usage: node scripts/preflight-audiobook-voice.cjs [options]

Options:
  --json                  Print a machine-readable result
  --allow-default-voice   Allow the built-in placeholder voice (demo only)
  --consent <file>        Completed, active cloned-voice consent record (JSON)
  --base-url <url>        Override the ElevenLabs API origin (tests only)
  --help                  Show this message

Reads TTS_* / ELEVENLABS_API_KEY from .env and .env.local. No credits are spent.
A cloned/professional voice also requires --consent, or TTS_CONSENT_RECORD in
the environment. Exits 1 if the key is invalid, the voice is not in the key's
workspace, the provider is not ElevenLabs, or consent is missing/invalid.`);
}

function parseArgs(argv) {
  const options = {
    json: false,
    allowDefaultVoice: false,
    consentPath: null,
    baseUrl: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--allow-default-voice') options.allowDefaultVoice = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--base-url') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new UsageError('--base-url needs a URL.');
      options.baseUrl = value;
      i += 1;
    } else if (arg === '--consent') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new UsageError('--consent needs a file path.');
      options.consentPath = value;
      i += 1;
    } else {
      throw new UsageError(`Unknown option "${arg}". Use --help for usage.`);
    }
  }
  return options;
}

function normalizeApiRoot(value) {
  const root = value.trim().replace(/\/+$/, '');
  return root.endsWith('/v1') ? root.slice(0, -3) : root;
}

// --- ElevenLabs ---------------------------------------------------------

async function apiGet(apiRoot, pathAndQuery, apiKey) {
  const response = await fetch(`${apiRoot}${pathAndQuery}`, {
    headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: response.status, data, text };
}

function errorDetail(result) {
  const detail = result.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message;
  }
  if (result.text) return result.text.slice(0, 300);
  return `HTTP ${result.status}`;
}

async function workspaceVoices(apiRoot, apiKey, voiceId) {
  const voices = [];
  let nextPage = null;
  for (let page = 0; page < MAX_VOICE_PAGES; page += 1) {
    const query = new URLSearchParams({ page_size: '100' });
    if (nextPage) query.set('next_page_token', nextPage);
    const result = await apiGet(apiRoot, `/v1/voices?${query}`, apiKey);
    if (result.status !== 200) {
      throw new Error(
        `Could not list voices for the API key's workspace (${result.status}): ${errorDetail(result)}`
      );
    }
    const batch = Array.isArray(result.data?.voices) ? result.data.voices : [];
    voices.push(...batch);
    if (voices.some((voice) => voice.voice_id === voiceId)) break;
    nextPage = result.data?.next_page_token || result.data?.next_page || null;
    if (!nextPage || batch.length === 0) break;
  }
  return voices;
}

// --- main ---------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  // Stub runs pass their environment explicitly; don't let a local
  // .env.local consent record leak into the gate tests.
  if (!options.baseUrl) loadEnv();

  const voice = loadVoiceModule();
  const config = voice.audiobookVoiceFromEnv(process.env);

  if (config.provider !== 'elevenlabs') {
    throw new Error(
      `This preflight checks an ElevenLabs voice, but TTS_PROVIDER is "${config.provider}". ` +
        'Set TTS_PROVIDER=elevenlabs before deploying the audiobook configuration.'
    );
  }

  if (
    !options.allowDefaultVoice &&
    config.voiceId === voice.AUDIOBOOK_VOICE_DEFAULTS.voiceId
  ) {
    throw new Error(
      'TTS_VOICE_ID is the built-in placeholder voice, not the licensed voice. ' +
        'Set the licensed id in .env.local (or pass --allow-default-voice for a demo-only run).'
    );
  }

  const apiKey = envValue('TTS_API_KEY', 'ELEVENLABS_API_KEY');
  if (!apiKey) {
    throw new Error(
      'No ElevenLabs key found. Set TTS_API_KEY (the deployment secret name) or ' +
        'ELEVENLABS_API_KEY in .env.local.'
    );
  }

  const consentEnv = envValue('TTS_CONSENT_RECORD');
  const consentPath = options.consentPath || (consentEnv ? consentEnv.value : null);
  const consent = consentPath ? loadConsentRecord(consentPath) : null;

  const apiRoot = normalizeApiRoot(
    options.baseUrl || process.env.ELEVENLABS_API_BASE_URL || DEFAULT_API_BASE
  );

  const user = await apiGet(apiRoot, '/v1/user', apiKey.value);
  if (user.status !== 200) {
    throw new Error(
      `ElevenLabs key check failed (${user.status}): ${errorDetail(user)}. ` +
        'The key may be invalid, expired, or a key ID instead of an sk_ secret.'
    );
  }
  const workspaceId = typeof user.data?.workspace_id === 'string' ? user.data.workspace_id : '';
  if (!workspaceId) {
    throw new Error('ElevenLabs /v1/user did not return a workspace_id; cannot confirm workspace membership.');
  }

  const direct = await apiGet(
    apiRoot,
    `/v1/voices/${encodeURIComponent(config.voiceId)}`,
    apiKey.value
  );
  if (direct.status !== 200) {
    throw new Error(
      `Voice ${config.voiceId} was not found with this API key (${direct.status}): ` +
        `${errorDetail(direct)}. Check that the key belongs to the workspace that owns the voice.`
    );
  }

  const voices = await workspaceVoices(apiRoot, apiKey.value, config.voiceId);
  const inWorkspace = voices.some((entry) => entry.voice_id === config.voiceId);
  if (!inWorkspace) {
    throw new Error(
      `Voice ${config.voiceId} is readable directly but is not listed in workspace ${workspaceId}. ` +
        'It is likely a shared or library voice, not a voice owned by this workspace. ' +
        'Use a voice the workspace owns, or add/copy it into the workspace first.'
    );
  }

  const voiceRecord = voices.find((entry) => entry.voice_id === config.voiceId);
  const voiceCategory = String(direct.data?.category ?? voiceRecord?.category ?? '')
    .trim()
    .toLowerCase();
  if (!voiceCategory) {
    throw new Error(
      'Could not determine the voice category from ElevenLabs, so cloned-voice consent ' +
        'cannot be checked. Refusing to validate until the provider returns a category.'
    );
  }

  const requiresConsent = CLONED_VOICE_CATEGORIES.has(voiceCategory);
  if (requiresConsent && !consent) {
    throw new Error(
      `Voice ${config.voiceId} is a cloned voice (${voiceCategory}). The preflight refuses ` +
        'to validate it without a completed, active consent record. Pass --consent <file> ' +
        'or set TTS_CONSENT_RECORD. See docs/voice-consent-record-template.md.'
    );
  }

  let consentSummary = null;
  if (consent) {
    try {
      consentSummary = validateConsentRecord(consent.record, {
        voiceId: config.voiceId,
        workspaceId,
      });
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} Record: ${consent.file}`
      );
    }
  }

  const summary = {
    ok: true,
    provider: config.provider,
    modelId: config.modelId,
    voiceId: config.voiceId,
    outputFormat: config.outputFormat,
    keyName: apiKey.name,
    workspaceId,
    userId: user.data?.user_id ?? null,
    voice: {
      name: direct.data?.name ?? voiceRecord?.name ?? null,
      category: direct.data?.category ?? voiceRecord?.category ?? null,
      isOwner: direct.data?.is_owner ?? voiceRecord?.is_owner ?? null,
      sharingStatus:
        direct.data?.sharing && typeof direct.data.sharing.status === 'string'
          ? direct.data.sharing.status
          : voiceRecord?.sharing && typeof voiceRecord.sharing.status === 'string'
            ? voiceRecord.sharing.status
            : null,
    },
    workspaceVoiceCount: voices.length,
    voiceInWorkspace: true,
    consent: {
      required: requiresConsent,
      provided: Boolean(consentSummary),
      recordId: consentSummary?.recordId ?? null,
      status: consentSummary?.status ?? null,
      signedOn: consentSummary?.signedOn ?? null,
      reviewDueOn: consentSummary?.reviewDueOn ?? null,
      approvedOn: consentSummary?.approvedOn ?? null,
      approvedBy: consentSummary?.approvedBy ?? null,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log('Audiobook voice preflight');
  console.log(`  provider:         ${summary.provider}`);
  console.log(`  model:            ${summary.modelId}`);
  console.log(`  voice id:         ${summary.voiceId}`);
  console.log(`  key:              ${summary.keyName}`);
  console.log(`  workspace:        ${summary.workspaceId}`);
  console.log(`  voice:            ${summary.voice.name ?? '(unnamed)'} (${summary.voice.category ?? 'unknown'})`);
  console.log(`  owner:            ${summary.voice.isOwner === null ? 'unknown' : String(summary.voice.isOwner)}`);
  console.log(`  sharing:          ${summary.voice.sharingStatus ?? 'none'}`);
  console.log(`  workspace voices: ${summary.workspaceVoiceCount}`);
  console.log(
    `  consent:          ${
      consentSummary
        ? `${consentSummary.recordId} (${consentSummary.status}, signed ${consentSummary.signedOn}` +
          `${consentSummary.reviewDueOn ? `, review due ${consentSummary.reviewDueOn}` : ''})`
        : requiresConsent
          ? 'missing'
          : 'not required (voice is not a clone)'
    }`
  );
  console.log('\n[ok] voice exists in this API key\'s workspace.');
}

main().catch((error) => {
  if (error instanceof UsageError) {
    console.error(`[usage] ${error.message}`);
    process.exitCode = 2;
    return;
  }
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
