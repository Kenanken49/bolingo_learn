#!/usr/bin/env node
/**
 * Guards the upload pipeline against the two failures that made uploads die
 * without a usable explanation:
 *
 *   1. A picker URI that copied across as 0 bytes was uploaded anyway, so the
 *      learner got "PDFDocument: stream must have data" (or a bare red dot).
 *   2. A full-length book was parsed page by page until the 256 MB isolate was
 *      killed; because the worker died mid-flight, nothing recorded a reason
 *      and the row showed `failed` with `error = null`.
 *
 * The fixes are only real if all four surfaces keep them: the sandbox screen,
 * the upload helper, the retry control and the Edge Function. This check pins
 * each one, plus the invariant that every `failed` write carries a reason.
 *
 * Runs inside `npm run gate` and `npm test`, and directly:
 *   npm run check:uploads
 */
'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const edge = read('supabase/functions/process-upload/index.ts');
const uploads = read('lib/uploads.ts');
const sandbox = read('src/app/index.tsx');
const uploadsScreen = read('src/app/uploads.tsx');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
// Truthy passthrough so a regex can be asserted inline without re-matching.
const extractOnce = (pattern) => (pattern.test(edge) ? pattern : null);

/* ---- Edge Function: an empty object must never reach the parser ---- */
const emptyGuard = edge.indexOf('bytes.length === 0');
const pdfBranch = edge.indexOf("lower.endsWith('.pdf')");
check(emptyGuard !== -1, 'process-upload: no 0-byte guard before text extraction.');
check(
  emptyGuard !== -1 && pdfBranch !== -1 && emptyGuard < pdfBranch,
  'process-upload: the 0-byte guard must run before the PDF parser.'
);
check(
  /arrived empty \(0 bytes\)/.test(edge),
  'process-upload: the 0-byte failure does not explain what to do next.'
);

/* ---- Edge Function: a book is parsed only as far as anything reads ---- */
check(
  /const MAX_EXTRACT_CHARS = (\d+);/.test(edge),
  'process-upload: MAX_EXTRACT_CHARS is missing.'
);
const extractChars = Number((edge.match(/const MAX_EXTRACT_CHARS = (\d+);/) ?? [])[1]);
check(
  /const PDF_MAX_PAGES = Math\.ceil\(MAX_EXTRACT_CHARS \/ (\d+)\);/.test(edge),
  'process-upload: PDF_MAX_PAGES is not derived from MAX_EXTRACT_CHARS.'
);
const charsPerPage = Number(
  (edge.match(/const PDF_MAX_PAGES = Math\.ceil\(MAX_EXTRACT_CHARS \/ (\d+)\);/) ?? [])[1]
);
check(
  Number.isFinite(charsPerPage) && charsPerPage > 0 && charsPerPage <= 1200,
  'process-upload: the per-page character budget is unrealistically dense, so too few pages get parsed.'
);
check(
  Number.isFinite(extractChars) && extractChars > 0 && extractChars / charsPerPage >= 20,
  'process-upload: the PDF page cap is too small to fill the text window.'
);
check(
  /pdfParse\(bytes, \{ max: PDF_MAX_PAGES \}\)/.test(edge),
  'process-upload: pdf-parse is not called with the page cap (a whole book can kill the isolate).'
);
const pdfParseIndex = edge.indexOf('pdfParse(bytes');
const sizeGuardIndex = edge.indexOf('bytes.length > MAX_PDF_BYTES');
check(
  sizeGuardIndex !== -1 && sizeGuardIndex < pdfParseIndex,
  'process-upload: the PDF size ceiling must be checked before parsing.'
);
check(
  /const MAX_PDF_BYTES = \d+ \* 1024 \* 1024;/.test(edge),
  'process-upload: MAX_PDF_BYTES is missing.'
);
check(
  /no text layer/.test(edge),
  'process-upload: a scanned PDF still reports the old, unactionable message.'
);

/* ---- One unreachable model must not fail every upload ---- */
check(
  /function llmBackends\(\): LlmBackend\[\]/.test(edge),
  'process-upload: quiz generation no longer builds an ordered list of LLM backends.'
);
check(
  extractOnce(/const fallbackUrl = Deno\.env\.get\('LLM_FALLBACK_URL'\)/) !== null,
  'process-upload: the fallback model is not part of quiz generation.'
);
check(
  /for \(const backend of backends\)/.test(edge),
  'process-upload: quiz generation does not try each backend in turn.'
);
check(
  /The lesson model did not answer/.test(edge) && /problems\.join\(' \| '\)/.test(edge),
  'process-upload: a total LLM failure does not name each attempt.'
);
const llmTimeout = Number((edge.match(/const LLM_TIMEOUT_MS = (\d+)_000;/) ?? [])[1]);
check(
  Number.isFinite(llmTimeout) && llmTimeout > 0 && llmTimeout <= 60,
  'process-upload: the per-backend LLM timeout is too long for a fallback chain (a hung primary would eat the worker wall clock).'
);

