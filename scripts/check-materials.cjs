#!/usr/bin/env node
/**
 * Guard material detection + revision packs.
 *
 * The pipeline now spends money differently depending on what a learner
 * uploads: a book is narrated end to end, notes are turned into revision
 * material. Getting the classification wrong therefore wastes either the
 * learner's time or the owner's TTS budget, and a pack that invents facts is
 * worse than no pack at all.
 *
 * Checks:
 *   1. Detection — the real classifier runs on fixtures: a chaptered book, a
 *      page of bullet notes, an article, a transcript, and empty text.
 *   2. Pack — all seven promised techniques are produced, every card/answer is
 *      quoted from the source, and chunk sizes stay 4–5 items.
 *   3. Coverage — narration of a long book keeps the whole text in order, and
 *      the pipeline no longer caps a book at 60k characters.
 *   4. Wiring — the Edge Function stores the verdict, builds the pack for
 *      revision material only, and the app exposes the screen.
 */

'use strict';

/* global __dirname, console, process -- Node provides these to CommonJS scripts. */

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const KIND = path.join(ROOT, 'supabase', 'functions', '_shared', 'materialKind.ts');
const PACK = path.join(ROOT, 'supabase', 'functions', '_shared', 'revisionPack.ts');
const PIPELINE = path.join(ROOT, 'supabase', 'functions', 'process-upload', 'index.ts');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations_materials.sql');
const CLIENT = path.join(ROOT, 'lib', 'revisionPack.ts');
const SCREEN = path.join(ROOT, 'src', 'app', 'revision', '[uploadId].tsx');
const UPLOADS = path.join(ROOT, 'src', 'app', 'uploads.tsx');
const LAYOUT = path.join(ROOT, 'src', 'app', '_layout.tsx');
const DOCS = path.join(ROOT, 'docs', 'materials.md');
const GATES = path.join(ROOT, 'content', 'quality', 'gates.json');
const PACKAGE = path.join(ROOT, 'package.json');

let failures = 0;
const queue = [];

function check(name, fn) {
  queue.push({ name, fn });
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/** Transpile a shared module (with its relative .ts imports resolved in-memory). */
function loadTs(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const { outputText, diagnostics } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
    reportDiagnostics: true,
  });
  if (diagnostics && diagnostics.length) {
    throw new Error(
      `${path.relative(ROOT, file)} has syntax errors:\n${diagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n')}`
    );
  }
  const module = { exports: {} };
  cache.set(file, module);
  const requireStub = (specifier) => {
    if (!specifier.startsWith('.')) throw new Error(`unexpected import in ${path.relative(ROOT, file)}: ${specifier}`);
    return loadTs(path.resolve(path.dirname(file), specifier), cache);
  };
  new Function('exports', 'require', 'module', outputText)(module.exports, requireStub, module);
  return module.exports;
}

const kinds = loadTs(KIND);
const packs = loadTs(PACK);

// --- fixtures -------------------------------------------------------------

const CHAPTERS = [
  'The Water Cycle',
  'Evaporation happens when the sun heats the surface of a lake or sea and water turns into vapour. Warm air carries that vapour upward until it cools again.',
  'Condensation happens when the vapour meets cold air and forms tiny droplets. Those droplets gather around dust particles and become visible as cloud.',
  'Precipitation happens when droplets grow heavy enough to fall. Rain, snow and hail are all precipitation and they return water to the ground.',
  'Collection happens when water gathers in rivers, lakes and underground stores. From there the cycle starts again with evaporation.',
  'Human Impact',
  'Drainage and paving reduce infiltration, so more water runs off the surface instead of refilling underground stores. Cities then flood faster after heavy rain.',
  'Irrigation removes water from rivers for farming. When more is taken than the river can replace, downstream wetlands dry out and wildlife loses habitat.',
  'Climate change warms the air, so it holds more vapour. Storms become heavier and dry spells last longer, which makes both floods and droughts worse.',
];

function bookFixture() {
  const parts = ['A Short Book About Water', ''];
  for (const heading of ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6', 'Chapter 7']) {
    parts.push(heading, '');
    // Long-form prose: several paragraphs of full sentences per chapter.
    for (let i = 0; i < 12; i += 1) {
      parts.push(CHAPTERS.join(' '));
      parts.push('');
    }
  }
  return parts.join('\n');
}

