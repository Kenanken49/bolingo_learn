#!/usr/bin/env node
/**
 * Guards the audio/video content-rights gate.
 *
 * The client collects a four-item checklist and stores an attestation on the
 * upload row; process-upload validates the same version/items before it will
 * process media. This check proves both copies stay aligned, the validators
 * reject incomplete or stale attestations, and the upload path, Edge Function
 * and schema all still contain their gate.
 *
 * Runs inside `npm test`, and directly:
 *   npm run check:rights
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

// Reuse the app's TS transpile hook (the scripts are CommonJS).
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const client = require(path.join(ROOT, 'lib', 'contentRights.ts'));
const server = require(path.join(ROOT, 'supabase', 'functions', '_shared', 'contentRights.ts'));

const failures = [];
const fail = (message) => failures.push(message);
const check = (condition, message) => {
  if (!condition) fail(message);
};

/* ---- The two runtime copies must agree ---- */
check(
  client.CONTENT_RIGHTS_VERSION === server.CONTENT_RIGHTS_VERSION,
  'client/server checklist versions differ.'
);
const clientIds = client.CONTENT_RIGHTS_ITEMS.map((item) => item.id);
check(
  JSON.stringify(clientIds) === JSON.stringify(server.CONTENT_RIGHTS_ITEM_IDS),
  'client/server checklist item ids differ.'
);
check(new Set(clientIds).size === clientIds.length, 'checklist item ids are not unique.');
for (const item of client.CONTENT_RIGHTS_ITEMS) {
  check(typeof item.label === 'string' && item.label.trim().length > 0, `${item.id}: empty label.`);
}
check(clientIds.length >= 3, 'checklist is too short to be a meaningful rights gate.');

/* ---- Client-built attestation ---- */
const allChecked = Object.fromEntries(clientIds.map((id) => [id, true]));
const attestation = client.buildContentRightsAttestation(
  allChecked,
  new Date('2026-10-29T12:00:00.000Z')
);
check(attestation !== null, 'a complete checklist did not produce an attestation.');
if (attestation) {
  check(attestation.version === client.CONTENT_RIGHTS_VERSION, 'attestation version is wrong.');
  check(attestation.confirmedAt === '2026-10-29T12:00:00.000Z', 'confirmedAt is wrong.');
  check(client.hasValidContentRightsAttestation(attestation), 'client rejects its own attestation.');
  check(server.hasValidContentRightsAttestation(attestation), 'server rejects the client attestation.');
}

for (const id of clientIds) {
  const partial = { ...allChecked, [id]: false };
  check(
    client.buildContentRightsAttestation(partial) === null,
    `client accepted a checklist with ${id} unchecked.`
  );
  const broken = attestation
    ? { ...attestation, items: { ...attestation.items, [id]: false } }
    : null;
  check(!client.hasValidContentRightsAttestation(broken), `client accepted ${id} = false.`);
  check(!server.hasValidContentRightsAttestation(broken), `server accepted ${id} = false.`);
}

check(
  !client.hasValidContentRightsAttestation({ ...attestation, version: 'old' }),
  'client accepted an old checklist version.'
);
check(
  !server.hasValidContentRightsAttestation({ ...attestation, version: 'old' }),
  'server accepted an old checklist version.'
);
check(
  !client.hasValidContentRightsAttestation({ ...attestation, confirmedAt: 'not-a-date' }),
  'client accepted an invalid confirmation timestamp.'
);
check(
  !server.hasValidContentRightsAttestation({ ...attestation, confirmedAt: 'not-a-date' }),
  'server accepted an invalid confirmation timestamp.'
);
check(!client.hasValidContentRightsAttestation(null), 'client accepted a missing attestation.');
check(!server.hasValidContentRightsAttestation(null), 'server accepted a missing attestation.');

/* ---- Media detection ---- */
for (const [name, mime] of [
  ['lesson.mp3', 'audio/mpeg'],
  ['voice.wav', 'audio/wav'],
  ['clip.mp4', 'application/octet-stream'],
  ['movie.MOV', 'video/quicktime'],
  ['recording.webm', ''],
]) {
  check(client.isMediaUpload(name, mime), `client did not classify ${name} as media.`);
  check(server.isMediaUpload(name, mime), `server did not classify ${name} as media.`);
}
for (const [name, mime] of [
  ['notes.txt', 'text/plain'],
  ['book.pdf', 'application/pdf'],
  ['scan.jpg', 'image/jpeg'],
]) {
  check(!client.isMediaUpload(name, mime), `client misclassified ${name} as media.`);
  check(!server.isMediaUpload(name, mime), `server misclassified ${name} as media.`);
}

/* ---- The gate is wired into both upload paths and persisted ---- */
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const uploads = read('lib/uploads.ts');
const screen = read('src/app/index.tsx');
const edge = read('supabase/functions/process-upload/index.ts');
const schema = read('supabase/schema.sql');
const migration = read('supabase/migrations_content_rights.sql');

for (const [label, source] of [
  ['lib/uploads.ts', uploads],
  ['src/app/index.tsx', screen],
  ['process-upload', edge],
]) {
  check(source.includes('isMediaUpload'), `${label}: media detection is missing.`);
}
check(uploads.includes('hasValidContentRightsAttestation'), 'client upload lacks the validation gate.');
check(uploads.includes('rights_attestation'), 'client upload does not store the attestation.');
check(uploads.includes('rights_attested_at'), 'client upload does not stamp the confirmation.');
check(screen.includes('CONTENT_RIGHTS_ITEMS'), 'AI Sandbox does not render the checklist.');
check(screen.includes('buildContentRightsAttestation'), 'AI Sandbox does not build an attestation.');
check(
  screen.includes('pickedIsMedia && !rightsComplete'),
  'AI Sandbox does not lock the upload button on an incomplete checklist.'
);
check(screen.includes('Confirm rights to upload'), 'AI Sandbox lacks the locked-button label.');
check(edge.includes('hasValidContentRightsAttestation'), 'Edge Function lacks the server gate.');
check(
  edge.includes('rights_attestation'),
  'Edge Function does not read the stored attestation.'
);
for (const [label, sql] of [
  ['schema.sql', schema],
  ['migrations_content_rights.sql', migration],
]) {
  check(sql.includes('rights_attestation'), `${label}: rights_attestation column is missing.`);
  check(sql.includes('rights_attested_at'), `${label}: rights_attested_at column is missing.`);
}

if (failures.length > 0) {
  console.error('Content-rights check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  `Content-rights gate OK — version ${client.CONTENT_RIGHTS_VERSION}, ${clientIds.length} checklist items, client + server validators aligned.`
);