/* ---- Model output shapes must not decide whether an upload succeeds ---- */
check(
  /function parseQuizContent\(content: string\): QuizItem\[\]/.test(edge),
  'process-upload: quiz output is parsed as raw JSON again (fences, preamble or a think block would fail the upload).'
);
check(
  /indexOf\('\['\)/.test(edge) && /lastIndexOf\('\]'\)/.test(edge),
  'process-upload: the quiz parser no longer narrows to the outermost JSON array.'
);
check(
  /Deno\.env\.get\('LLM_VISION_MODEL'\) \?\? Deno\.env\.get\('LLM_FALLBACK_MODEL'\)/.test(edge),
  'process-upload: photo OCR must keep its own model knob, defaulting to the fallback backend.'
);

/* ---- The plan read must not double as a schema probe ---- */
check(
  /select\('is_premium,ai_words_used,ai_words_reset_at'\)/.test(edge),
  'process-upload: the plan query includes optional columns; one un-migrated column makes every premium learner look free.'
);
check(
  /if \(ownerError\) throw new Error\(`Could not read your plan/.test(edge),
  'process-upload: a failed profile read no longer fails loudly (it silently becomes "free tier").'
);
check(
  /select\('narrator_voice,upload_output'\)/.test(edge),
  'process-upload: the learner preferences must be read in their own best-effort query, separate from the plan.'
);
const narratorMigration = read('supabase/migrations_narrator_voice.sql');
check(
  /add column if not exists narrator_voice text/.test(narratorMigration),
  'migrations_narrator_voice.sql: narrator_voice must be added idempotently.'
);

/* ---- Every failed write must carry a reason ---- */
check(
  !/update\(\{\s*status:\s*'failed'\s*\}\)/.test(edge),
  'process-upload: something still flips a row to failed without writing an error.'
);
check(
  /status: 'failed', error: reason/.test(edge),
  'process-upload: the catch block no longer persists the failure reason.'
);

/* ---- Client helper: refuse empty bytes, and record invocation failures ---- */
const helperEmpty = uploads.indexOf('data.byteLength === 0');
const storageUpload = uploads.indexOf(".from('user-materials')");
check(
  helperEmpty !== -1 && storageUpload !== -1 && helperEmpty < storageUpload,
  'lib/uploads.ts: empty bytes must be rejected before the Storage upload.'
);
check(
  /came through empty \(0 bytes\)/.test(uploads),
  'lib/uploads.ts: the empty-file message does not explain what to do next.'
);
check(
  !/update\(\{\s*status:\s*'failed'\s*\}\)/.test(uploads),
  'lib/uploads.ts: an invocation failure still marks the row failed with no reason.'
);
check(
  /update\(\{ status: 'failed', error: reason \}\)/.test(uploads),
  'lib/uploads.ts: the invocation failure does not write its reason onto the row.'
);
check(
  /throw new Error\(reason\)/.test(uploads),
  'lib/uploads.ts: the thrown message and the stored reason must be the same text.'
);

/* ---- AI Sandbox: the same guard, before a row is ever created ---- */
const screenEmpty = sandbox.indexOf('bytes.byteLength === 0');
const uploadCall = sandbox.indexOf('uploadRawFile(bytes');
check(
  screenEmpty !== -1 && uploadCall !== -1 && screenEmpty < uploadCall,
  'AI Sandbox: a 0-byte read must be reported before calling uploadRawFile.'
);
check(
  sandbox.includes('came through empty (0 bytes)'),
  'AI Sandbox: the empty-file message is missing.'
);

/* ---- Uploads narrate the whole text, and nodes are the learner's choice ---- */
const uploadOutputMigration = read('supabase/migrations_upload_output.sql');
check(
  /add column if not exists upload_output text not null default 'both'/.test(uploadOutputMigration),
  'migrations_upload_output.sql: the learner preference column is missing.'
);
check(
  /check \(upload_output in \('both', 'nodes', 'audiobook'\)\)/.test(uploadOutputMigration),
  'migrations_upload_output.sql: upload_output has no allowed-value constraint.'
);
check(
  /select\('narrator_voice,upload_output'\)/.test(edge),
  'process-upload: the learner preference is not read server-side.'
);
check(
  // Curation is gated on `wantsNodes`; the call now sits inside that branch so a
  // failed quiz can be tolerated for notes without skipping the gate itself.
  /if \(wantsNodes\) \{[\s\S]{0,240}quiz = await generateQuizQuestions\(text\)/.test(edge),
  'process-upload: quiz nodes are still generated for an audiobook-only learner.'
);
check(
  !/quiz\.map\(\(q\) => q\.prompt\)\.join/.test(edge),
  'process-upload: the narration is still only the quiz prompts, not the upload.'
);
check(
  /const parts = narrationParts\(text\)/.test(edge),
  'process-upload: the full text is not split into narration parts.'
);
check(
  /audio_chunks: audioChunks/.test(edge) && /part-\$\{String\(index\)/.test(edge),
  'process-upload: ordered narration parts are not stored on the lesson.'
);
check(
  /if \(!isPremium \|\| !wantsNarration\) return earlyResult;/.test(edge),
  'process-upload: a nodes-only learner would still be billed for narration.'
);
check(
  /audiobook_only: !wantsNodes/.test(edge),
  'process-upload: an audiobook-only upload is not marked as audio-only.'
);
check(
  /const outputMode = !isPremium\s*\?\s*'nodes'/.test(edge),
  'process-upload: a free learner could pick audiobook-only and receive nothing (no narration, no nodes).'
);

const audiobookModel = read('lib/audiobook.ts');
check(
  /export interface AudioChapter/.test(audiobookModel) && /chapters: AudioChapter\[\]/.test(audiobookModel),
  'lib/audiobook.ts: the complete narration is not exposed as ordered chapters.'
);
const player = read('components/AudiobookPlayer.tsx');
check(
  /\.sort\(\(a, b\) => a\.index - b\.index\)[\s\S]{0,400}ordered\.map/.test(player) &&
    /ordered\.length > 0[\s\S]{0,600}segments\.length > 0/.test(player),
  'AudiobookPlayer: chapters are not played in order before segments.'
);
const settings = read('src/app/settings.tsx');
check(
  /setUploadOutput\(profile\.id, output\)/.test(settings) && /UPLOAD_OUTPUT_OPTIONS\.map/.test(settings),
  'Settings: the upload-output preference cannot be changed.'
);
check(
  /l\.audiobook_only !== 'true'/.test(sandbox),
  'Path list: audiobook-only uploads still appear as revision nodes.'
);
check(
  /setUserAudiobooks\(rows\.filter\(\(l\) => l\.audiobook_only === 'true'\)\)/.test(sandbox) &&
    /userAudiobooks\.map/.test(sandbox),
  'Path list: an audiobook-only upload has no door — the learner can never press play on it.'
);
check(
  /export async function loadLessonAudiobook\(lessonId: number\)/.test(audiobookModel),
  'lib/audiobook.ts: one upload\u2019s book cannot be loaded on its own.'
);

/* ---- An existing upload converts to one audiobook, nodes deleted ---- */
const convertMigration = read('supabase/migrations_audiobook_only_convert.sql');
check(
  /create policy "Users convert own generated lessons"/.test(convertMigration) &&
    /for update/.test(convertMigration) &&
    /is_user_generated = true/.test(convertMigration),
  'migrations_audiobook_only_convert.sql: owners cannot flag their own generated lessons.'
);
const uploadsConvert = read('src/app/uploads.tsx');
check(
  /convertToAudiobookOnly/.test(uploadsConvert) &&
    /from\('questions'\)\.delete\(\)\.eq\('lesson_id'/.test(uploadsConvert),
  'My uploads: converting to audiobook-only does not delete the quiz nodes.'
);
check(
  /audiobook_only: true, segments: \[\]/.test(uploadsConvert),
  'My uploads: conversion does not flag the lesson audio-only and drop the per-question clips.'
);
check(
  /hasFull[\s\S]{0,200}audio_chunks/.test(uploadsConvert),
  'My uploads: conversion could strand a lesson with no full narration and no nodes.'
);

/* ---- Scan opens a camera in the browser, not a file dialog ---- */
const webCamera = read('components/WebCameraCapture.tsx');
check(
  /navigator\.mediaDevices[\s\S]{0,60}getUserMedia\(/.test(webCamera),
  'WebCameraCapture: the browser camera must come from getUserMedia, not a file input.'
);
check(
  /toDataURL\('image\/jpeg'/.test(webCamera),
  'WebCameraCapture: the captured frame is not encoded as a JPEG data URL.'
);
check(
  /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/.test(webCamera),
  'WebCameraCapture: the camera stream is never released (the light would stay on).'
);
check(
  /source === 'camera' && Platform\.OS === 'web'/.test(sandbox),
  'AI Sandbox: the web Scan button still routes through the image-picker file dialog.'
);
check(
  /<WebCameraCapture/.test(sandbox) && /onCaptured=\{\(dataUrl\) => \{/.test(sandbox),
  'AI Sandbox: the web camera modal is not wired to the picked file.'
);

/* ---- Retry: shows the new attempt, and keeps a reason if it never lands ---- */
check(
  /update\(\{ status: 'processing', error: null \}\)/.test(uploadsScreen),
  'uploads screen: retry does not clear the old reason / show the new attempt.'
);
check(
  /status: 'failed', error: `Retry could not reach/.test(uploadsScreen),
  'uploads screen: a retry that cannot reach the pipeline records no reason.'
);
check(
  /refresh\(\);\s*\} finally \{/.test(uploadsScreen),
  'uploads screen: the list must refresh after a failed retry so the row shows its new state.'
);

/* ---- Delete: a confirm the browser honours, on every row ---- */
check(
  /Platform\.OS === 'web'[\s\S]{0,160}window\.confirm\(/.test(uploadsScreen),
  'uploads screen: the delete confirm relies on Alert.alert, whose buttons react-native-web ignores — the trash button does nothing in a browser.'
);
check(
  !/Alert\.alert\(\s*[`']Delete upload\?/.test(uploadsScreen),
  'uploads screen: deleting still opens a native-only Alert, so web clicks are dead ends.'
);
check(
  (uploadsScreen.match(/<DeleteButton/g) ?? []).length === 1,
  'uploads screen: the delete control is duplicated per status; one control must cover ready, failed and processing rows.'
);
check(
  /await supabase\.from\('user_uploads'\)\.delete\(\)\.eq\('id', u\.id\)/.test(uploadsScreen),
  'uploads screen: delete never removes the upload row it was pressed on.'
);

/* ---- Delete is undoable: hide first, destroy later ---- */
const undoMs = Number((uploadsScreen.match(/const UNDO_MS = (\d+);/) ?? [])[1]);
check(
  Number.isFinite(undoMs) && undoMs >= 4000 && undoMs <= 15000,
  'uploads screen: the undo window is missing or too short to reach the UNDO button.'
);
check(
  /setTimeout\([\s\S]{0,200}UNDO_MS\)/.test(uploadsScreen),
  'uploads screen: the delete runs before the undo window closes.'
);
check(
  /const undoDelete = \(\) => \{[\s\S]{0,200}clearTimeout\(p\.timer\)/.test(uploadsScreen),
  'uploads screen: UNDO cannot cancel the pending delete.'
);
check(
  /setUploads\(\(prev\) =>\s*\[\.\.\.prev, p\.upload\]/.test(uploadsScreen),
  'uploads screen: UNDO does not put the removed row back in the list.'
);
check(
  /const rows = \(data as Upload\[\] \| null\) \?\? \[\];[\s\S]{0,260}pendingId/.test(uploadsScreen),
  'uploads screen: a focus refresh resurrects the row that is still inside the undo window.'
);
check(
  /useEffect\(\(\) => \{\s*return \(\) => \{[\s\S]{0,260}commitRef\.current\(p\.upload, p\.userId\)/.test(
    uploadsScreen
  ),
  'uploads screen: leaving the screen drops a pending delete, so the row returns and the learner deletes it twice.'
);
check(
  !/confirmThen\(\s*'Delete upload\?'/.test(uploadsScreen),
  'uploads screen: the undoable delete still opens a blocking confirm first, so UNDO is unreachable.'
);

if (failures.length > 0) {
  console.error('Upload pipeline check failed:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  `Upload pipeline gate OK — 0-byte bodies rejected client and server, PDFs capped at ${
    Number.isFinite(extractChars) && charsPerPage ? Math.ceil(extractChars / charsPerPage) : 60
  } pages, whole-text narration with optional nodes, every failure records a reason.`
);