function notesFixture() {
  return [
    'Biology revision notes — cells',
    '',
    'Cell membrane',
    '- controls what enters and leaves the cell',
    '- is made of a phospholipid bilayer',
    '- contains transport proteins for larger molecules',
    '',
    'Mitochondria',
    '- release energy from glucose through respiration',
    '- have their own DNA',
    '',
    'Nucleus',
    '- stores the genetic material',
    '- controls protein synthesis',
    '',
    'Ribosomes',
    '- assemble amino acids into proteins',
    '- are found free in the cytoplasm or on the rough ER',
    '',
    'Exam tip',
    '- describe structure before function',
  ].join('\n');
}

function transcriptFixture() {
  return [
    'Teacher: Today we are covering the causes of the First World War.',
    'Student: Was the alliance system the main cause?',
    'Teacher: It made a local dispute spread, yes, but militarism and nationalism mattered too.',
    'Student: So the assassination was only the trigger?',
    'Teacher: Exactly. The trigger started it, the deeper causes made it possible.',
    'Student: What should we revise first?',
    'Teacher: Start with the alliance map, then the arms race, then the Balkans.',
    'Student: And the treaty at the end?',
  ].join('\n');
}

const book = bookFixture();
const notes = notesFixture();
const transcript = transcriptFixture();
const article = 'The library opened in 1902 with three thousand books. ' + 'Readers queued around the block on the first morning. '.repeat(30);

// --- 1. Detection ---------------------------------------------------------

check('A chaptered long-form upload is detected as a book', () => {
  const result = kinds.classifyMaterial({ text: book, fileName: 'water-book.pdf' });
  assert(result.kind === 'book', `expected book, got ${result.kind}`);
  assert(result.fullBook === true, 'a book must be marked full-length');
  assert(result.primaryOutput === 'audiobook', 'a book produces an audiobook');
  assert(result.chapters.length >= 3, `expected chapters, got ${result.chapters.length}`);
  assert(result.confidence >= 0.6, 'book detection must be confident, not a guess');
  assert(result.signals.some((s) => /words/.test(s)), 'the verdict must carry its evidence');
});

check('Bullet-heavy study notes are detected as notes', () => {
  const result = kinds.classifyMaterial({ text: notes, fileName: 'bio-notes.txt' });
  assert(result.kind === 'notes', `expected notes, got ${result.kind}`);
  assert(result.primaryOutput === 'revision', 'notes produce revision material');
  assert(result.fullBook === false, 'notes are never a full book');
});

check('A speaker transcript is detected as a transcript', () => {
  const result = kinds.classifyMaterial({ text: transcript, fileName: 'class.txt' });
  assert(result.kind === 'transcript', `expected transcript, got ${result.kind}`);
  assert(result.primaryOutput === 'revision', 'a transcript produces revision material');
});

check('Continuous short prose is an article, and empty text is unknown', () => {
  const result = kinds.classifyMaterial({ text: article, fileName: 'library.txt' });
  assert(result.kind === 'article' || result.kind === 'notes', `expected article, got ${result.kind}`);
  const empty = kinds.classifyMaterial({ text: '   ', fileName: 'blank.txt' });
  assert(empty.kind === 'unknown', 'empty text must be unknown, not a guess');
  assert(empty.chapters.length === 0, 'empty text has no chapters');
});

check('Chapters always cover the whole document', () => {
  const result = kinds.classifyMaterial({ text: book, fileName: 'water.pdf' });
  assert(result.chapters.length > 1, 'expected several chapters');
  assert(result.chapters[0].start === 0, 'chapters must start at the first character');
  assert(result.chapters[result.chapters.length - 1].end === book.length, 'chapters must reach the last character');
  for (let i = 1; i < result.chapters.length; i += 1) {
    assert(result.chapters[i].start >= result.chapters[i - 1].end, 'chapters must not overlap');
  }
});

check('A bullet is never mistaken for a heading', () => {
  const result = kinds.classifyMaterial({ text: notes, fileName: 'bio-notes.txt' });
  for (const chapter of result.chapters) {
    assert(!/^[-*•‣◦–]/.test(chapter.title), `bullet treated as a heading: ${chapter.title}`);
  }
  assert(result.chapters.length >= 3, 'real note headings must still be found');
  const card = pack.flashcards.find((c) => /cell membrane/i.test(c.front));
  assert(card, 'the “Cell membrane” heading must become a card front');
  assert(!/^[-*•]/.test(card.front), 'a card front must not be a raw bullet');
});

// --- 2. Revision pack -----------------------------------------------------

const notesAnalysis = kinds.classifyMaterial({ text: notes, fileName: 'bio-notes.txt' });
const pack = packs.buildRevisionPack({ text: notes, analysis: notesAnalysis, title: 'Biology notes' });

check('The pack fills all seven memorization techniques', () => {
  assert(pack.flashcards.length > 0, 'flashcards missing (technique 3)');
  assert(pack.recall.length > 0, 'active recall missing (technique 1)');
  assert(pack.reviewPlan.length >= 3, 'spaced repetition plan missing (technique 2)');
  assert(pack.chunks.length > 0, 'chunking missing (technique 4)');
  assert(pack.mindMap.branches.length > 0, 'mind map missing (technique 5)');
  assert(pack.palace.stops.length > 0, 'memory palace missing (technique 6)');
  assert(pack.teachBack.length > 0, 'teach-it missing (technique 7)');
  assert(pack.srsSeeds.length > 0, 'spaced-repetition seeds missing');
});

check('Chunks stay small enough to be chunks (4–5 items)', () => {
  for (const chunk of pack.chunks) {
    assert(chunk.items.length <= 5, `chunk "${chunk.title}" has ${chunk.items.length} items`);
    assert(chunk.items.length >= 1, 'a chunk cannot be empty');
  }
});

check('Every card and answer is quoted from the learner’s text', () => {
  const haystack = notes.replace(/\s+/g, ' ');
  for (const card of pack.flashcards) {
    assert(haystack.includes(card.source.replace(/\s+/g, ' ')), `flashcard source not in text: ${card.source.slice(0, 60)}`);
    assert(card.front.length > 0 && card.back.length > 0, 'cards need both sides');
  }
  for (const item of pack.recall) {
    assert(item.prompt.length > 10, 'a recall prompt must be a real question');
    assert(item.answer.length > 0, 'a recall prompt must carry its answer');
  }
});

check('The deterministic pack is honest about being extractive', () => {
  assert(pack.generated === false, 'the offline builder must not claim a model wrote it');
  assert(/never generated from outside it/i.test(pack.summary), 'the summary must state the sourcing rule');
  assert(packs.validateRevisionPack(pack), 'a built pack must pass its own validator');
});

check('A malformed model answer is rejected', () => {
  assert(!packs.validateRevisionPack(null), 'null must fail');
  assert(!packs.validateRevisionPack({ version: 2 }), 'wrong version must fail');
  assert(
    !packs.validateRevisionPack({ version: 1, flashcards: [], recall: [], chunks: [], teachBack: [], reviewPlan: [], srsSeeds: [], mindMap: { branches: [] }, palace: { stops: [] }, summary: 'too short' }),
    'an empty pack must fail'
  );
});

check('The model prompt demands JSON and forbids invented facts', () => {
  const prompt = packs.revisionPackPrompt(notes, notesAnalysis);
  assert(prompt.includes('"flashcards"') && prompt.includes('"palace"'), 'the prompt must describe the full shape');
  assert(/Never invent facts/i.test(prompt), 'the prompt must forbid invented facts');
  assert(prompt.includes('day 1/4/7/14/30'), 'the prompt must ask for the spaced intervals');
});

check('A long book also yields a usable pack when asked', () => {
  const bookAnalysis = kinds.classifyMaterial({ text: book, fileName: 'water.pdf' });
  const big = packs.buildRevisionPack({ text: book, analysis: bookAnalysis, title: 'Water' });
  assert(big.flashcards.length > 0, 'a book should still produce cards if a pack is ever requested');
  assert(big.mindMap.branches.length >= 2, 'branches should follow the chapters');
});

// --- 3. Full-book narration coverage --------------------------------------

check('The pipeline narrates the whole book, not the first 60k characters', () => {
  const source = read(PIPELINE);
  assert(/const MAX_EXTRACT_CHARS = 400000/.test(source), 'extraction must be large enough for a real book');
  assert(/MAX_NARRATION_PARTS = Math\.ceil\(MAX_EXTRACT_CHARS \/ 4000\)/.test(source), 'the part ceiling must follow the extract size');
  assert(!/MAX_NARRATION_PARTS = 24/.test(source), 'the old 24-part cap silently truncated books');
  assert(/rawText\.slice\(0, MAX_CURATION_CHARS\)/.test(source), 'the quiz model must still read a bounded slice');
});

check('Narration resumes instead of re-paying for finished parts', () => {
  const source = read(PIPELINE);
  assert(/alreadyNarrated/.test(source), 'existing parts must be detected');
  assert(/storage\.from\('user-materials'\)\.list\(audioDir/.test(source), 'the pipeline must list what already exists');
  assert(/if \(alreadyNarrated\.has\(name\)\)/.test(source), 'finished parts must be skipped');
});

// --- 4. Wiring ------------------------------------------------------------

check('The pipeline stores what it detected, before it spends money', () => {
  const source = read(PIPELINE);
  const detectAt = source.indexOf('classifyMaterial({ text, fileName');
  const quizAt = source.indexOf('await generateQuizQuestions(');
  assert(detectAt > -1, 'the pipeline must classify the upload');
  assert(quizAt > detectAt, 'classification must run before curation');
  assert(/material_kind: analysis\.kind/.test(source), 'the verdict must be persisted on the upload');
  assert(/primary_output: analysis\.primaryOutput/.test(source), 'the lesson must record what it produced');
});

check('Revision packs are built for revision material, not for books', () => {
  const source = read(PIPELINE);
  assert(/analysis\.primaryOutput === 'revision'/.test(source), 'only revision material builds a pack');
  assert(/buildRevisionPack\(\{ text, analysis, title \}\)/.test(source), 'the deterministic builder must run');
  assert(/revisionPackFromModel\(text, analysis, base\)/.test(source), 'premium must try the model');
  assert(/validateRevisionPack\(merged\)/.test(source), 'model output must be validated before it is stored');
});

check('The pack table is per-user with no client writes', () => {
  const sql = read(MIGRATION);
  assert(/create table if not exists public\.revision_packs/.test(sql), 'the table must exist');
  assert(/disable row level security/.test(sql) === false, 'RLS must stay enabled');
  assert(/enable row level security/.test(sql), 'RLS must be enabled');
  assert(/auth\.uid\(\) = user_id/.test(sql), 'reads must be scoped to the owner');
  assert(!/for insert/.test(sql), 'clients must not write packs');
  assert(/add column if not exists material_kind/.test(sql), 'uploads must record the detected kind');
});

check('The app can open a pack and enrol its cards', () => {
  const client = read(CLIENT);
  assert(/loadRevisionPack/.test(client), 'the client must fetch a pack');
  assert(/enrolPackInReview/.test(client), 'the client must enrol cards in the existing SRS');
  assert(/gradeCard\(userId, `\$\{uploadId\}:\$\{seed\.key\}`/.test(client), 'enrolment must use the shared SRS engine');
  const screen = read(SCREEN);
  for (const title of ['Mind map', 'Flashcards', 'Active recall', 'Chunks', 'Memory palace', 'Teach it', 'Spaced plan']) {
    assert(screen.includes(title), `the screen must expose ${title}`);
  }
  assert(read(UPLOADS).includes('/revision/[uploadId]'), 'My uploads must link to the pack');
  assert(read(LAYOUT).includes('revision/[uploadId]'), 'the route must be registered');
});

check('The material is documented and gated', () => {
  assert(fs.existsSync(DOCS), 'docs/materials.md is missing');
  const docs = read(DOCS);
  for (const needle of ['active recall', 'spaced repetition', 'flashcards', 'chunking', 'mind map', 'memory palace', 'teach']) {
    assert(docs.toLowerCase().includes(needle), `docs/materials.md must explain ${needle}`);
  }
  const gates = JSON.parse(read(GATES));
  assert(
    (gates.gates || []).some((g) => g.id === 'materials' && g.required === true),
    'gates.json must require the materials gate'
  );
  const pkg = JSON.parse(read(PACKAGE));
  assert(pkg.scripts['check:materials'] === 'node scripts/check-materials.cjs', 'package.json must expose check:materials');
  assert(String(pkg.scripts.test).includes('check-materials.cjs'), 'npm test must run the materials gate');
});

(async () => {
  for (const { name, fn } of queue) {
    try {
      await fn();
      console.log(`[ok] ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`[FAIL] ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
    }
  }
  if (failures > 0) {
    console.error(`\nMaterial checks failed: ${failures}`);
    process.exit(1);
  }
  console.log('\nMaterial detection + revision pack checks passed.');
})();
